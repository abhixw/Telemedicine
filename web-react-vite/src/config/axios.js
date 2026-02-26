import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.kuldeepraj.xyz/api',
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  withCredentials: false, 
  timeout: 30000, 
});


// Request interceptor - Add Firebase token to all requests
api.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
      } else {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} (No auth)`);
      }
    } catch (error) {
      console.error('Error getting Firebase token:', error);
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
   
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.error(`[API Error] ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });

    // If token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('[API] Attempting token refresh...');

      try {
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken(true); 
          originalRequest.headers.Authorization = `Bearer ${token}`;
          console.log('[API] Token refreshed, retrying request');
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Don't redirect - let React Router handle it
        return Promise.reject(refreshError);
      }
    }

    // Return the error with proper structure
    return Promise.reject(error);
  }
);

export default api;
