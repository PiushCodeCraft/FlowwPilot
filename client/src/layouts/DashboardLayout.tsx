
import { useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import {
  Menu as MenuIcon,
  DashboardOutlined,
  AccountTreeOutlined,
  AssignmentOutlined,
  PendingActionsOutlined,
  HistoryOutlined,
  SettingsOutlined,
  LogoutOutlined,
} from "@mui/icons-material";

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const drawerWidth = 250;

const navigation = [
  { label: "Overview", path: "/dashboard", icon: <DashboardOutlined /> },
  { label: "Workflows", path: "/dashboard/workflows", icon: <AccountTreeOutlined /> },
  { label: "My Requests", path: "/dashboard/requests", icon: <AssignmentOutlined /> },
  { label: "Pending Approvals", path: "/dashboard/approvals", icon: <PendingActionsOutlined /> },
  { label: "Activity", path: "/dashboard/activity", icon: <HistoryOutlined /> },
];

function DashboardLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();

  const { user, activeMembership, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);

  const organizationName =
    activeMembership?.organization?.name || "My Workspace";

  const role = activeMembership?.role || "MEMBER";

  const handleLogout = async () => {
    setProfileAnchor(null);

    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const sidebar = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 3 }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 800, color: "#4F46E5" }}
        >
          FlowPilot
        </Typography>

        <Typography variant="caption" color="text.secondary">
          Workflow Management
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ px: 1 }}
        >
          WORKSPACE
        </Typography>

        <List sx={{ mt: 1 }}>
          {navigation.map((item) => (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              end={item.path === "/dashboard"}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: "#64748B",
                "&.active": {
                  bgcolor: "#EEF2FF",
                  color: "#4F46E5",
                  "& .MuiListItemIcon-root": {
                    color: "#4F46E5",
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
                {item.icon}
              </ListItemIcon>

              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    sx: {
                      fontSize: 14,
                      fontWeight: 600,
                    },
                  },
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Box sx={{ mt: "auto" }}>
        <Divider />

        <Box sx={{ p: 2 }}>
          <ListItemButton
            sx={{ borderRadius: 2 }}
            onClick={() => navigate("/dashboard/settings")}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SettingsOutlined />
            </ListItemIcon>

            <ListItemText primary="Settings" />
          </ListItemButton>

          <Box sx={{ mt: 2, p: 1.5, bgcolor: "#F8FAFC", borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
              {organizationName}
            </Typography>

            <Typography sx={{ color: "text.secondary", fontSize: 11 }}>
              {role}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#F8FAFC" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: "#FFFFFF",
          color: "#172033",
          borderBottom: "1px solid #E8ECF3",
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
              {organizationName}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Workspace
            </Typography>
          </Box>

          <IconButton
            onClick={(event) => setProfileAnchor(event.currentTarget)}
          >
            <Avatar sx={{ width: 34, height: 34, bgcolor: "#4F46E5" }}>
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={() => setProfileAnchor(null)}
          >
            <MenuItem disabled>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                  {user?.name}
                </Typography>

                <Typography sx={{ color: "text.secondary", fontSize: 12 }}>
                  {user?.email}
                </Typography>
              </Box>
            </MenuItem>

            <Divider />

            <MenuItem onClick={handleLogout}>
              <LogoutOutlined fontSize="small" sx={{ mr: 1 }} />
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          {sidebar}
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "1px solid #E8ECF3",
            },
          }}
        >
          {sidebar}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 2, md: 4 },
          mt: "64px",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default DashboardLayout;
