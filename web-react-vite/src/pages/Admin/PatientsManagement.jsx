import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Avatar,
    Chip,
    IconButton,
    TextField,
    InputAdornment,
    InputBase,
    CircularProgress,
    alpha
} from '@mui/material';
import {
    Search,
    Visibility,
    Email,
    Phone,
    People,
    Assessment,
    CalendarToday,
    ChatBubbleOutline,
    LocalHospital,
    CheckCircle,
    Cancel,
    Assignment,
    Person
} from '@mui/icons-material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminAPI } from '../../api/admin.api';
import toast from 'react-hot-toast';
import { adminMenuItems } from '../../constants/adminMenuItems';

const PatientsManagement = () => {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getPatients();
            setPatients(response.data || []);
        } catch (error) {
            console.error('Error fetching patients:', error);
            toast.error('Failed to load patients');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (patient) => {
        navigate(`/admin/patients/${patient._id}`);
    };

    const filteredPatients = patients.filter(patient =>
        (patient.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (patient.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (patient.phone || '').includes(searchTerm)
    );

    return (
        <DashboardLayout menuItems={adminMenuItems}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b' }}>
                    Patients Management
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    View and manage all registered patients on the platform.
                </Typography>
            </Box>

            {/* Search and Filters */}
            <Paper
                sx={{
                    p: 2,
                    mb: 3,
                    borderRadius: 4,
                    boxShadow: 'none',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: '#f8fafc',
                        borderRadius: 3,
                        px: 2,
                        py: 1,
                        flex: 1,
                        border: '1px solid #e2e8f0'
                    }}
                >
                    <Search sx={{ color: 'text.secondary', mr: 1 }} />
                    <InputBase
                        fullWidth
                        placeholder="Search patients by name, email or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ fontSize: '0.95rem' }}
                    />
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<Person />}
                    sx={{ borderRadius: 3, textTransform: 'none', borderColor: '#e2e8f0', color: '#64748b' }}
                >
                    All Status
                </Button>
            </Paper>

            {/* Patients Table */}
            <TableContainer
                component={Paper}
                sx={{
                    borderRadius: 4,
                    boxShadow: 'none',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden'
                }}
            >
                <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>Patient</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>Gender</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>Age</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>Blood Group</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }} align="right">Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                    <CircularProgress size={40} thickness={4} sx={{ color: '#7c3aed' }} />
                                    <Typography sx={{ mt: 2, color: 'text.secondary', fontWeight: 'medium' }}>
                                        Loading patients...
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : filteredPatients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                    <Typography color="textSecondary">No patients found matching your search.</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPatients.map((patient) => (
                                <TableRow key={patient._id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar
                                                sx={{
                                                    bgcolor: alpha('#7c3aed', 0.1),
                                                    color: '#7c3aed',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                {patient.name?.charAt(0).toUpperCase()}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">{patient.name}</Typography>
                                                <Typography variant="caption" color="textSecondary">{patient.email}</Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ textTransform: 'capitalize' }}>
                                        {patient.gender || 'N/A'}
                                    </TableCell>
                                    <TableCell>{patient.age || 'N/A'} Years</TableCell>
                                    <TableCell>
                                        {patient.bloodGroup ? (
                                            <Chip
                                                label={patient.bloodGroup}
                                                size="small"
                                                sx={{ bgcolor: alpha('#ef4444', 0.1), color: '#ef4444', fontWeight: 'bold' }}
                                            />
                                        ) : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={patient.isActive ? 'Active' : 'Inactive'}
                                            sx={{
                                                bgcolor: patient.isActive ? alpha('#10b981', 0.1) : alpha('#ef4444', 0.1),
                                                color: patient.isActive ? '#10b981' : '#ef4444',
                                                fontWeight: 'bold',
                                                fontSize: '0.75rem'
                                            }}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<Visibility />}
                                            onClick={() => handleViewDetails(patient)}
                                            sx={{
                                                textTransform: 'none',
                                                borderRadius: 2,
                                                borderColor: '#e2e8f0',
                                                color: '#64748b',
                                                '&:hover': { borderColor: '#7c3aed', color: '#7c3aed' }
                                            }}
                                        >
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </DashboardLayout>
    );
};

export default PatientsManagement;
