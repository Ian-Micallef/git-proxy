import React from 'react';
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { hasRouteAccess } from '../../services/authService';

/**
 * Protected route component that checks if the user has access to the route
 * @param {Object} props - Component props
 * @param {Object} props.user - The user object
 * @param {string} props.path - The route path
 * @param {React.Component} props.component - The component to render if authorized
 * @return {React.Component} - The component to render
 */
const ProtectedRoute = ({ user, path, component: Component }) => {
  if (!hasRouteAccess(user, path)) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" />;
  }

  return <Component />;
};

ProtectedRoute.propTypes = {
  user: PropTypes.object,
  path: PropTypes.string.isRequired,
  component: PropTypes.elementType.isRequired,
};

export default ProtectedRoute;
