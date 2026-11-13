
import {
  Box,
  Paper,
  Typography,
} from "@mui/material";

import Grid from "@mui/material/Grid";

import {
  AccountTreeOutlined,
  AssignmentOutlined,
  PendingActionsOutlined,
  CheckCircleOutlined,
} from "@mui/icons-material";

import { useAuth } from "../../context/AuthContext";

const stats = [
  {
    title: "Total Workflows",
    value: "—",
    icon: <AccountTreeOutlined />,
    color: "#4F46E5",
  },
  {
    title: "Total Requests",
    value: "—",
    icon: <AssignmentOutlined />,
    color: "#0891B2",
  },
  {
    title: "Pending Approvals",
    value: "—",
    icon: <PendingActionsOutlined />,
    color: "#D97706",
  },
  {
    title: "Approved Requests",
    value: "—",
    icon: <CheckCircleOutlined />,
    color: "#16A34A",
  },
];

function OverviewPage() {
  const { user, activeMembership } = useAuth();

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, color: "#172033" }}
        >
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

      <Grid container spacing={3}>
        {stats.map((stat) => (
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

              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {stat.value}
              </Typography>
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

            <Typography sx={{ color: "text.secondary", fontSize: 14, mt: 1 }}>
              Your latest workflow and request activities will appear here.
            </Typography>
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
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default OverviewPage;
