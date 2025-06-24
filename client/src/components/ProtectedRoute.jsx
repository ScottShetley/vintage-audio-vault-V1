// client/src/components/ProtectedRoute.jsx
import React from 'react';
import {Navigate, Outlet} from 'react-router-dom';

const ProtectedRoute = () => {
  // *** THE FIX: Check for the correct 'authToken' key ***
  const isAuthenticated = localStorage.getItem ('authToken');

  // If authenticated, render the child routes.
  // Otherwise, redirect to the login page.
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;