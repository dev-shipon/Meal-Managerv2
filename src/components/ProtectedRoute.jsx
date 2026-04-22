import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import { SmoothLoader } from './Loader';

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <SmoothLoader show={true} />;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return children;
}
