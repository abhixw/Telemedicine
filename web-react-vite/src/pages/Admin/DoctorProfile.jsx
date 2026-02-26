import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Avatar,
    Button,
    Chip,
    Grid,
    Divider,
    CircularProgress,
    IconButton,
    Rating,
    Stack,
    Card,
    CardContent,
    alpha,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert
} from '@mui/material';
import {
    ArrowBack,
    LocationOn,
    Email,
    Phone,
    Star,
    WorkHistory,
    Recommend,
    VideoCall,
    Facebook,
    Instagram,
    Twitter,
    Telegram,
    WhatsApp,
    LinkedIn,
    LocalHospital,
    Badge,
    CalendarToday,
    Assessment,
    People,
    ChatBubbleOutline,
    Assignment,
    CheckCircle,
    Cancel as RejectIcon,
    ThumbUp as ApproveIcon
} from '@mui/icons-material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminAPI } from '../../api/admin.api';
import toast from 'react-hot-toast';
import { adminMenuItems } from '../../constants/adminMenuItems';

const DoctorProfile = () => {
    const { doctorId } = useParams();
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        fetchDoctorDetails();
    }, [doctorId]);

    const fetchDoctorDetails = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getDoctorById(doctorId);
            setDoctor(response.data);
        } catch (error) {
            console.error('Error fetching doctor details:', error);
            toast.error('Failed to load doctor details');
            navigate('/admin/doctors');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/admin/doctors');
    };

    const handleApprove = async () => {
        try {
            setSubmitting(true);
            setErrorMessage('');
            await adminAPI.approveDoctor(doctorId);
            setSuccessMessage('Doctor approved successfully!');
            
            // Update local state
            setDoctor(prev => ({
                ...prev,
                approvalStatus: 'APPROVED',
                approvalDate: new Date()
            }));
            
            // Auto-dismiss success message
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error approving doctor:', error);
            setErrorMessage(error.response?.data?.message || 'Failed to approve doctor');
            toast.error('Failed to approve doctor');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRejectClick = () => {
        setRejectDialogOpen(true);
        setRejectionReason('');
        setErrorMessage('');
    };

    const handleRejectSubmit = async () => {
        if (!rejectionReason.trim()) {
            setErrorMessage('Please enter a rejection reason');
            return;
        }

        try {
            setSubmitting(true);
            setErrorMessage('');
            await adminAPI.rejectDoctor(doctorId, rejectionReason);
            setSuccessMessage('Doctor rejected successfully!');
            
            // Update local state
            setDoctor(prev => ({
                ...prev,
                approvalStatus: 'REJECTED',
                rejectionReason: rejectionReason
            }));
            
            // Close dialog
            setRejectDialogOpen(false);
            setRejectionReason('');
            
            // Auto-dismiss success message
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error rejecting doctor:', error);
            setErrorMessage(error.response?.data?.message || 'Failed to reject doctor');
            toast.error('Failed to reject doctor');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout menuItems={adminMenuItems}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <CircularProgress size={50} />
                </Box>
            </DashboardLayout>
        );
    }

    if (!doctor) {
        return (
            <DashboardLayout menuItems={adminMenuItems}>
                <Box sx={{ textAlign: 'center', py: 10 }}>
                    <Typography variant="h5" color="textSecondary">Doctor not found</Typography>
                    <Button onClick={handleBack} startIcon={<ArrowBack />} sx={{ mt: 2 }}>
                        Back to Doctors
                    </Button>
                </Box>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout menuItems={adminMenuItems}>
            <Box sx={{ width: '100%', px: { xs: 1.5, sm: 2, md: 3 }, py: 2 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton 
                            onClick={handleBack}
                            sx={{ 
                                color: '#2196f3',
                                '&:hover': { bgcolor: alpha('#2196f3', 0.1) }
                            }}
                        >
                            <ArrowBack />
                        </IconButton>
                        <Box>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                                Doctor profile
                            </Typography>
                            {doctor && (
                                <Chip 
                                    label={doctor.approvalStatus || 'PENDING'}
                                    size="small"
                                    color={
                                        (doctor.approvalStatus || 'PENDING') === 'APPROVED' ? 'success' :
                                        (doctor.approvalStatus || 'PENDING') === 'REJECTED' ? 'error' :
                                        'warning'
                                    }
                                    sx={{ mt: 0.5, fontWeight: 'bold' }}
                                />
                            )}
                        </Box>
                    </Box>
                    
                    {/* Approval/Rejection Buttons */}
                    {doctor && (doctor.approvalStatus === 'PENDING' || !doctor.approvalStatus) && (
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<ApproveIcon />}
                                onClick={handleApprove}
                                disabled={submitting}
                                sx={{
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    px: 3,
                                    py: 1,
                                    fontWeight: 600,
                                    '&:hover': { transform: 'translateY(-2px)' },
                                    transition: 'all 0.2s'
                                }}
                            >
                                Approve Doctor
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<RejectIcon />}
                                onClick={handleRejectClick}
                                disabled={submitting}
                                sx={{
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    px: 3,
                                    py: 1,
                                    fontWeight: 600,
                                    '&:hover': { transform: 'translateY(-2px)' },
                                    transition: 'all 0.2s'
                                }}
                            >
                                Reject Doctor
                            </Button>
                        </Box>
                    )}
                    
                    {/* Already Approved/Rejected Status */}
                    {doctor && doctor.approvalStatus === 'APPROVED' && (
                        <Chip 
                            icon={<CheckCircle />}
                            label="Already Approved"
                            color="success"
                            sx={{ fontWeight: 'bold', px: 2, py: 2.5 }}
                        />
                    )}
                    {doctor && doctor.approvalStatus === 'REJECTED' && (
                        <Chip 
                            icon={<RejectIcon />}
                            label="Already Rejected"
                            color="error"
                            sx={{ fontWeight: 'bold', px: 2, py: 2.5 }}
                        />
                    )}
                </Box>

                {/* Success/Error Messages */}
                {successMessage && (
                    <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
                        {successMessage}
                    </Alert>
                )}
                {errorMessage && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage('')}>
                        {errorMessage}
                    </Alert>
                )}

                {/* Main Content */}
                <Paper 
                    sx={{ 
                        borderRadius: 4, 
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        bgcolor: '#f8fafc'
                    }}
                >
                    <Box sx={{ p: { xs: 2, md: 4 } }}>
                        <Grid container spacing={4}>
                            {/* Left Section - Doctor Info */}
                            <Grid item xs={12} lg={8}>
                                <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                                    {/* Avatar */}
                                    <Box sx={{ position: 'relative' }}>
                                        <Avatar
                                            src={doctor.profileImage}
                                            sx={{
                                                width: 120,
                                                height: 120,
                                                bgcolor: '#e3f2fd',
                                                color: '#1976d2',
                                                fontSize: '2.5rem',
                                                border: '4px solid white',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                            }}
                                        >
                                            {doctor.name?.charAt(0)}
                                        </Avatar>
                                        {doctor.isActive && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: 8,
                                                    right: 8,
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: '50%',
                                                    bgcolor: '#10b981',
                                                    border: '3px solid white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <CheckCircle sx={{ fontSize: 14, color: 'white' }} />
                                            </Box>
                                        )}
                                    </Box>

                                    {/* Doctor Details */}
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
                                            Dr. {doctor.name}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                            {doctor.specialization}
                                        </Typography>

                                        <Stack spacing={1.5}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Email sx={{ fontSize: 18, color: '#64748b' }} />
                                                <Typography variant="body2" color="textSecondary">
                                                    {doctor.email}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Phone sx={{ fontSize: 18, color: '#64748b' }} />
                                                <Typography variant="body2" color="textSecondary">
                                                    {doctor.phone || 'Phone not provided'}
                                                </Typography>
                                            </Box>
                                            {doctor.hospitalName && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <LocalHospital sx={{ fontSize: 18, color: '#64748b' }} />
                                                    <Typography variant="body2" color="textSecondary">
                                                        {doctor.hospitalName}
                                                    </Typography>
                                                </Box>
                                            )}
                                            {doctor.hospitalAddress && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <LocationOn sx={{ fontSize: 18, color: '#64748b' }} />
                                                    <Typography variant="body2" color="textSecondary">
                                                        {doctor.hospitalAddress}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Stack>

                                        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                                            {doctor.experience && (
                                                <Chip 
                                                    label={`${doctor.experience} Years Exp`}
                                                    size="small"
                                                    sx={{ bgcolor: alpha('#2196f3', 0.1), color: '#2196f3', fontWeight: 'bold' }}
                                                />
                                            )}
                                            {doctor.hourlyRate && (
                                                <Chip 
                                                    label={`₹${doctor.hourlyRate}/hr`}
                                                    size="small"
                                                    sx={{ bgcolor: alpha('#10b981', 0.1), color: '#10b981', fontWeight: 'bold' }}
                                                />
                                            )}
                                            {doctor.availability && (
                                                <Chip 
                                                    label={doctor.availability}
                                                    size="small"
                                                    sx={{ bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b', fontWeight: 'bold' }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </Box>

                                {/* About Doctor */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                                        About Dr. {doctor.name}
                                    </Typography>
                                    <Card sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                                                {doctor.about || 'No biography provided yet.'}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Box>

                                {/* Professional Details */}
                                <Box>
                                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                                        Professional Details
                                    </Typography>
                                    <Card sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Grid container spacing={3}>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="caption" color="textSecondary">Registration Number</Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {doctor.registrationNumber || 'Not provided'}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="caption" color="textSecondary">Specialization</Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {doctor.specialization || 'General Physician'}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="caption" color="textSecondary">Experience</Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {doctor.experience ? `${doctor.experience} Years` : 'Not specified'}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="caption" color="textSecondary">Consultation Fee</Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        ₹{doctor.hourlyRate || 500}/hour
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Typography variant="caption" color="textSecondary">Languages</Typography>
                                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                                        {(doctor.languages && doctor.languages.length > 0) ? (
                                                            doctor.languages.map((lang, idx) => (
                                                                <Chip 
                                                                    key={idx}
                                                                    label={lang} 
                                                                    size="small" 
                                                                    sx={{ 
                                                                        bgcolor: alpha('#7c3aed', 0.1), 
                                                                        color: '#7c3aed',
                                                                        fontSize: '0.75rem'
                                                                    }}
                                                                />
                                                            ))
                                                        ) : (
                                                            <Typography variant="body2" fontWeight="bold">English, Hindi</Typography>
                                                        )}
                                                    </Box>
                                                </Grid>
                                                {doctor.gender && (
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="caption" color="textSecondary">Gender</Typography>
                                                        <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                                                            {doctor.gender}
                                                        </Typography>
                                                    </Grid>
                                                )}
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                </Box>
                            </Grid>

                            {/* Right Section - Social Media & About */}
                            <Grid item xs={12} lg={4}>
                                {/* Social Media */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                                        Social Media
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                                        <IconButton 
                                            sx={{ 
                                                bgcolor: '#1877f2', 
                                                color: 'white',
                                                '&:hover': { bgcolor: '#1565c0' }
                                            }}
                                        >
                                            <Facebook />
                                        </IconButton>
                                        <IconButton 
                                            sx={{ 
                                                background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                                                color: 'white'
                                            }}
                                        >
                                            <Instagram />
                                        </IconButton>
                                        <IconButton 
                                            sx={{ 
                                                bgcolor: '#1da1f2', 
                                                color: 'white',
                                                '&:hover': { bgcolor: '#0d8ed9' }
                                            }}
                                        >
                                            <Twitter />
                                        </IconButton>
                                        <IconButton 
                                            sx={{ 
                                                bgcolor: '#0088cc', 
                                                color: 'white',
                                                '&:hover': { bgcolor: '#0077b5' }
                                            }}
                                        >
                                            <Telegram />
                                        </IconButton>
                                        <IconButton 
                                            sx={{ 
                                                bgcolor: '#25d366', 
                                                color: 'white',
                                                '&:hover': { bgcolor: '#1eb851' }
                                            }}
                                        >
                                            <WhatsApp />
                                        </IconButton>
                                        <IconButton 
                                            sx={{ 
                                                bgcolor: '#0077b5', 
                                                color: 'white',
                                                '&:hover': { bgcolor: '#006097' }
                                            }}
                                        >
                                            <LinkedIn />
                                        </IconButton>
                                    </Box>
                                </Box>

                                {/* About the Doctor Card */}
                                <Card 
                                    sx={{ 
                                        borderRadius: 3, 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                        border: '1px solid #e2e8f0'
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 3 }}>
                                            About the doctor
                                        </Typography>

                                        <Stack spacing={3}>
                                            {/* Experience */}
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                                <Box 
                                                    sx={{ 
                                                        width: 36, 
                                                        height: 36, 
                                                        borderRadius: '50%',
                                                        bgcolor: alpha('#64748b', 0.1),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    <WorkHistory sx={{ fontSize: 18, color: '#64748b' }} />
                                                </Box>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {doctor.experience || '10'} years of experience
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        At {doctor.hospital || 'oral surgery mg USA and oral surgery clinics New York'}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Recommendation */}
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                                <Box 
                                                    sx={{ 
                                                        width: 36, 
                                                        height: 36, 
                                                        borderRadius: '50%',
                                                        bgcolor: alpha('#64748b', 0.1),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    <Recommend sx={{ fontSize: 18, color: '#64748b' }} />
                                                </Box>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        85% Recommend
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        358 patients would recommend this doctor to their friends and family
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Online Consultations */}
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                                <Box 
                                                    sx={{ 
                                                        width: 36, 
                                                        height: 36, 
                                                        borderRadius: '50%',
                                                        bgcolor: alpha('#64748b', 0.1),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    <VideoCall sx={{ fontSize: 18, color: '#64748b' }} />
                                                </Box>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        Online consultations
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        The consultation is possible on site and online
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Stack>

                                        <Button
                                            variant="contained"
                                            fullWidth
                                            endIcon={<ArrowBack sx={{ transform: 'rotate(180deg)' }} />}
                                            sx={{
                                                mt: 3,
                                                py: 1.5,
                                                borderRadius: 3,
                                                textTransform: 'none',
                                                fontWeight: 'bold',
                                                background: '#2196f3',
                                                '&:hover': { background: '#1976d2' }
                                            }}
                                        >
                                            Book an appointment now
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Additional Info Card */}
                                <Card 
                                    sx={{ 
                                        mt: 2,
                                        borderRadius: 3, 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                        border: '1px solid #e2e8f0'
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                                            Registration Details
                                        </Typography>

                                        <Stack spacing={2}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" color="textSecondary">License Number</Typography>
                                                <Typography variant="body2" fontWeight="bold">{doctor.licenseNumber}</Typography>
                                            </Box>
                                            <Divider />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" color="textSecondary">Username</Typography>
                                                <Typography variant="body2" fontWeight="bold">{doctor.username || 'N/A'}</Typography>
                                            </Box>
                                            <Divider />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" color="textSecondary">Status</Typography>
                                                <Chip 
                                                    label={doctor.isActive ? 'Active' : 'Inactive'}
                                                    size="small"
                                                    color={doctor.isActive ? 'success' : 'error'}
                                                />
                                            </Box>
                                            <Divider />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" color="textSecondary">Registered On</Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {new Date(doctor.createdAt).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </Typography>
                                            </Box>
                                            {doctor.lastLogin && (
                                                <>
                                                    <Divider />
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <Typography variant="body2" color="textSecondary">Last Login</Typography>
                                                        <Typography variant="body2" fontWeight="bold">
                                                            {new Date(doctor.lastLogin).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                        </Typography>
                                                    </Box>
                                                </>
                                            )}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Box>
                </Paper>
            </Box>

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
                        Please provide a reason for rejecting Dr. {doctor?.name}'s application.
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
                        error={errorMessage && !rejectionReason.trim()}
                        helperText={errorMessage && !rejectionReason.trim() ? errorMessage : ''}
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
        </DashboardLayout>
    );
};

export default DoctorProfile;
