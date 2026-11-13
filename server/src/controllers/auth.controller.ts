
import { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../models/User";
import Organization from "../models/Organization";
import OrganizationMember from "../models/OrganizationMember";
import { AuthRequest } from "../middleware/auth.middleware";
import { registerSchema, loginSchema } from "../validators/auth.validator";

const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is missing");
  }

  return jwt.sign({ userId }, secret, { expiresIn: "1d" });
};

const setTokenCookie = (res: Response, token: string): void => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });
};

// REGISTER
export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid registration details",
        errors: validation.error.flatten(),
      });
      return;
    }

    const { name, email, password, organizationName } = validation.data;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const session = await mongoose.startSession();

    let createdUser: InstanceType<typeof User> | null = null;
    let createdOrganization: InstanceType<typeof Organization> | null = null;

    try {
      await session.withTransaction(async () => {
        const [user] = await User.create(
          [
            {
              name,
              email,
              password: hashedPassword,
              systemRole: "USER",
            },
          ],
          { session }
        );

        const orgName = organizationName || `${name}'s Workspace`;

        const slugBase = orgName
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const slug = `${slugBase}-${new mongoose.Types.ObjectId()
          .toString()
          .slice(-6)}`;

        const [organization] = await Organization.create(
          [
            {
              name: orgName,
              slug,
              owner: user._id,
            },
          ],
          { session }
        );

        await OrganizationMember.create(
          [
            {
              user: user._id,
              organization: organization._id,
              role: "OWNER",
              status: "ACTIVE",
            },
          ],
          { session }
        );

        createdUser = user;
        createdOrganization = organization;
      });
    } finally {
      await session.endSession();
    }

    if (!createdUser || !createdOrganization) {
      throw new Error("Registration transaction failed");
    }

    const token = generateToken(createdUser.id);
    setTokenCookie(res, token);

    res.status(201).json({
      success: true,
      message: "Account and organization created successfully",
      data: {
        user: {
          id: createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
          systemRole: createdUser.systemRole,
        },
        organization: {
          id: createdOrganization.id,
          name: createdOrganization.name,
          slug: createdOrganization.slug,
        },
        membership: {
          role: "OWNER",
        },
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (
      error instanceof mongoose.Error &&
      error.name === "MongoServerError" &&
      (error as mongoose.mongo.MongoServerError).code === 11000
    ) {
      res.status(409).json({
        success: false,
        message: "Email or organization already exists",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

// LOGIN
export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid login details",
        errors: validation.error.flatten(),
      });
      return;
    }

    const { email, password } = validation.data;

    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    const token = generateToken(user.id);
    setTokenCookie(res, token);

    const memberships = await OrganizationMember.find({
      user: user._id,
      status: "ACTIVE",
    }).populate("organization", "name slug status");

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          systemRole: user.systemRole,
        },
        memberships,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// LOGOUT
export const logout = async (
  _req: Request,
  res: Response
): Promise<void> => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

// GET CURRENT USER
export const getCurrentUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.userId);

    if (!user || !user.isActive) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const memberships = await OrganizationMember.find({
      user: user._id,
      status: "ACTIVE",
    }).populate("organization", "name slug status");

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          systemRole: user.systemRole,
        },
        memberships,
      },
    });
  } catch (error) {
    console.error("Current user error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch current user",
    });
  }
};
