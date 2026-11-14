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
  IconButton,
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
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

interface Workflow {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  status: string;
  formFields?: unknown[];
  stages?: unknown[];
  createdAt?: string;
}

interface WorkflowResponse {
  success: boolean;
  count: number;
  data: Workflow[];
}

interface OrganizationMember {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  role: string;
}

interface MemberResponse {
  success: boolean;
  count: number;
  data: OrganizationMember[];
}

interface FormField {
  name: string;
  label: string;
  type: "TEXT" | "NUMBER" | "DATE" | "SELECT" | "TEXTAREA";
  required: boolean;
  options: string;
}

interface ApprovalStage {
  name: string;
  approver: string;
}

const emptyField: FormField = {
  name: "",
  label: "",
  type: "TEXT",
  required: false,
  options: "",
};

function WorkflowsPage() {
  const { activeMembership } = useAuth();

  const organizationId = activeMembership?.organization?._id;
  const canCreate =
    activeMembership?.role === "OWNER" || activeMembership?.role === "ADMIN";

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const [formFields, setFormFields] = useState<FormField[]>([
    { ...emptyField },
  ]);

  const [stages, setStages] = useState<ApprovalStage[]>([
    { name: "", approver: "" },
  ]);

  const fetchData = async () => {
    if (!organizationId) {
      setLoading(false);
      setError("No active organization found.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const workflowResponse = await api.get<WorkflowResponse>(
        `/api/organizations/${organizationId}/workflows`
      );

      setWorkflows(workflowResponse.data.data);
    } catch (err) {
      console.error("Failed to fetch workflows:", err);
      setError("Unable to load workflows.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const openCreateDialog = async () => {
    if (!organizationId) return;

    setError("");
    setSuccess("");

    try {
      const response = await api.get<MemberResponse>(
        `/api/organizations/${organizationId}/members`
      );

      setMembers(response.data.data);
      setDialogOpen(true);
    } catch (err) {
      console.error("Failed to fetch organization members:", err);
      setError("Unable to load organization members.");
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("");
    setFormFields([{ ...emptyField }]);
    setStages([{ name: "", approver: "" }]);
  };

  const updateField = (
    index: number,
    key: keyof FormField,
    value: string | boolean
  ) => {
    setFormFields((previous) =>
      previous.map((field, i) =>
        i === index ? { ...field, [key]: value } : field
      )
    );
  };

  const updateStage = (
    index: number,
    key: keyof ApprovalStage,
    value: string
  ) => {
    setStages((previous) =>
      previous.map((stage, i) =>
        i === index ? { ...stage, [key]: value } : stage
      )
    );
  };

  const handleCreateWorkflow = async () => {
    if (!organizationId) return;

    if (!name.trim() || !category.trim()) {
      setError("Workflow name and category are required.");
      return;
    }

    if (
      formFields.some(
        (field) =>
          !field.name.trim() ||
          !field.label.trim() ||
          (field.type === "SELECT" && !field.options.trim())
      )
    ) {
      setError("Complete all form fields. Select fields need options.");
      return;
    }

    if (
      stages.length === 0 ||
      stages.some((stage) => !stage.name.trim() || !stage.approver)
    ) {
      setError("Every approval stage needs a name and an approver.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),

        formFields: formFields.map((field) => ({
          name: field.name.trim(),
          label: field.label.trim(),
          type: field.type,
          required: field.required,
          ...(field.type === "SELECT"
            ? {
                options: field.options
                  .split(",")
                  .map((option) => option.trim())
                  .filter(Boolean)
                  .join(","),
              }
            : {}),
        })),

        stages: stages.map((stage, index) => ({
          order: index + 1,
          name: stage.name.trim(),
          approver: stage.approver,
        })),
      };

      await api.post(`/api/organizations/${organizationId}/workflows`, payload);

      setDialogOpen(false);
      resetForm();
      setSuccess("Workflow created successfully.");

      await fetchData();
    } catch (err) {
      console.error("Failed to create workflow:", err);
      setError(
        "Unable to create workflow. Please check your details and permissions."
      );
    } finally {
      setSubmitting(false);
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
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Workflows
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            View and manage your organization's workflows.
          </Typography>
        </Box>

        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
            sx={{
              backgroundColor: "#4F46E5",
              textTransform: "none",
              borderRadius: 2,
              px: 3,
            }}
          >
            Create Workflow
          </Button>
        )}
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
            All Workflows
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {workflows.length} workflow(s) found
          </Typography>
        </Box>

        {workflows.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 7 }}>
            <Typography sx={{ fontWeight: 600 }}>No workflows found</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Your organization hasn't created any workflows yet.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#F8FAFC" }}>
                  <TableCell>
                    <strong>Workflow Name</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Category</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Approval Stages</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Status</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Created</strong>
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow key={workflow._id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {workflow.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {workflow.description || "No description"}
                      </Typography>
                    </TableCell>

                    <TableCell>{workflow.category || "—"}</TableCell>
                    <TableCell>{workflow.stages?.length ?? 0}</TableCell>

                    <TableCell>
                      <Chip
                        label={workflow.status}
                        size="small"
                        color={
                          workflow.status === "ACTIVE"
                            ? "success"
                            : workflow.status === "INACTIVE"
                            ? "default"
                            : "warning"
                        }
                      />
                    </TableCell>

                    <TableCell>
                      {workflow.createdAt
                        ? new Date(workflow.createdAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => !submitting && setDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Workflow</DialogTitle>

        <DialogContent dividers>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Basic Information
          </Typography>

          <TextField
            fullWidth
            label="Workflow Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            multiline
            rows={2}
          />

          <TextField
            fullWidth
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            margin="normal"
            required
            placeholder="e.g. HR, Finance, IT"
          />

          <Box
            sx={{
              mt: 4,
              mb: 2,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Request Form Fields
            </Typography>

            <Button
              startIcon={<AddIcon />}
              onClick={() =>
                setFormFields((previous) => [...previous, { ...emptyField }])
              }
            >
              Add Field
            </Button>
          </Box>

          {formFields.map((field, index) => (
            <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ fontWeight: 600 }}>
                  Field {index + 1}
                </Typography>

                <IconButton
                  color="error"
                  disabled={formFields.length === 1}
                  onClick={() =>
                    setFormFields((previous) =>
                      previous.filter((_, i) => i !== index)
                    )
                  }
                >
                  <DeleteIcon />
                </IconButton>
              </Box>

              <TextField
                fullWidth
                label="Field Label"
                value={field.label}
                onChange={(e) => updateField(index, "label", e.target.value)}
                margin="normal"
              />

              <TextField
                fullWidth
                label="Field Name (unique key)"
                value={field.name}
                onChange={(e) =>
                  updateField(index, "name", e.target.value.replace(/\s+/g, ""))
                }
                margin="normal"
              />

              <TextField
                select
                fullWidth
                label="Field Type"
                value={field.type}
                onChange={(e) => updateField(index, "type", e.target.value)}
                margin="normal"
              >
                {["TEXT", "NUMBER", "DATE", "SELECT", "TEXTAREA"].map(
                  (type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  )
                )}
              </TextField>

              {field.type === "SELECT" && (
                <TextField
                  fullWidth
                  label="Options (comma separated)"
                  placeholder="Option 1, Option 2, Option 3"
                  value={field.options}
                  onChange={(e) =>
                    updateField(index, "options", e.target.value)
                  }
                  margin="normal"
                />
              )}

              <TextField
                select
                fullWidth
                label="Required"
                value={field.required ? "YES" : "NO"}
                onChange={(e) =>
                  updateField(index, "required", e.target.value === "YES")
                }
                margin="normal"
              >
                <MenuItem value="YES">Yes</MenuItem>
                <MenuItem value="NO">No</MenuItem>
              </TextField>
            </Paper>
          ))}

          <Box
            sx={{
              mt: 4,
              mb: 2,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Approval Stages
            </Typography>

            <Button
              startIcon={<AddIcon />}
              onClick={() =>
                setStages((previous) => [
                  ...previous,
                  { name: "", approver: "" },
                ])
              }
            >
              Add Stage
            </Button>
          </Box>

          {stages.map((stage, index) => (
            <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ fontWeight: 600 }}>
                  Stage {index + 1}
                </Typography>

                <IconButton
                  color="error"
                  disabled={stages.length === 1}
                  onClick={() =>
                    setStages((previous) =>
                      previous.filter((_, i) => i !== index)
                    )
                  }
                >
                  <DeleteIcon />
                </IconButton>
              </Box>

              <TextField
                fullWidth
                label="Stage Name"
                placeholder="e.g. Manager Approval"
                value={stage.name}
                onChange={(e) => updateStage(index, "name", e.target.value)}
                margin="normal"
              />

              <TextField
                select
                fullWidth
                label="Select Approver"
                value={stage.approver}
                onChange={(e) => updateStage(index, "approver", e.target.value)}
                margin="normal"
              >
                {members.map((member) => (
                  <MenuItem key={member.user._id} value={member.user._id}>
                    {member.user.name} ({member.user.email}) — {member.role}
                  </MenuItem>
                ))}
              </TextField>
            </Paper>
          ))}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={submitting}
            color="inherit"
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleCreateWorkflow}
            disabled={submitting}
            sx={{ backgroundColor: "#4F46E5" }}
          >
            {submitting ? "Creating..." : "Create Workflow"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default WorkflowsPage;
