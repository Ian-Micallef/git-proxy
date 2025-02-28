/**
 * Authentication and authorization service for UI routes
 */

/**
 * Check if the user is authenticated
 * @param {Object} user - The user object
 * @return {boolean} - Whether the user is authenticated
 */
const isAuthenticated = (user) => {
  return user !== null && user !== undefined && Object.keys(user).length > 0;
};

/**
 * Check if the user is an admin
 * @param {Object} user - The user object
 * @return {boolean} - Whether the user is an admin
 */
const isAdmin = (user) => {
  return isAuthenticated(user) && user.admin === true;
};

/**
 * Check if the user has access to a specific route
 * @param {Object} user - The user object
 * @param {string} route - The route to check access for
 * @return {boolean} - Whether the user has access to the route
 */
const hasRouteAccess = (user, route) => {
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password'];
  if (publicRoutes.includes(route)) {
    return true;
  }

  // Admin-only routes
  const adminRoutes = ['/admin/user'];
  if (adminRoutes.includes(route)) {
    return isAdmin(user);
  }

  // Authenticated user routes
  return isAuthenticated(user);
};

export { isAuthenticated, isAdmin, hasRouteAccess };
