import {
  Assessment,
  CalendarToday,
  LocalHospital,
  CheckCircle,
  People,
  ChatBubbleOutline,
  Assignment,
} from '@mui/icons-material';

/**
 * Centralized Admin Sidebar Menu Items
 * Used across all admin pages to ensure consistency
 */
export const adminMenuItems = [
  { 
    path: '/admin/dashboard', 
    label: 'Overview', 
    icon: <Assessment /> 
  },
  { 
    path: '/admin/appointments', 
    label: 'Appointments', 
    icon: <CalendarToday /> 
  },
  { 
    path: '/admin/doctors', 
    label: 'Doctors', 
    icon: <LocalHospital /> 
  },
  { 
    path: '/admin/patients', 
    label: 'Patients', 
    icon: <People /> 
  },
//   { 
//     path: '/admin/reports', 
//     label: 'Reports', 
//     icon: <Assessment /> 
//   },
//   { 
//     path: '/admin/sos-alerts', 
//     label: 'Messages', 
//     icon: <ChatBubbleOutline />, 
//     badge: '5' 
//   },
//   { 
//     path: '/admin/prescriptions', 
//     label: 'Prescriptions', 
//     icon: <Assignment /> 
//   },
];
