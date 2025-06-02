// client/src/components/ProtectedRoute.jsx
import React from 'react';
import {Navigate, Outlet} from 'react-router-dom';

const ProtectedRoute = () => {
  // Check if JWT token exists in localStorage
  const isAuthenticated = localStorage.getItem ('token');

  // If authenticated, render the child routes (DashboardPage in this case)
  // Otherwise, redirect to the login page
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
