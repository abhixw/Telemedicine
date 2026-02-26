import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  MedicalServices as MedicalIcon,
  LocalHospital as HospitalIcon,
  Assessment,
  CalendarToday,
  People,
  ChatBubbleOutline,
  Assignment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin.api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../constants/adminMenuItems';

const DoctorApproval = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Rejection modal state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingDoctors();
  }, []);

  const fetchPendingDoctors = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getPendingDoctors();
      setDoctors(response.data || []);
    } catch (err) {
      console.error('Error fetching pending doctors:', err);
      setError(err.response?.data?.message || 'Failed to load pending doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (doctorId) => {
    try {
      setSubmitting(true);
      setError('');
      await adminAPI.approveDoctor(doctorId);
      setSuccessMessage('Doctor approved successfully!');
      
      // Remove approved doctor from list
      setDoctors(doctors.filter(doc => doc._id !== doctorId));
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error approving doctor:', err);
      setError(err.response?.data?.message || 'Failed to approve doctor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectClick = (doctor) => {
    setSelectedDoctor(doctor);
    setRejectDialogOpen(true);
    setRejectionReason('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      setError('Please enter a rejection reason');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await adminAPI.rejectDoctor(selectedDoctor._id, rejectionReason);
      setSuccessMessage('Doctor rejected successfully!');
      
      // Remove rejected doctor from list
      setDoctors(doctors.filter(doc => doc._id !== selectedDoctor._id));
      
      // Close dialog
      setRejectDialogOpen(false);
      setSelectedDoctor(null);
      setRejectionReason('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error rejecting doctor:', err);
      setError(err.response?.data?.message || 'Failed to reject doctor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (doctorId) => {
    navigate(`/admin/doctors/${doctorId}`);
  };

  if (loading) {
    return (
      <DashboardLayout menuItems={adminMenuItems}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Doctor Approval
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review and approve doctor registrations
        </Typography>
      </Box>

      {/* Success Message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Pending Doctors Count */}
      <Box sx={{ mb: 3 }}>
        <Chip
          label={`${doctors.length} Pending Approval${doctors.length !== 1 ? 's' : ''}`}
          color="warning"
          sx={{ fontWeight: 500 }}
        />
      </Box>

      {/* Doctors Grid */}
      {doctors.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            backgroundColor: '#f9fafb',
            borderRadius: 2,
            border: '1px dashed #e5e7eb',
          }}
        >
          <MedicalIcon sx={{ fontSize: 64, color: '#9ca3af', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No Pending Approvals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All doctor registrations have been reviewed
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {doctors.map((doctor) => (
            <Grid item xs={12} md={6} lg={4} key={doctor._id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  {/* Doctor Avatar and Name */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      src={doctor.profilePicture}
                      alt={doctor.name}
                      sx={{
                        width: 64,
                        height: 64,
                        mr: 2,
                        bgcolor: '#6366f1',
                        fontSize: 24,
                        fontWeight: 600,
                      }}
                    >
                      {doctor.name?.charAt(0) || 'D'}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Dr. {doctor.name}
                      </Typography>
                      <Chip
                        label={doctor.specialization || 'General'}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 500 }}
                      />
                    </Box>
                  </Box>

                  {/* Doctor Details */}
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* Email */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmailIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        {doctor.email}
                      </Typography>
                    </Box>

                    {/* Phone */}
                    {doctor.phoneNumber && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PhoneIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                          {doctor.phoneNumber}
                        </Typography>
                      </Box>
                    )}

                    {/* Experience */}
                    {doctor.experience !== undefined && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MedicalIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                          {doctor.experience} years experience
                        </Typography>
                      </Box>
                    )}

                    {/* Hospital */}
                    {doctor.hospitalName && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HospitalIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                          {doctor.hospitalName}
                        </Typography>
                      </Box>
                    )}

                    {/* Registration Number */}
                    {doctor.registrationNumber && (
                      <Box sx={{ mt: 1, p: 1.5, bgcolor: '#f3f4f6', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Registration No.
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                          {doctor.registrationNumber}
                        </Typography>
                      </Box>
                    )}

                    {/* Registration Date */}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                      Applied: {new Date(doctor.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Typography>
                  </Box>
                </CardContent>

                {/* Action Buttons */}
                <CardActions
                  sx={{
                    p: 2,
                    pt: 0,
                    display: 'flex',
                    gap: 1,
                    borderTop: '1px solid #e5e7eb',
                  }}
                >
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<ApproveIcon />}
                    onClick={() => handleApprove(doctor._id)}
                    disabled={submitting}
                    sx={{
                      flex: 1,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={<RejectIcon />}
                    onClick={() => handleRejectClick(doctor)}
                    disabled={submitting}
                    sx={{
                      flex: 1,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => handleViewDetails(doctor._id)}
                    sx={{
                      flex: 1,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    View
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Rejection Reason Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => !submitting && setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Doctor Application</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a reason for rejecting Dr. {selectedDoctor?.name}'s application.
            This will be recorded for audit purposes.
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            label="Rejection Reason"
            placeholder="Enter reason for rejection (e.g., incomplete documents, invalid license, etc.)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            disabled={submitting}
            required
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRejectSubmit}
            disabled={submitting || !rejectionReason.trim()}
          >
            {submitting ? <CircularProgress size={20} /> : 'Reject Doctor'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </DashboardLayout>
  );
};

export default DoctorApproval;
