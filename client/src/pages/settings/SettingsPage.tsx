
import { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";

import {
  BusinessOutlined,
  PeopleOutlined,
  PersonOutlined,
  AddOutlined,
  RefreshOutlined,
  MailOutlined,
  CalendarTodayOutlined,
  ShieldOutlined,
} from "@mui/icons-material";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

// -------------------- TYPES --------------------

interface Organization {
  _id: string;
  name: string;
  slug: string;
  status: string;
  owner: string;
  createdAt: string;
}

interface OrganizationDetailsResponse {
  success: boolean;
  data: {
    organization: Organization;
    role: string;
  };
}

interface MemberUser {
  _id: string;
  name: string;
  email: string;
  systemRole: string;
}

interface OrganizationMember {
  _id: string;
  user: MemberUser;
  role: string;
  status: string;
  createdAt: string;
}

interface MembersResponse {
  success: boolean;
  count: number;
  data: OrganizationMember[];
}

interface AddMemberResponse {
  success: boolean;
  message: string;
}

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

// -------------------- HELPERS --------------------

function formatDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

// -------------------- COMPONENT --------------------

function SettingsPage() {
  const { user, activeMembership } = useAuth();

  const organizationId = activeMembership?.organization?._id;
  const currentRole = activeMembership?.role || "";

  const [tab, setTab] = useState(0);

  const [organization, setOrganization] =
    useState<Organization | null>(null);

  const [members, setMembers] = useState<OrganizationMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add member dialog
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [memberRole, setMemberRole] = useState("MEMBER");
  const [addingMember, setAddingMember] = useState(false);

  // -------------------- FETCH SETTINGS DATA --------------------

  const fetchSettings = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      setError("No active organization selected.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [organizationResponse, membersResponse] =
        await Promise.all([
          api.get<OrganizationDetailsResponse>(
            `/api/organizations/${organizationId}`
          ),
          api.get<MembersResponse>(
            `/api/organizations/${organizationId}/members`
          ),
        ]);

      setOrganization(
        organizationResponse.data.data.organization
      );

      setMembers(membersResponse.data.data || []);
    } catch (err: unknown) {
      console.error("Settings fetch error:", err);
      setError("Unable to load organization settings.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  // -------------------- ADD MEMBER --------------------

  const handleAddMember = async () => {
    if (!organizationId) return;

    if (!email.trim()) {
      setError("Please enter the member's email address.");
      return;
    }

    try {
      setAddingMember(true);
      setError("");
      setSuccess("");

      const response = await api.post<AddMemberResponse>(
        `/api/organizations/${organizationId}/members`,
        {
          email: email.trim(),
          role: memberRole,
        }
      );

      setSuccess(
        response.data.message || "Member added successfully."
      );

      setEmail("");
      setMemberRole("MEMBER");
      setOpenAddDialog(false);

      await fetchSettings();
    } catch (err: unknown) {
      console.error("Add member error:", err);

      const message =
        (err as {
          response?: {
            data?: {
              message?: string;
            };
          };
        }).response?.data?.message;

      setError(message || "Unable to add member.");
    } finally {
      setAddingMember(false);
    }
  };

  // -------------------- LOADING --------------------

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          py: 10,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // -------------------- RENDER --------------------

  return (
    <Box sx={{ width: "100%", pb: 4 }}>
      {/* HEADER */}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: {
            xs: "flex-start",
            sm: "center",
          },
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700 }}
          >
            Settings
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Manage your workspace and account information.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshOutlined />}
          onClick={() => void fetchSettings()}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          Refresh
        </Button>
      </Stack>

      {/* ALERTS */}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess("")}
        >
          {success}
        </Alert>
      )}

      {/* TABS */}

      <Paper
        elevation={0}
        sx={{
          border: "1px solid #E5E7EB",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Tabs
          value={tab}
          onChange={(_event, value: number) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <Tab
            icon={<BusinessOutlined />}
            iconPosition="start"
            label="General"
            sx={{ textTransform: "none" }}
          />

          <Tab
            icon={<PeopleOutlined />}
            iconPosition="start"
            label="Members"
            sx={{ textTransform: "none" }}
          />

          <Tab
            icon={<PersonOutlined />}
            iconPosition="start"
            label="My Profile"
            sx={{ textTransform: "none" }}
          />
        </Tabs>

        {/* GENERAL SETTINGS */}

        <TabPanel value={tab} index={0}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, mb: 0.5 }}
            >
              Organization Information
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Information about your current workspace.
            </Typography>

            {organization && (
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2.5, borderRadius: 2 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Organization Name
                    </Typography>

                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, mt: 0.5 }}
                    >
                      {organization.name}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2.5, borderRadius: 2 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Organization Status
                    </Typography>

                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={organization.status}
                        color={
                          organization.status === "ACTIVE"
                            ? "success"
                            : "default"
                        }
                        size="small"
                      />
                    </Box>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2.5, borderRadius: 2 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Workspace Slug
                    </Typography>

                    <Typography sx={{ mt: 0.5, fontWeight: 500 }}>
                      {organization.slug}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2.5, borderRadius: 2 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Your Organization Role
                    </Typography>

                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={currentRole}
                        color="primary"
                        size="small"
                      />
                    </Box>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2.5, borderRadius: 2 }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: "center" }}
                    >
                      <CalendarTodayOutlined color="action" />

                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Workspace Created
                        </Typography>

                        <Typography sx={{ fontWeight: 500 }}>
                          {formatDate(organization.createdAt)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            )}

            <Alert severity="info" sx={{ mt: 3 }}>
              Organization editing is not currently available.
              Your workspace information is displayed in read-only mode.
            </Alert>
          </Box>
        </TabPanel>

        {/* MEMBERS SETTINGS */}

        <TabPanel value={tab} index={1}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{
                justifyContent: "space-between",
                alignItems: {
                  xs: "flex-start",
                  sm: "center",
                },
                mb: 3,
              }}
            >
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700 }}
                >
                  Organization Members
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  {members.length} active members in this workspace.
                </Typography>
              </Box>

              {(currentRole === "OWNER") && (
                <Button
                  variant="contained"
                  startIcon={<AddOutlined />}
                  onClick={() => setOpenAddDialog(true)}
                  sx={{ textTransform: "none", borderRadius: 2 }}
                >
                  Add Member
                </Button>
              )}
            </Stack>

            {members.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <PeopleOutlined
                  sx={{
                    fontSize: 48,
                    color: "text.disabled",
                  }}
                />

                <Typography sx={{ mt: 1, fontWeight: 600 }}>
                  No members found
                </Typography>
              </Box>
            ) : (
              <Stack divider={<Divider />}>
                {members.map((member) => (
                  <Stack
                    key={member._id}
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{
                      py: 2,
                      justifyContent: "space-between",
                      alignItems: {
                        xs: "flex-start",
                        sm: "center",
                      },
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={2}
                      sx={{ alignItems: "center" }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: "#E0E7FF",
                          color: "#4338CA",
                        }}
                      >
                        {member.user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </Avatar>

                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>
                          {member.user?.name || "Unknown User"}
                        </Typography>

                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{ alignItems: "center" }}
                        >
                          <MailOutlined
                            sx={{
                              fontSize: 14,
                              color: "text.secondary",
                            }}
                          />

                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {member.user?.email || "No email"}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>

                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center" }}
                    >
                      <Chip
                        size="small"
                        label={member.role}
color={member.role === "OWNER" ? "primary" : "default"}
                      />

                      <Chip
                        size="small"
                        variant="outlined"
                        label={member.user?.systemRole || "USER"}
                      />
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>
        </TabPanel>

        {/* PROFILE SETTINGS */}

        <TabPanel value={tab} index={2}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, mb: 0.5 }}
            >
              My Profile
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Your personal account information.
            </Typography>

            <Stack
              direction="row"
              spacing={2}
              sx={{
                alignItems: "center",
                mb: 3,
              }}
            >
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: "#4F46E5",
                  fontSize: 26,
                }}
              >
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </Avatar>

              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700 }}
                >
                  {user?.name || "User"}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  {user?.email}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ mb: 3 }} />

            <Stack spacing={2.5}>
              <Stack
                direction="row"
                spacing={2}
                sx={{ alignItems: "center" }}
              >
                <PersonOutlined color="action" />

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Full Name
                  </Typography>

                  <Typography sx={{ fontWeight: 500 }}>
                    {user?.name || "Not available"}
                  </Typography>
                </Box>
              </Stack>

              <Stack
                direction="row"
                spacing={2}
                sx={{ alignItems: "center" }}
              >
                <MailOutlined color="action" />

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Email Address
                  </Typography>

                  <Typography sx={{ fontWeight: 500 }}>
                    {user?.email || "Not available"}
                  </Typography>
                </Box>
              </Stack>

              <Stack
                direction="row"
                spacing={2}
                sx={{ alignItems: "center" }}
              >
                <ShieldOutlined color="action" />

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    System Role
                  </Typography>

                  <Typography sx={{ fontWeight: 500 }}>
                    {user?.systemRole || "USER"}
                  </Typography>
                </Box>
              </Stack>
            </Stack>

            <Alert severity="info" sx={{ mt: 3 }}>
              Profile editing is not currently available.
              Your account information is displayed in read-only mode.
            </Alert>
          </Box>
        </TabPanel>
      </Paper>

      {/* ADD MEMBER DIALOG */}

      <Dialog
        open={openAddDialog}
        onClose={() => {
          if (!addingMember) setOpenAddDialog(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Add Organization Member
        </DialogTitle>

        <DialogContent>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            Add an existing registered FlowPilot user to this organization.
          </Typography>

          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
            />

            <TextField
              select
              fullWidth
              label="Organization Role"
              value={memberRole}
              onChange={(event) => setMemberRole(event.target.value)}
            >
              <MenuItem value="MEMBER">Member</MenuItem>
              {/* <MenuItem value="ADMIN">Admin</MenuItem> */}
            </TextField>

            <Alert severity="info">
              The user must already have an active FlowPilot account.
              The OWNER role cannot be assigned through this form.
            </Alert>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setOpenAddDialog(false)}
            disabled={addingMember}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={() => void handleAddMember()}
            disabled={addingMember || !email.trim()}
            sx={{ textTransform: "none" }}
          >
            {addingMember ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Add Member"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SettingsPage;
