import { useCallback, useEffect, useState } from "react";
import type { ReactNode, ChangeEvent } from "react";

import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  AddCircleOutlined,
  EditOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CancelOutlined,
  PersonAddOutlined,
  PersonRemoveOutlined,
  HistoryOutlined,
  RefreshOutlined,
  SearchOutlined,
  FilterAltOutlined,
  ClearOutlined,
} from "@mui/icons-material";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

// -------------------- TYPES --------------------

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
}

interface ActivityRequest {
  _id: string;
  title: string;
  status: string;
}

interface ActivityWorkflow {
  _id: string;
  name: string;
  category: string;
}

interface Activity {
  _id: string;
  user: PopulatedUser;
  action: string;
  description: string;
  request?: ActivityRequest | null;
  workflow?: ActivityWorkflow | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface ActivityResponse {
  success: boolean;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  count: number;
  data: Activity[];
}

// -------------------- CONSTANTS --------------------

const PAGE_LIMIT = 100;

const actionConfig: Record<
  string,
  {
    label: string;
    color: string;
    background: string;
    icon: ReactNode;
  }
> = {
  WORKFLOW_CREATED: {
    label: "Workflow Created",
    color: "#15803D",
    background: "#DCFCE7",
    icon: <AddCircleOutlined />,
  },
  WORKFLOW_UPDATED: {
    label: "Workflow Updated",
    color: "#2563EB",
    background: "#DBEAFE",
    icon: <EditOutlined />,
  },
  REQUEST_SUBMITTED: {
    label: "Request Submitted",
    color: "#7C3AED",
    background: "#EDE9FE",
    icon: <SendOutlined />,
  },
  REQUEST_APPROVED: {
    label: "Request Approved",
    color: "#15803D",
    background: "#DCFCE7",
    icon: <CheckCircleOutlined />,
  },
  REQUEST_REJECTED: {
    label: "Request Rejected",
    color: "#DC2626",
    background: "#FEE2E2",
    icon: <CancelOutlined />,
  },
  MEMBER_ADDED: {
    label: "Member Added",
    color: "#0891B2",
    background: "#CFFAFE",
    icon: <PersonAddOutlined />,
  },
  MEMBER_REMOVED: {
    label: "Member Removed",
    color: "#DC2626",
    background: "#FEE2E2",
    icon: <PersonRemoveOutlined />,
  },
};

const categoryOptions = [
  { label: "All", value: "ALL" },
  { label: "Requests", value: "REQUESTS" },
  { label: "Workflows", value: "WORKFLOWS" },
  { label: "Members", value: "MEMBERS" },
];

const dateOptions = [
  { label: "All Time", value: "ALL" },
  { label: "Today", value: "TODAY" },
  { label: "Last 7 Days", value: "7D" },
  { label: "Last 30 Days", value: "30D" },
];

// -------------------- HELPERS --------------------

function formatDate(date: string): string {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown date";
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matchesDateFilter(date: string, filter: string): boolean {
  if (filter === "ALL") return true;

  const activityDate = new Date(date);

  if (Number.isNaN(activityDate.getTime())) {
    return false;
  }

  const now = new Date();

  if (filter === "TODAY") {
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    return activityDate >= startOfToday && activityDate <= now;
  }

  const days = filter === "7D" ? 7 : 30;

  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return activityDate >= startDate && activityDate <= now;
}

// -------------------- COMPONENT --------------------

function ActivityPage() {
  const { activeMembership } = useAuth();

  const organizationId = activeMembership?.organization?._id;

  // Activity data
  const [activities, setActivities] = useState<Activity[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Loading and error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL");

  // -------------------- FETCH ACTIVITIES --------------------

  const fetchActivities = useCallback(async () => {
    if (!organizationId) {
      setActivities([]);
      setTotal(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get<ActivityResponse>(
        `/api/organizations/${organizationId}/activity`,
        {
          params: {
            page,
            limit: PAGE_LIMIT,
          },
        }
      );

      setActivities(response.data.data || []);
      setTotal(response.data.pagination?.total || 0);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (err: unknown) {
      console.error("Failed to fetch activity:", err);

      setError("Unable to load activity history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [organizationId, page]);

  useEffect(() => {
    void fetchActivities();
  }, [fetchActivities]);

  // -------------------- FILTER ACTIVITIES --------------------

  const filteredActivities = activities.filter((activity) => {
    // Category filter
    const matchesCategory =
      category === "ALL" ||
      (category === "REQUESTS" && activity.action.startsWith("REQUEST_")) ||
      (category === "WORKFLOWS" && activity.action.startsWith("WORKFLOW_")) ||
      (category === "MEMBERS" && activity.action.startsWith("MEMBER_"));

    // Search filter
    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      !searchText ||
      activity.description?.toLowerCase().includes(searchText) ||
      activity.user?.name?.toLowerCase().includes(searchText) ||
      activity.user?.email?.toLowerCase().includes(searchText) ||
      activity.action?.toLowerCase().includes(searchText) ||
      activity.request?.title?.toLowerCase().includes(searchText) ||
      activity.workflow?.name?.toLowerCase().includes(searchText);

    // Date filter
    const matchesDate = matchesDateFilter(activity.createdAt, dateFilter);

    return matchesCategory && matchesSearch && matchesDate;
  });

  // -------------------- CLEAR FILTERS --------------------

  const handleClearFilters = () => {
    setCategory("ALL");
    setSearch("");
    setDateFilter("ALL");
    setPage(1);
  };

  // -------------------- PAGINATION --------------------

  const handlePageChange = (_event: ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  // -------------------- RENDER --------------------

  return (
    <Box sx={{ width: "100%", pb: 4 }}>
      {/* PAGE HEADER */}

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
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Activity
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Track everything happening in your organization.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshOutlined />}
          onClick={() => void fetchActivities()}
          disabled={loading}
          sx={{
            textTransform: "none",
            borderRadius: 2,
          }}
        >
          Refresh
        </Button>
      </Stack>

      {/* ACTIVITY SUMMARY */}

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          border: "1px solid #E5E7EB",
          borderRadius: 3,
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Avatar
            sx={{
              bgcolor: "#EEF2FF",
              color: "#4F46E5",
              width: 48,
              height: 48,
            }}
          >
            <HistoryOutlined />
          </Avatar>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Total organization activities
            </Typography>

            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {total}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* ERROR MESSAGE */}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ACTIVITY LIST */}

      <Paper
        elevation={0}
        sx={{
          border: "1px solid #E5E7EB",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        {/* SECTION HEADER */}

        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Recent Activity
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Organization-wide activity history
          </Typography>
        </Box>

        <Divider />

        {/* FILTER SECTION */}

        <Box sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {/* SEARCH */}

            <TextField
              fullWidth
              size="small"
              placeholder="Search by activity, user, request or workflow..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <SearchOutlined
                      sx={{
                        color: "text.secondary",
                        mr: 1,
                      }}
                    />
                  ),
                },
              }}
            />

            {/* CATEGORY FILTER */}

            <Box>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  mb: 1.5,
                }}
              >
                <FilterAltOutlined
                  sx={{
                    fontSize: 18,
                    color: "text.secondary",
                  }}
                />

                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Activity Category
                </Typography>
              </Stack>

              <Stack
                direction="row"
                spacing={1}
                sx={{ flexWrap: "wrap", gap: 1 }}
              >
                {categoryOptions.map((item) => (
                  <Button
                    key={item.value}
                    size="small"
                    variant={category === item.value ? "contained" : "outlined"}
                    onClick={() => setCategory(item.value)}
                    sx={{
                      textTransform: "none",
                      borderRadius: 2,
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            </Box>

            {/* DATE FILTER */}

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
                Date Range
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                sx={{ flexWrap: "wrap", gap: 1 }}
              >
                {dateOptions.map((item) => (
                  <Button
                    key={item.value}
                    size="small"
                    variant={
                      dateFilter === item.value ? "contained" : "outlined"
                    }
                    onClick={() => setDateFilter(item.value)}
                    sx={{
                      textTransform: "none",
                      borderRadius: 2,
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            </Box>

            {/* FILTER RESULTS */}

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{
                justifyContent: "space-between",
                alignItems: {
                  xs: "flex-start",
                  sm: "center",
                },
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Showing {filteredActivities.length} of {activities.length}{" "}
                loaded activities
              </Typography>

              <Button
                size="small"
                color="inherit"
                startIcon={<ClearOutlined />}
                onClick={handleClearFilters}
                disabled={
                  category === "ALL" && search === "" && dateFilter === "ALL"
                }
                sx={{ textTransform: "none" }}
              >
                Clear Filters
              </Button>
            </Stack>
          </Stack>
        </Box>

        <Divider />

        {/* LOADING */}

        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 7,
            }}
          >
            <CircularProgress />
          </Box>
        ) : filteredActivities.length === 0 ? (
          /* EMPTY STATE */

          <Box
            sx={{
              textAlign: "center",
              py: 8,
              px: 2,
            }}
          >
            <HistoryOutlined
              sx={{
                fontSize: 48,
                color: "text.disabled",
                mb: 1,
              }}
            />

            <Typography sx={{ fontWeight: 600 }}>
              {activities.length === 0
                ? "No activity found"
                : "No matching activities"}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {activities.length === 0
                ? "Organization activities will appear here when actions are performed."
                : "Try changing your search or filters."}
            </Typography>

            {activities.length > 0 && (
              <Button
                onClick={handleClearFilters}
                sx={{ mt: 2, textTransform: "none" }}
              >
                Clear Filters
              </Button>
            )}
          </Box>
        ) : (
          /* ACTIVITY ITEMS */

          <Stack divider={<Divider />}>
            {filteredActivities.map((activity) => {
              const config = actionConfig[activity.action] || {
                label: activity.action.replaceAll("_", " "),
                color: "#475569",
                background: "#F1F5F9",
                icon: <HistoryOutlined />,
              };

              return (
                <Box
                  key={activity._id}
                  sx={{
                    display: "flex",
                    gap: 2,
                    p: 3,
                    alignItems: "flex-start",
                    transition: "background 0.2s",
                    "&:hover": {
                      bgcolor: "#FAFBFF",
                    },
                  }}
                >
                  {/* ACTION ICON */}

                  <Avatar
                    sx={{
                      width: 42,
                      height: 42,
                      bgcolor: config.background,
                      color: config.color,
                      flexShrink: 0,
                    }}
                  >
                    {config.icon}
                  </Avatar>

                  {/* ACTIVITY DETAILS */}

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      sx={{
                        justifyContent: "space-between",
                        alignItems: {
                          xs: "flex-start",
                          sm: "center",
                        },
                      }}
                    >
                      <Typography sx={{ fontWeight: 600 }}>
                        {config.label}
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        {formatDate(activity.createdAt)}
                      </Typography>
                    </Stack>

                    {/* DESCRIPTION */}

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.7,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {activity.description}
                    </Typography>

                    {/* ACTIVITY TAGS */}

                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        mt: 1.5,
                        flexWrap: "wrap",
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          px: 1.2,
                          py: 0.5,
                          borderRadius: 1.5,
                          bgcolor: config.background,
                          color: config.color,
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {config.label}
                        </Typography>
                      </Box>

                      {activity.workflow && (
                        <Box
                          sx={{
                            px: 1.2,
                            py: 0.5,
                            borderRadius: 1.5,
                            bgcolor: "#F1F5F9",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Workflow: {activity.workflow.name}
                          </Typography>
                        </Box>
                      )}

                      {activity.request && (
                        <Box
                          sx={{
                            px: 1.2,
                            py: 0.5,
                            borderRadius: 1.5,
                            bgcolor: "#F1F5F9",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Request: {activity.request.title}
                          </Typography>
                        </Box>
                      )}
                    </Stack>

                    {/* USER INFORMATION */}

                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        alignItems: "center",
                        mt: 1.5,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 24,
                          height: 24,
                          fontSize: 11,
                          bgcolor: "#E0E7FF",
                          color: "#4338CA",
                        }}
                      >
                        {activity.user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </Avatar>

                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {activity.user?.name || "Unknown User"}
                        </Typography>

                        {activity.user?.email && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 1 }}
                          >
                            {activity.user.email}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}

        {/* PAGINATION */}

        {!loading && activities.length > 0 && totalPages > 1 && (
          <>
            <Divider />

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                p: 2.5,
              }}
            >
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
              />
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}

export default ActivityPage;
