
import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Alert,
} from "@mui/material";

import {
  AccountTreeOutlined,
  AssignmentOutlined,
  PendingActionsOutlined,
  CheckCircleOutlined,
} from "@mui/icons-material";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

interface DashboardStats {
  totalWorkflows: number;
  totalRequests: number;
  pendingApprovals: number;
  approvedRequests: number;
}

interface Workflow {
  _id: string;
}

interface WorkflowRequest {
  _id: string;
  status: string;
}

interface Activity {
  _id: string;
  description: string;
  action: string;
  createdAt: string;
  user?: {
    name: string;
  };
  request?: {
    title: string;
  };
}

interface ListResponse<T> {
  success: boolean;
  count: number;
  data: T[];
}

interface ActivityResponse {
  success: boolean;
  count: number;
  data: Activity[];
}

const initialStats: DashboardStats = {
  totalWorkflows: 0,
  totalRequests: 0,
  pendingApprovals: 0,
  approvedRequests: 0,
};

function OverviewPage() {
  const { user, activeMembership } = useAuth();

  const organizationId = activeMembership?.organization?._id;

  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError("");

      try {
        const baseUrl = `/api/organizations/${organizationId}`;

        const [
          workflowsResponse,
          requestsResponse,
          approvalsResponse,
          activityResponse,
        ] = await Promise.all([
          api.get<ListResponse<Workflow>>(`${baseUrl}/workflows`),
          api.get<ListResponse<WorkflowRequest>>(`${baseUrl}/requests`),
          api.get<ListResponse<WorkflowRequest>>(
            `${baseUrl}/requests/pending-approvals`
          ),
          api.get<ActivityResponse>(`${baseUrl}/activity?limit=5`),
        ]);

        if (cancelled) return;

        const workflows = workflowsResponse.data.data;
        const requests = requestsResponse.data.data;

        setStats({
          totalWorkflows: workflows.length,
          totalRequests: requests.length,
          pendingApprovals: approvalsResponse.data.count,
          approvedRequests: requests.filter(
            (request) => request.status === "APPROVED"
          ).length,
        });

        setActivities(activityResponse.data.data);
      } catch (err) {
        console.error("Dashboard loading error:", err);

        if (!cancelled) {
          setError("Unable to load dashboard data. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const statCards = [
    {
      title: "Total Workflows",
      value: stats.totalWorkflows,
      icon: <AccountTreeOutlined />,
      color: "#4F46E5",
    },
    {
      title: "Total Requests",
      value: stats.totalRequests,
      icon: <AssignmentOutlined />,
      color: "#0891B2",
    },
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: <PendingActionsOutlined />,
      color: "#D97706",
    },
    {
      title: "Approved Requests",
      value: stats.approvedRequests,
      icon: <CheckCircleOutlined />,
      color: "#16A34A",
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#172033" }}>
          Good to see you, {user?.name?.split(" ")[0]}!
        </Typography>

        <Typography sx={{ color: "text.secondary", mt: 1 }}>
          Here's what's happening in your workspace today.
        </Typography>

        <Typography sx={{ color: "text.secondary", fontSize: 13, mt: 1 }}>
          {activeMembership?.organization?.name || "My Workspace"}
          {" · "}
          {activeMembership?.role || "MEMBER"}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {statCards.map((stat) => (
          <Grid key={stat.title} size={{ xs: 12, sm: 6, xl: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: "1px solid #E8ECF3",
                borderRadius: 3,
                height: "100%",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                  {stat.title}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: `${stat.color}15`,
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </Box>
              </Box>

              {loading ? (
                <CircularProgress size={25} />
              ) : (
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {stat.value}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              minHeight: 280,
              border: "1px solid #E8ECF3",
              borderRadius: 3,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Recent Activity
            </Typography>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                <CircularProgress />
              </Box>
            ) : activities.length === 0 ? (
              <Typography sx={{ color: "text.secondary", mt: 3 }}>
                No activity available yet.
              </Typography>
            ) : (
              <Box sx={{ mt: 2 }}>
                {activities.map((activity) => (
                  <Box
                    key={activity._id}
                    sx={{
                      py: 2,
                      borderBottom: "1px solid #E8ECF3",
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                      {activity.description}
                    </Typography>

                    <Typography
                      sx={{ color: "text.secondary", fontSize: 12, mt: 0.5 }}
                    >
                      {activity.user?.name || "A user"} ·{" "}
                      {new Date(activity.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              minHeight: 280,
              border: "1px solid #E8ECF3",
              borderRadius: 3,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Workspace Information
            </Typography>

            <Typography sx={{ color: "text.secondary", fontSize: 14, mt: 2 }}>
              Organization
            </Typography>

            <Typography sx={{ fontWeight: 600 }}>
              {activeMembership?.organization?.name || "My Workspace"}
            </Typography>

            <Typography sx={{ color: "text.secondary", fontSize: 14, mt: 2 }}>
              Your Role
            </Typography>

            <Typography sx={{ fontWeight: 600 }}>
              {activeMembership?.role || "MEMBER"}
            </Typography>

            <Typography sx={{ color: "text.secondary", fontSize: 14, mt: 2 }}>
              Logged in as
            </Typography>

            <Typography sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
              {user?.email}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default OverviewPage;
