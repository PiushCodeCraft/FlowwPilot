
import "dotenv/config";

import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes";
import organizationRoutes from "./routes/organization.routes";
import workflowRoutes from "./routes/workflow.routes";
import workflowRequestRoutes from "./routes/workflowRequest.routes";
import approvalRoutes from "./routes/approval.routes";
import activityRoutes from "./routes/activity.routes";

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "FlowPilot API is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Default route
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Welcome to FlowPilot API",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);

app.use(
  "/api/organizations/:organizationId/workflows",
  workflowRoutes
);

app.use(
  "/api/organizations/:organizationId/requests",
  workflowRequestRoutes
);

app.use(
  "/api/organizations/:organizationId/approvals",
  approvalRoutes
);

app.use(
  "/api/organizations/:organizationId/activity",
  activityRoutes
);

// 404 handler - MUST BE LAST
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;
