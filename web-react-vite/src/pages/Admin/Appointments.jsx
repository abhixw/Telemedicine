/**
 * Admin Appointments Page
 * Shows all appointments with filters, status tabs, and appointment details
 */

import React, { useState, useEffect } from 'react';
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
  Chip,
  Tabs,
  Tab,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Avatar,
  InputAdornment
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People,
  CalendarToday,
  LocalHospital,
  Medication,
  Description,
  Visibility,
  Edit,
  Search,
  Close,
  Phone,
  Email,
  Person,
  CalendarMonth,
  AccessTime,
  VideoCall,
  CheckCircle,
  AttachMoney
} from '@mui/icons-material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminAPI } from '../../api/admin.api';

const AdminAppointments = () => {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Filter states
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'tomorrow'
  const [statusFilter, setStatusFilter] = useState('all');
  const [mainTab, setMainTab] = useState(0); // 0: All, 1: Pending, 2: Completed
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);

  // Sidebar menu items
  const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/admin/appointments', label: 'Appointments', icon: <CalendarToday /> },
    { path: '/admin/patients', label: 'Patients', icon: <People /> },
    { path: '/admin/doctors', label: 'Doctors', icon: <LocalHospital /> },
    { path: '/admin/consultations', label: 'Consultations', icon: <VideoCall /> },
    { path: '/admin/prescriptions', label: 'Prescriptions', icon: <Medication /> },
    { path: '/admin/reports', label: 'Reports', icon: <Description /> },
  ];

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [appointments, dateFilter, statusFilter, mainTab, searchQuery]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllAppointments();
      console.log('Appointments response:', response);
      
      if (response.success && response.data) {
        setAppointments(response.data);
        setFilteredAppointments(response.data);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...appointments];

    // Date filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateFilter === 'today') {
      filtered = filtered.filter(apt => {
        // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
        const dateStr = apt.appointmentDate.split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const aptDate = new Date(year, month - 1, day);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === today.getTime();
      });
    } else if (dateFilter === 'tomorrow') {
      filtered = filtered.filter(apt => {
        // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
        const dateStr = apt.appointmentDate.split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const aptDate = new Date(year, month - 1, day);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === tomorrow.getTime();
      });
    }

    // Main tab filter (All, Pending, Completed)
    if (mainTab === 1) {
      filtered = filtered.filter(apt => apt.status === 'pending');
    } else if (mainTab === 2) {
      filtered = filtered.filter(apt => apt.status === 'completed');
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt =>
        apt.patientId?.name?.toLowerCase().includes(query) ||
        apt.doctorId?.name?.toLowerCase().includes(query)
      );
    }

    setFilteredAppointments(filtered);
    setPage(1);
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedAppointment(null);
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: 'warning',
      confirmed: 'success',
      completed: 'info',
      cancelled: 'error'
    };
    return statusColors[status] || 'default';
  };

  // Pagination
  const paginatedAppointments = filteredAppointments.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return (
    <DashboardLayout menuItems={menuItems} userRole="admin">
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="bold">
            Appointments
          </Typography>
        </Box>

        {/* Filters */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant={dateFilter === 'today' ? 'contained' : 'outlined'}
            onClick={() => setDateFilter('today')}
            sx={{ textTransform: 'none' }}
          >
            Today
          </Button>
          <Button
            variant={dateFilter === 'tomorrow' ? 'contained' : 'outlined'}
            onClick={() => setDateFilter('tomorrow')}
            sx={{ textTransform: 'none' }}
          >
            Tomorrow
          </Button>
          
          <FormControl sx={{ minWidth: 150 }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>

          <TextField
            placeholder="Search by patient or doctor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          <Button
            variant="outlined"
            onClick={() => {
              setDateFilter('all');
              setStatusFilter('all');
              setSearchQuery('');
              setMainTab(0);
            }}
            sx={{ textTransform: 'none' }}
          >
            Show Filters
          </Button>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={mainTab} onChange={(e, newValue) => setMainTab(newValue)}>
            <Tab label="All" />
            <Tab label="Pending" />
            <Tab label="Completed" />
          </Tabs>
        </Box>

        {/* Appointments Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : filteredAppointments.length === 0 ? (
          <Alert severity="info">No appointments found</Alert>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>S. No.</strong></TableCell>
                    <TableCell><strong>Time</strong></TableCell>
                    <TableCell><strong>Patient</strong></TableCell>
                    <TableCell><strong>Doctor</strong></TableCell>
                    <TableCell><strong>Mode</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedAppointments.map((appointment, index) => (
                    <TableRow key={appointment._id} hover>
                      <TableCell>{(page - 1) * rowsPerPage + index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">
                          {appointment.appointmentTime}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="600">
                            {appointment.patientId?.name || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {appointment.patientId?.age} years, {appointment.patientId?.gender}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="600">
                            {appointment.doctorId?.name || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {appointment.doctorId?.specialization || 'Doctor'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {appointment.consultationType === 'video' ? 'Online' : 'Offline'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          color={getStatusColor(appointment.status)}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewDetails(appointment)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="default">
                            <Edit fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination
                count={Math.ceil(filteredAppointments.length / rowsPerPage)}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          </Paper>
        )}
      </Box>

      {/* Appointment Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" fontWeight="bold">
              Appointment Details
            </Typography>
            <IconButton onClick={handleCloseDetails} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: 4, py: 3 }}>
          {selectedAppointment && (
            <Grid container spacing={3}>
              {/* Patient Information Card */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#f8f9fa' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                      <Person sx={{ fontSize: 24, color: '#1976d2' }} />
                      <Typography variant="h6" fontWeight="bold">
                        Patient Information
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      <Avatar
                        sx={{
                          width: 60,
                          height: 60,
                          bgcolor: '#4A90E2',
                          fontSize: 24,
                          fontWeight: 'bold'
                        }}
                      >
                        {selectedAppointment.patientId?.name?.charAt(0) || 'P'}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="600">
                          {selectedAppointment.patientId?.name || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedAppointment.patientId?.age} years, {selectedAppointment.patientId?.gender}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Phone sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Contact
                        </Typography>
                      </Box>
                      <Typography variant="body1" fontWeight="500">
                        +91 {selectedAppointment.patientId?.phone || 'N/A'}
                      </Typography>
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Email sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Email
                        </Typography>
                      </Box>
                      <Typography variant="body1" fontWeight="500" sx={{ wordBreak: 'break-word' }}>
                        {selectedAppointment.patientId?.email || 'N/A'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Doctor Information Card */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#f8f9fa' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                      <LocalHospital sx={{ fontSize: 24, color: '#2e7d32' }} />
                      <Typography variant="h6" fontWeight="bold">
                        Doctor Information
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      <Avatar
                        sx={{
                          width: 60,
                          height: 60,
                          bgcolor: '#2e7d32',
                          fontSize: 24,
                          fontWeight: 'bold'
                        }}
                      >
                        {selectedAppointment.doctorId?.name?.charAt(0) || 'D'}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="600">
                          {selectedAppointment.doctorId?.name || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedAppointment.doctorId?.specialization || 'Doctor'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Phone sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Contact
                        </Typography>
                      </Box>
                      <Typography variant="body1" fontWeight="500">
                        +91 {selectedAppointment.doctorId?.phone || 'N/A'}
                      </Typography>
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Email sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Email
                        </Typography>
                      </Box>
                      <Typography variant="body1" fontWeight="500" sx={{ wordBreak: 'break-word' }}>
                        {selectedAppointment.doctorId?.email || 'N/A'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Appointment Details */}
              <Grid item xs={12}>
                <Card sx={{ bgcolor: '#f0f7ff' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                      <CalendarMonth sx={{ fontSize: 24, color: '#1976d2' }} />
                      <Typography variant="h6" fontWeight="bold">
                        Appointment Details
                      </Typography>
                    </Box>

                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Date
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {new Date(selectedAppointment.appointmentDate).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Time
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {selectedAppointment.appointmentTime}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Consultation Type
                        </Typography>
                        <Chip
                          label={selectedAppointment.consultationType === 'video' ? 'Online' : 'Offline'}
                          size="small"
                          color={selectedAppointment.consultationType === 'video' ? 'success' : 'default'}
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Status
                        </Typography>
                        <Chip
                          label={selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                          color={getStatusColor(selectedAppointment.status)}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Amount
                        </Typography>
                        <Typography variant="h6" fontWeight="700" color="#2e7d32">
                          ₹{selectedAppointment.amount || 0}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Payment Status
                        </Typography>
                        <Chip
                          label={selectedAppointment.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                          color={selectedAppointment.paymentStatus === 'paid' ? 'success' : 'warning'}
                          size="small"
                          icon={<CheckCircle sx={{ fontSize: 16 }} />}
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 4, py: 2 }}>
          <Button 
            onClick={handleCloseDetails}
            variant="contained"
            sx={{ 
              textTransform: 'none',
              px: 4,
              py: 1,
              borderRadius: 2,
              fontWeight: 600
            }}
          >
            CLOSE
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminAppointments;
