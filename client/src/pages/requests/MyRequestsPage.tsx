
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

interface FormField {
  name: string;
  label: string;
  type: "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "SELECT";
  required: boolean;
  options?: string[];
}

interface Workflow {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  status: string;
  formFields: FormField[];
  stages: unknown[];
}

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
}

interface WorkflowRequest {
  _id: string;
  title: string;
  workflow?: {
    _id: string;
    name: string;
    category?: string;
  };
  submittedBy?: PopulatedUser;
  status: string;
  formData: Record<string, unknown> | Map<string, unknown>;
  currentStageOrder?: number;
  stages: Array<{
    order: number;
    name: string;
    status: string;
  }>;
  submittedAt?: string;
}

interface ListResponse<T> {
  success: boolean;
  count: number;
  data: T[];
}

function getStatusColor(
  status: string
): "success" | "error" | "warning" | "default" {
  switch (status) {
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "error";
    case "IN_PROGRESS":
      return "warning";
    default:
      return "default";
  }
}

function MyRequestsPage() {
  const { activeMembership } = useAuth();
  const organizationId = activeMembership?.organization?._id;

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [requests, setRequests] = useState<WorkflowRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [title, setTitle] = useState("");
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const selectedWorkflow = workflows.find(
    (workflow) => workflow._id === selectedWorkflowId
  );

  const fetchData = async () => {
    if (!organizationId) {
      setLoading(false);
      setError("No active organization found.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [workflowResponse, requestResponse] = await Promise.all([
        api.get<ListResponse<Workflow>>(
          `/api/organizations/${organizationId}/workflows`
        ),
        api.get<ListResponse<WorkflowRequest>>(
          `/api/organizations/${organizationId}/requests`
        ),
      ]);

      setWorkflows(
        workflowResponse.data.data.filter(
          (workflow) => workflow.status === "ACTIVE"
        )
      );

      setRequests(requestResponse.data.data);
    } catch (err) {
      console.error("Failed to load requests:", err);
      setError("Unable to load requests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const openDialog = () => {
    setSelectedWorkflowId("");
    setTitle("");
    setFormData({});
    setError("");
    setDialogOpen(true);
  };

  const handleWorkflowChange = (workflowId: string) => {
    setSelectedWorkflowId(workflowId);
    setFormData({});
  };

  const handleFieldChange = (
    field: FormField,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field.name]:
        field.type === "NUMBER" && value !== ""
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async () => {
    if (!organizationId || !selectedWorkflow) {
      setError("Please select a workflow.");
      return;
    }

    if (title.trim().length < 2 || title.trim().length > 150) {
      setError("Request title must contain 2–150 characters.");
      return;
    }

    for (const field of selectedWorkflow.formFields || []) {
      const value = formData[field.name];

      if (
        field.required &&
        (value === undefined ||
          value === null ||
          value === "")
      ) {
        setError(`${field.label} is required.`);
        return;
      }

      if (
        field.type === "SELECT" &&
        value !== undefined &&
        value !== "" &&
        !field.options?.includes(String(value))
      ) {
        setError(`Please select a valid ${field.label}.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError("");

      await api.post(
        `/api/organizations/${organizationId}/requests`,
        {
          workflowId: selectedWorkflowId,
          title: title.trim(),
          formData,
        }
      );

      setDialogOpen(false);
      setSuccess("Your request has been submitted successfully.");

      await fetchData();
    } catch (err) {
      console.error("Request submission failed:", err);
      setError("Unable to submit your request. Please check the form and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormField = (field: FormField) => {
    const value = formData[field.name] ?? "";

    const commonProps = {
      key: field.name,
      fullWidth: true,
      label: field.label,
      required: field.required,
      value,
      margin: "normal" as const,
    };

    switch (field.type) {
      case "TEXTAREA":
        return (
          <TextField
            {...commonProps}
            multiline
            rows={3}
            onChange={(e) => handleFieldChange(field, e.target.value)}
          />
        );

      case "NUMBER":
        return (
          <TextField
            {...commonProps}
            type="number"
            slotProps={{ htmlInput: { min: 0 } }}
            onChange={(e) => handleFieldChange(field, e.target.value)}
          />
        );

      case "DATE":
        return (
          <TextField
            {...commonProps}
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
            onChange={(e) => handleFieldChange(field, e.target.value)}
          />
        );

      case "SELECT":
        return (
          <TextField
            {...commonProps}
            select
            onChange={(e) => handleFieldChange(field, e.target.value)}
          >
            {(field.options || []).map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        );

      default:
        return (
          <TextField
            {...commonProps}
            onChange={(e) => handleFieldChange(field, e.target.value)}
          />
        );
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            My Requests
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Submit requests and track their approval progress.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openDialog}
          sx={{
            backgroundColor: "#4F46E5",
            textTransform: "none",
            borderRadius: 2,
          }}
        >
          New Request
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          border: "1px solid #E5EAF2",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Request History
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {requests.length} request(s) found
          </Typography>
        </Box>

        {requests.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 7 }}>
            <Typography sx={{ fontWeight: 600 }}>
              No requests found
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Submit your first request to get started.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#F8FAFC" }}>
                  <TableCell><strong>Request Title</strong></TableCell>
                  <TableCell><strong>Workflow</strong></TableCell>
                  <TableCell><strong>Submitted</strong></TableCell>
                  <TableCell><strong>Current Stage</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {requests.map((request) => {
                  const currentStage = request.stages?.find(
                    (stage) => stage.order === request.currentStageOrder
                  );

                  return (
                    <TableRow key={request._id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>
                          {request.title}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {request.workflow?.name || "—"}
                      </TableCell>

                      <TableCell>
                        {request.submittedAt
                          ? new Date(request.submittedAt).toLocaleDateString()
                          : "—"}
                      </TableCell>

                      <TableCell>
                        {currentStage?.name ||
                          (request.status === "APPROVED"
                            ? "Completed"
                            : request.status === "REJECTED"
                              ? "Rejected"
                              : "—")}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={request.status.replace("_", " ")}
                          color={getStatusColor(request.status)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => !submitting && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Submit New Request
        </DialogTitle>

        <DialogContent dividers>
          {workflows.length === 0 ? (
            <Alert severity="info">
              No active workflows are currently available.
            </Alert>
          ) : (
            <>
              <TextField
                select
                fullWidth
                label="Select Workflow"
                value={selectedWorkflowId}
                onChange={(e) => handleWorkflowChange(e.target.value)}
                margin="normal"
                required
              >
                {workflows.map((workflow) => (
                  <MenuItem key={workflow._id} value={workflow._id}>
                    {workflow.name} ({workflow.category || "General"})
                  </MenuItem>
                ))}
              </TextField>

              {selectedWorkflow && (
                <>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, mt: 3, mb: 1 }}
                  >
                    Request Details
                  </Typography>

<TextField
  fullWidth
  label="Request Title"
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  margin="normal"
  required
  slotProps={{
    htmlInput: {
      maxLength: 150,
    },
  }}
  helperText="Give your request a clear title."
/>

                  {(selectedWorkflow.formFields || []).map(renderFormField)}
                </>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            color="inherit"
            onClick={() => setDialogOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || workflows.length === 0 || !selectedWorkflow}
            sx={{ backgroundColor: "#4F46E5" }}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MyRequestsPage;
