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
    Stack,
    Card,
    CardContent,
    alpha
} from '@mui/material';
import {
    ArrowBack,
    LocationOn,
    Email,
    Phone,
    Person,
    LocalHospital,
    CalendarToday,
    Assessment,
    People,
    ChatBubbleOutline,
    Assignment,
    CheckCircle,
    Bloodtype,
    Wc
} from '@mui/icons-material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminAPI } from '../../api/admin.api';
import toast from 'react-hot-toast';
import { adminMenuItems } from '../../constants/adminMenuItems';

const PatientProfile = () => {
    const { patientId } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPatientDetails();
    }, [patientId]);

    const fetchPatientDetails = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getPatientById(patientId);
            setPatient(response.data);
        } catch (error) {
            console.error('Error fetching patient details:', error);
            toast.error('Failed to load patient details');
            navigate('/admin/patients');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/admin/patients');
    };

    if (loading) {
        return (
            <DashboardLayout menuItems={adminMenuItems}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <CircularProgress size={50} sx={{ color: '#7c3aed' }} />
                </Box>
            </DashboardLayout>
        );
    }

    if (!patient) {
        return (
            <DashboardLayout menuItems={adminMenuItems}>
                <Box sx={{ textAlign: 'center', py: 10 }}>
                    <Typography variant="h5" color="textSecondary">Patient not found</Typography>
                    <Button onClick={handleBack} startIcon={<ArrowBack />} sx={{ mt: 2 }}>
                        Back to Patients
                    </Button>
                </Box>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout menuItems={adminMenuItems}>
            <Box sx={{ width: '100%', px: { xs: 1.5, sm: 2, md: 3 }, py: 2 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton 
                            onClick={handleBack}
                            sx={{ 
                                color: '#7c3aed',
                                '&:hover': { bgcolor: alpha('#7c3aed', 0.1) }
                            }}
                        >
                            <ArrowBack />
                        </IconButton>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                            Patient Profile
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        sx={{
                            borderRadius: 3,
                            textTransform: 'none',
                            px: 3,
                            py: 1,
                            background: '#7c3aed',
                            '&:hover': { background: '#6d28d9' }
                        }}
                    >
                        View Medical Records
                    </Button>
                </Box>

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
                            {/* Left Section - Patient Info */}
                            <Grid item xs={12} lg={8}>
                                <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                                    {/* Avatar */}
                                    <Box sx={{ position: 'relative' }}>
                                        <Avatar
                                            sx={{
                                                width: 120,
                                                height: 120,
                                                bgcolor: '#f3e8ff',
                                                color: '#7c3aed',
                                                fontSize: '2.5rem',
                                                border: '4px solid white',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                            }}
                                        >
                                            {patient.name?.charAt(0).toUpperCase()}
                                        </Avatar>
                                        {patient.isActive && (
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

                                    {/* Patient Details */}
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
                                            {patient.name}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                            Patient ID: {patient._id}
                                        </Typography>

                                        <Stack spacing={1.5}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Email sx={{ fontSize: 18, color: '#64748b' }} />
                                                <Typography variant="body2" color="textSecondary">
                                                    {patient.email}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Phone sx={{ fontSize: 18, color: '#64748b' }} />
                                                <Typography variant="body2" color="textSecondary">
                                                    {patient.phone || 'Phone not provided'}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <LocationOn sx={{ fontSize: 18, color: '#64748b' }} />
                                                <Typography variant="body2" color="textSecondary">
                                                    {patient.address || 'Address not provided'}
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                                            {patient.gender && (
                                                <Chip 
                                                    label={patient.gender}
                                                    size="small"
                                                    icon={<Wc />}
                                                    sx={{ 
                                                        bgcolor: alpha('#7c3aed', 0.1), 
                                                        color: '#7c3aed',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                            )}
                                            {patient.age && (
                                                <Chip 
                                                    label={`${patient.age} Years`}
                                                    size="small"
                                                    sx={{ 
                                                        bgcolor: alpha('#2563eb', 0.1), 
                                                        color: '#2563eb',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                            )}
                                            {patient.bloodGroup && (
                                                <Chip 
                                                    label={patient.bloodGroup}
                                                    size="small"
                                                    icon={<Bloodtype />}
                                                    sx={{ 
                                                        bgcolor: alpha('#ef4444', 0.1), 
                                                        color: '#ef4444',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Personal Information */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                                        Personal Information
                                    </Typography>
                                    <Card sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Grid container spacing={3}>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="caption" color="textSecondary">Full Name</Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {patient.name}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="caption" color="textSecondary">Gender</Typography>
                                                    <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                                                        {patient.gender || 'Not specified'}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="caption" color="textSecondary">Age</Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {patient.age || 'Not specified'} {patient.age && 'Years'}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="caption" color="textSecondary">Blood Group</Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {patient.bloodGroup || 'Not specified'}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Typography variant="caption" color="textSecondary">Address</Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {patient.address || 'Address not provided'}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                </Box>

                                {/* Medical History Placeholder */}
                                <Box>
                                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                                        Medical History Overview
                                    </Typography>
                                    <Card sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                                        <CardContent sx={{ p: 3, textAlign: 'center', py: 5 }}>
                                            <Assignment sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                                            <Typography variant="body2" color="textSecondary">
                                                No medical history recorded yet
                                            </Typography>
                                            <Button
                                                variant="outlined"
                                                sx={{
                                                    mt: 2,
                                                    borderRadius: 3,
                                                    textTransform: 'none',
                                                    borderColor: '#e2e8f0',
                                                    color: '#64748b'
                                                }}
                                            >
                                                Add Medical Records
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Box>
                            </Grid>

                            {/* Right Section - Account Info */}
                            <Grid item xs={12} lg={4}>
                                {/* Account Status Card */}
                                <Card 
                                    sx={{ 
                                        borderRadius: 3, 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                        border: '1px solid #e2e8f0',
                                        mb: 2
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 3 }}>
                                            Account Information
                                        </Typography>

                                        <Stack spacing={2.5}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" color="textSecondary">Status</Typography>
                                                <Chip 
                                                    label={patient.isActive ? 'Active' : 'Inactive'}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: patient.isActive ? alpha('#10b981', 0.1) : alpha('#ef4444', 0.1),
                                                        color: patient.isActive ? '#10b981' : '#ef4444',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                            </Box>
                                            <Divider />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" color="textSecondary">Username</Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {patient.username || 'N/A'}
                                                </Typography>
                                            </Box>
                                            <Divider />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" color="textSecondary">Registered On</Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {new Date(patient.createdAt).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </Typography>
                                            </Box>
                                            {patient.lastLogin && (
                                                <>
                                                    <Divider />
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <Typography variant="body2" color="textSecondary">Last Login</Typography>
                                                        <Typography variant="body2" fontWeight="bold">
                                                            {new Date(patient.lastLogin).toLocaleDateString('en-US', {
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

                                {/* Quick Actions Card */}
                                <Card 
                                    sx={{ 
                                        borderRadius: 3, 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                        border: '1px solid #e2e8f0'
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 3 }}>
                                            Quick Actions
                                        </Typography>

                                        <Stack spacing={1.5}>
                                            <Button
                                                variant="outlined"
                                                fullWidth
                                                startIcon={<Assignment />}
                                                sx={{
                                                    borderRadius: 3,
                                                    textTransform: 'none',
                                                    borderColor: '#e2e8f0',
                                                    color: '#64748b',
                                                    justifyContent: 'flex-start',
                                                    py: 1.2,
                                                    '&:hover': { 
                                                        borderColor: '#7c3aed', 
                                                        color: '#7c3aed',
                                                        bgcolor: alpha('#7c3aed', 0.05)
                                                    }
                                                }}
                                            >
                                                View Prescriptions
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                fullWidth
                                                startIcon={<CalendarToday />}
                                                sx={{
                                                    borderRadius: 3,
                                                    textTransform: 'none',
                                                    borderColor: '#e2e8f0',
                                                    color: '#64748b',
                                                    justifyContent: 'flex-start',
                                                    py: 1.2,
                                                    '&:hover': { 
                                                        borderColor: '#7c3aed', 
                                                        color: '#7c3aed',
                                                        bgcolor: alpha('#7c3aed', 0.05)
                                                    }
                                                }}
                                            >
                                                View Appointments
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                fullWidth
                                                startIcon={<Assessment />}
                                                sx={{
                                                    borderRadius: 3,
                                                    textTransform: 'none',
                                                    borderColor: '#e2e8f0',
                                                    color: '#64748b',
                                                    justifyContent: 'flex-start',
                                                    py: 1.2,
                                                    '&:hover': { 
                                                        borderColor: '#7c3aed', 
                                                        color: '#7c3aed',
                                                        bgcolor: alpha('#7c3aed', 0.05)
                                                    }
                                                }}
                                            >
                                                View Reports
                                            </Button>
                                            <Divider sx={{ my: 1 }} />
                                            <Button
                                                variant="contained"
                                                fullWidth
                                                startIcon={<Email />}
                                                sx={{
                                                    borderRadius: 3,
                                                    textTransform: 'none',
                                                    py: 1.2,
                                                    background: '#7c3aed',
                                                    '&:hover': { background: '#6d28d9' }
                                                }}
                                            >
                                                Send Message
                                            </Button>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Box>
                </Paper>
            </Box>
        </DashboardLayout>
    );
};

export default PatientProfile;
