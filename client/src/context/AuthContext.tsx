
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api from "../services/api";

export interface User {
  id: string;
  name: string;
  email: string;
  systemRole: "ADMIN" | "USER";
}

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface Membership {
  _id: string;
  user: string;
  organization: Organization;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "ACTIVE" | "INVITED" | "INACTIVE";
}

interface AuthContextType {
  user: User | null;
  memberships: Membership[];
  activeMembership: Membership | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  organizationName?: string;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    user: User;
    memberships?: Membership[];
  };
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<AuthResponse>("/api/auth/me");

      setUser(response.data.data.user);
      setMemberships(response.data.data.memberships ?? []);
    } catch {
      setUser(null);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await api.post<AuthResponse>("/api/auth/login", {
      email,
      password,
    });

    setUser(response.data.data.user);
    setMemberships(response.data.data.memberships ?? []);
  };

  const register = async (data: RegisterData) => {
    const response = await api.post<AuthResponse>(
      "/api/auth/register",
      data
    );

    setUser(response.data.data.user);

    // Registration returns one organization and membership role,
    // not the complete memberships array. Refresh /me after registration.
    await refreshUser();
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setUser(null);
      setMemberships([]);
    }
  };

  const activeMembership = memberships[0] ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        memberships,
        activeMembership,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
