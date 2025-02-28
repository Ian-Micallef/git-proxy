import React from 'react';
import PropTypes from 'prop-types';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute/ProtectedRoute';

/**
 * SwitchRoutes component that handles routing for the admin layout
 * @param {Object} props - Component props
 * @param {Object} props.user - The user object
 * @param {Array} props.routes - The routes configuration
 * @return {React.Component} - The component to render
 */
const SwitchRoutes = ({ user, routes }) => {
  return (
    <Routes>
      {routes.map((prop, key) => {
        if (prop.layout === '/admin') {
          // Use ProtectedRoute for routes that require authorization
          return (
            <Route
              exact
              path={prop.path}
              key={key}
              element={
                <ProtectedRoute
                  user={user}
                  path={`/admin${prop.path}`}
                  component={prop.component}
                />
              }
            />
          );
        }
        return null;
      })}
      <Route exact path='/admin' element={<Navigate to='/admin/repo' />} />
    </Routes>
  );
};

SwitchRoutes.propTypes = {
  user: PropTypes.object,
  routes: PropTypes.array.isRequired,
};

export default SwitchRoutes;
