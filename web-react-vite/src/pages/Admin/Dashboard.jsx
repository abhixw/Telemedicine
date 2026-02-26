import React, { useState, useEffect } from 'react';
import {
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  CircularProgress,
  alpha,
  Skeleton
} from '@mui/material';
import {
  People,
  LocalHospital,
  CalendarToday,
  TrendingUp,
  TrendingDown,
  Assessment,
  ChatBubbleOutline,
  Assignment,
  AttachMoney,
  CheckCircle
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminAPI } from '../../api/admin.api';
import { adminMenuItems } from '../../constants/adminMenuItems';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const CHART_COLORS = {
  primary: '#7c3aed',
  secondary: '#2563eb',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#0891b2',
};

const STATUS_COLORS = {
  confirmed: '#2563eb',
  completed: '#10b981',
  cancelled: '#ef4444',
  'no-show': '#f59e0b',
  rescheduled: '#0891b2',
};

const SPECIALTY_COLORS = [
  '#7c3aed', '#2563eb', '#10b981', '#f59e0b', '#ef4444', 
  '#0891b2', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
];

const DOCTOR_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#ef4444', '#8b5cf6', '#6366f1', '#14b8a6'
];


const StatCard = ({ label, value, change, icon, trend, loading, color = '#7c3aed', isCurrency = false }) => (
  <Card
    sx={{
      borderRadius: 3,
      boxShadow: 'none',
      border: '1px solid #e2e8f0',
      bgcolor: 'white',
      height: '100%',
      transition: 'all 0.25s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
        borderColor: alpha(color, 0.3)
      }
    }}
  >
    <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box
          sx={{
            background: `linear-gradient(135deg, ${alpha(color, 0.15)}, ${alpha(color, 0.05)})`,
            color: color,
            width: { xs: 44, md: 50 },
            height: { xs: 44, md: 50 },
            borderRadius: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${alpha(color, 0.2)}`
          }}
        >
          {React.cloneElement(icon, { sx: { fontSize: { xs: 22, md: 26 } } })}
        </Box>
        {change && (
          <Typography
            variant="caption"
            fontWeight="700"
            sx={{
              color: trend === 'up' ? '#10b981' : '#ef4444',
              bgcolor: alpha(trend === 'up' ? '#10b981' : '#ef4444', 0.1),
              px: 1.5,
              py: 0.6,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
              fontSize: '0.75rem'
            }}
          >
            {change} {trend === 'up' ? <TrendingUp sx={{ fontSize: 14 }} /> : <TrendingDown sx={{ fontSize: 14 }} />}
          </Typography>
        )}
      </Box>

      <Typography
        variant="body2"
        sx={{
          color: '#64748b',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          fontSize: { xs: '0.65rem', md: '0.7rem' },
          mb: 1
        }}
      >
        {label}
      </Typography>

      {loading ? (
        <Skeleton variant="text" width={100} height={40} />
      ) : (
        <Typography
          variant="h4"
          fontWeight="800"
          sx={{
            color: '#0f172a',
            fontSize: { xs: '1.5rem', md: '1.85rem' },
            letterSpacing: '-0.02em'
          }}
        >
          {isCurrency ? `₹${value.toLocaleString()}` : value.toLocaleString()}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const ChartCard = ({ title, children, loading }) => (
  <Card sx={{ 
    borderRadius: 3, 
    boxShadow: 'none', 
    border: '1px solid #e2e8f0', 
    height: '100%', 
    bgcolor: 'white',
    width: '100%'
  }}>
    <CardContent sx={{ p: { xs: 2, md: 3 }, width: '100%', boxSizing: 'border-box' }}>
      <Typography variant="h6" fontWeight="600" sx={{ mb: 3, color: '#475569', fontSize: { xs: '0.95rem', md: '1.1rem' } }}>
        {title}
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 320 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ width: '100%' }}>
          {children}
        </Box>
      )}
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    totalRevenue: 0
  });
  
  // Analytics state
  const [appointmentsTrend, setAppointmentsTrend] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [topDoctors, setTopDoctors] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [specialtyDistribution, setSpecialtyDistribution] = useState([]);
  
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchAnalytics();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, appointmentsRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getAllAppointments(),
      ]);
      
      const totalPatients = statsRes?.data?.totalPatients || 0;
      const totalDoctors = statsRes?.data?.totalDoctors || 0;
      
      let totalAppointments = 0;
      let totalRevenue = 0;
      
      if (appointmentsRes.success && appointmentsRes.data) {
        const appointments = appointmentsRes.data;
        totalAppointments = appointments.length;
        totalRevenue = appointments.reduce((sum, apt) => {
          if (apt.paymentStatus === 'paid' && apt.amount) {
            return sum + apt.amount;
          }
          return sum;
        }, 0);
      }
      
      setStats({
        totalPatients,
        totalDoctors,
        totalAppointments,
        totalRevenue
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setChartsLoading(true);
      const [
        trendRes,
        statusRes,
        doctorsRes,
        hoursRes,
        specialtyRes,
        revenueRes
      ] = await Promise.all([
        adminAPI.getAppointmentsTrend(30),
        adminAPI.getStatusDistribution(),
        adminAPI.getTopDoctors(10),
        adminAPI.getPeakHours(),
        adminAPI.getSpecialtyDistribution(),
        adminAPI.getRevenueAnalytics(30)
      ]);

      if (trendRes.success) {
        // Format dates for better display
        const formattedTrend = trendRes.data.map(item => ({
          ...item,
          displayDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }));
        setAppointmentsTrend(formattedTrend);
      }

      if (statusRes.success) {
        const formattedStatus = statusRes.data.map(item => ({
          name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
          value: item.count,
          color: STATUS_COLORS[item.status] || '#64748b'
        }));
        setStatusDistribution(formattedStatus);
      }

      if (doctorsRes.success) {
        const formattedDoctors = doctorsRes.data.map((doctor, index) => ({
          ...doctor,
          color: DOCTOR_COLORS[index % DOCTOR_COLORS.length]
        }));
        setTopDoctors(formattedDoctors);
      }

      if (hoursRes.success) {
        // Filter only business hours (8 AM to 8 PM)
        const businessHours = hoursRes.data.filter((item, index) => index >= 8 && index <= 20);
        setPeakHours(businessHours);
      }

      if (specialtyRes.success) {
        const formattedSpecialty = specialtyRes.data.slice(0, 8).map((item, index) => ({
          name: item.specialty,
          value: item.count,
          color: SPECIALTY_COLORS[index % SPECIALTY_COLORS.length]
        }));
        setSpecialtyDistribution(formattedSpecialty);
      }

      if (revenueRes.success) {
        const formattedRevenue = revenueRes.data.map(item => ({
          ...item,
          displayDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }));
        setRevenueTrend(formattedRevenue);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setChartsLoading(false);
    }
  };

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <Box 
        sx={{ 
          width: '100%', 
          height: '100%',
          p: { xs: 2, sm: 2.5, md: 3, lg: 3.5 }, 
          bgcolor: '#f8fafc', 
          minHeight: '100vh',
          boxSizing: 'border-box',
          maxWidth: '100%',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography variant="h4" fontWeight="700" sx={{ color: '#1e293b', mb: 0.5, fontSize: { xs: '1.5rem', md: '2rem' } }}>
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: '0.85rem', md: '0.95rem' } }}>
            Track, manage and forecast your platform data with real-time insights.
          </Typography>
        </Box>

        {/* Stats Cards - Full Width */}
        <Grid 
          container 
          spacing={{ xs: 2, md: 2.5 }} 
          sx={{ 
            mb: { xs: 3, md: 4 },
            width: '100%',
            m: 0
          }}
        >
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              label="Total Patients"
              value={stats.totalPatients}
              change="+12%"
              trend="up"
              icon={<People />}
              color="#6366f1"
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              label="Total Doctors"
              value={stats.totalDoctors}
              change="+5%"
              trend="up"
              icon={<LocalHospital />}
              color="#ec4899"
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              label="Total Appointments"
              value={stats.totalAppointments}
              change="+8%"
              trend="up"
              icon={<CalendarToday />}
              color="#14b8a6"
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              label="Total Revenue"
              value={stats.totalRevenue}
              change="+25%"
              trend="up"
              icon={<AttachMoney />}
              color="#f59e0b"
              loading={loading}
              isCurrency={true}
            />
          </Grid>
        </Grid>

        {/* Charts Section */}
        <Grid 
          container 
          spacing={{ xs: 2, md: 2.5 }}
          sx={{
            width: '100%',
            m: 0
          }}
        >
          {/* Appointments Trend - Full Width */}
          <Grid size={{ xs: 12 }}>
            <ChartCard title="Appointments Trend (Last 30 Days)" loading={chartsLoading}>
              <ResponsiveContainer width="100%" height={380}>
                <AreaChart data={appointmentsTrend}>
                  <defs>
                    <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    stroke="#cbd5e1"
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    stroke="#cbd5e1"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: 8, 
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="appointments" 
                    stroke="#8b5cf6" 
                    strokeWidth={2.5}
                    fill="url(#colorAppointments)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>

          {/* Revenue Analytics */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <ChartCard title="Revenue Analytics (Last 30 Days)" loading={chartsLoading}>
              <ResponsiveContainer width="100%" height={380}>
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    stroke="#cbd5e1"
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    stroke="#cbd5e1"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: 8, 
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={2.5}
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>

          {/* Status Distribution */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <ChartCard title="Appointment Status" loading={chartsLoading}>
              <ResponsiveContainer width="100%" height={380}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={120}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>

          {/* Specialty Distribution */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <ChartCard title="Popular Specialties" loading={chartsLoading}>
              <ResponsiveContainer width="100%" height={380}>
                <PieChart>
                  <Pie
                    data={specialtyDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {specialtyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>

          {/* Top Doctors */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <ChartCard title="Top Performing Doctors" loading={chartsLoading}>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={topDoctors} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={160}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    stroke="#cbd5e1"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: 8, 
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar dataKey="appointmentCount" radius={[0, 8, 8, 0]}>
                    {topDoctors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>

          {/* Peak Hours */}
          <Grid size={{ xs: 12 }}>
            <ChartCard title="Peak Appointment Hours" loading={chartsLoading}>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    stroke="#cbd5e1"
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    stroke="#cbd5e1"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: 8, 
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar dataKey="appointments" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default AdminDashboard;
