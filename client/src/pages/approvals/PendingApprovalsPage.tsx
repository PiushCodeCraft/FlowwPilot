
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
  Divider,
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

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
}

interface ApprovalStage {
  order: number;
  name: string;
  approver: PopulatedUser | string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";
  actedAt?: string;
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
  formData: Record<string, unknown>;
  stages: ApprovalStage[];
  currentStageOrder: number;
  status: string;
  submittedAt?: string;
}

interface ApprovalHistory {
  _id: string;
  stageOrder: number;
  stageName: string;
  approver: PopulatedUser;
  decision: "APPROVED" | "REJECTED";
  comments?: string;
  decidedAt?: string;
}

interface ListResponse<T> {
  success: boolean;
  count: number;
  data: T[];
}



function PendingApprovalsPage() {
  const { activeMembership } = useAuth();
  const organizationId = activeMembership?.organization?._id;

  const [requests, setRequests] = useState<WorkflowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedRequest, setSelectedRequest] =
    useState<WorkflowRequest | null>(null);

  const [history, setHistory] = useState<ApprovalHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decision, setDecision] =
    useState<"APPROVED" | "REJECTED">("APPROVED");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    if (!organizationId) {
      setLoading(false);
      setError("No active organization found.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get<ListResponse<WorkflowRequest>>(
        `/api/organizations/${organizationId}/requests/pending-approvals`
      );

      setRequests(response.data.data);
    } catch (err) {
      console.error("Failed to fetch pending approvals:", err);
      setError("Unable to load pending approvals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [organizationId]);

  const openRequestDetails = async (request: WorkflowRequest) => {
    if (!organizationId) return;

    setSelectedRequest(request);
    setHistory([]);
    setHistoryLoading(true);
    setError("");

    try {
      const response = await api.get<ListResponse<ApprovalHistory>>(
        `/api/organizations/${organizationId}/approvals/${request._id}/history`
      );

      setHistory(response.data.data);
    } catch (err) {
      console.error("Failed to fetch approval history:", err);
      setError("Unable to load approval history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openDecisionDialog = (
    selectedDecision: "APPROVED" | "REJECTED"
  ) => {
    setDecision(selectedDecision);
    setComments("");
    setDecisionOpen(true);
  };

  const handleDecision = async () => {
    if (!organizationId || !selectedRequest) return;

    if (decision === "REJECTED" && !comments.trim()) {
      setError("Please provide a reason for rejecting this request.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await api.post(
        `/api/organizations/${organizationId}/approvals/${selectedRequest._id}/decision`,
        {
          decision,
          comments: comments.trim(),
        }
      );

      setDecisionOpen(false);
      setSelectedRequest(null);

      setSuccess(
        decision === "APPROVED"
          ? "Request approved successfully."
          : "Request rejected successfully."
      );

      await fetchRequests();
    } catch (err) {
      console.error("Failed to process approval:", err);
      setError("Unable to process this decision. Please refresh and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getApproverName = (approver: PopulatedUser | string) => {
    return typeof approver === "string"
      ? approver
      : approver.name;
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Pending Approvals
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Review requests assigned to you and make approval decisions.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSuccess("")}
        >
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
            Approval Inbox
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {requests.length} request(s) waiting for your decision
          </Typography>
        </Box>

        {requests.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 7 }}>
            <Typography sx={{ fontWeight: 600 }}>
              No pending approvals
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              You're all caught up. New assigned requests will appear here.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#F8FAFC" }}>
                  <TableCell><strong>Request</strong></TableCell>
                  <TableCell><strong>Workflow</strong></TableCell>
                  <TableCell><strong>Submitted By</strong></TableCell>
                  <TableCell><strong>Current Stage</strong></TableCell>
                  <TableCell><strong>Submitted</strong></TableCell>
                  <TableCell align="right"><strong>Action</strong></TableCell>
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
                        {request.submittedBy?.name || "—"}
                      </TableCell>

                      <TableCell>
                        {currentStage?.name || "—"}
                      </TableCell>

                      <TableCell>
                        {request.submittedAt
                          ? new Date(request.submittedAt).toLocaleDateString()
                          : "—"}
                      </TableCell>

                      <TableCell align="right">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => openRequestDetails(request)}
                          sx={{ textTransform: "none" }}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Request Details Dialog */}
      <Dialog
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        fullWidth
        maxWidth="md"
      >
        {selectedRequest && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>
              Review Request
            </DialogTitle>

            <DialogContent dividers>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {selectedRequest.title}
              </Typography>

              <Typography color="text.secondary" variant="body2">
                Workflow: {selectedRequest.workflow?.name || "—"}
              </Typography>

              <Typography color="text.secondary" variant="body2">
                Submitted by: {selectedRequest.submittedBy?.name || "—"}
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Submitted Form Data
              </Typography>

              {Object.entries(selectedRequest.formData || {}).map(
                ([key, value]) => (
                  <Box
                    key={key}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 2,
                      py: 1.5,
                      borderBottom: "1px solid #E5EAF2",
                    }}
                  >
                    <Typography sx={{ fontWeight: 600 }}>
                      {key}
                    </Typography>

                    <Typography sx={{ textAlign: "right" }}>
                      {formatValue(value)}
                    </Typography>
                  </Box>
                )
              )}

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Approval Progress
              </Typography>

              {(selectedRequest.stages || []).map((stage) => (
                <Box
                  key={stage.order}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    py: 1.5,
                    borderBottom: "1px solid #E5EAF2",
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      {stage.order}. {stage.name}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Approver: {getApproverName(stage.approver)}
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    label={stage.status}
                    color={
                      stage.status === "APPROVED"
                        ? "success"
                        : stage.status === "REJECTED"
                          ? "error"
                          : stage.status === "PENDING"
                            ? "warning"
                            : "default"
                    }
                  />
                </Box>
              ))}

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Approval History
              </Typography>

              {historyLoading ? (
                <CircularProgress size={24} />
              ) : history.length === 0 ? (
                <Typography color="text.secondary">
                  No approval decisions have been recorded yet.
                </Typography>
              ) : (
                history.map((item) => (
                  <Paper
                    key={item._id}
                    variant="outlined"
                    sx={{ p: 2, mb: 2 }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 2,
                      }}
                    >
                      <Typography sx={{ fontWeight: 600 }}>
                        {item.stageName}
                      </Typography>

                      <Chip
                        size="small"
                        label={item.decision}
                        color={
                          item.decision === "APPROVED"
                            ? "success"
                            : "error"
                        }
                      />
                    </Box>

                    <Typography variant="body2" sx={{ mt: 1 }}>
                      By: {item.approver?.name || "Unknown"}
                    </Typography>

                    {item.comments && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        Comments: {item.comments}
                      </Typography>
                    )}

                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {item.decidedAt
                        ? new Date(item.decidedAt).toLocaleString()
                        : ""}
                    </Typography>
                  </Paper>
                ))
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
              <Button
                color="inherit"
                onClick={() => setSelectedRequest(null)}
              >
                Close
              </Button>

              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  color="error"
                  variant="outlined"
                  onClick={() => openDecisionDialog("REJECTED")}
                >
                  Reject
                </Button>

                <Button
                  variant="contained"
                  onClick={() => openDecisionDialog("APPROVED")}
                  sx={{ backgroundColor: "#4F46E5" }}
                >
                  Approve
                </Button>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Decision Confirmation Dialog */}
      <Dialog
        open={decisionOpen}
        onClose={() => !submitting && setDecisionOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {decision === "APPROVED" ? "Approve Request" : "Reject Request"}
        </DialogTitle>

        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {decision === "APPROVED"
              ? "Confirm that you want to approve this request."
              : "Please provide a reason for rejecting this request."}
          </Typography>

<TextField
  fullWidth
  multiline
  rows={3}
  label={decision === "APPROVED" ? "Comments (optional)" : "Rejection Reason"}
  value={comments}
  onChange={(e) => setComments(e.target.value)}
  required={decision === "REJECTED"}
  slotProps={{
    htmlInput: {
      maxLength: 1000,
    },
  }}
/>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            color="inherit"
            onClick={() => setDecisionOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color={decision === "APPROVED" ? "success" : "error"}
            onClick={handleDecision}
            disabled={
              submitting ||
              (decision === "REJECTED" && !comments.trim())
            }
          >
            {submitting
              ? "Processing..."
              : decision === "APPROVED"
                ? "Confirm Approval"
                : "Confirm Rejection"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PendingApprovalsPage;
