import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * PrivateRoute — Requires the user to be authenticated (has a token).
 * Redirects to /login if not.
 */
export const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

/**
 * AdminRoute — Requires the user to be authenticated AND have role=admin.
 * Redirects to /login if no token, or to / (root) if wrong role.
 */
export const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

/**
 * WorkerRoute — Requires authentication AND role=worker.
 * Admins trying to access /worker are redirected to /admin.
 */
export const WorkerRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return children;
};

export default PrivateRoute;

