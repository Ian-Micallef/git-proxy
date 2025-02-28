const chai = require('chai');
const expect = chai.expect;
const { isAuthenticated, isAdmin, hasRouteAccess } = require('../../../../src/ui/services/authService');

describe('Auth Service', () => {
  describe('isAuthenticated', () => {
    it('should return false for null user', () => {
      expect(isAuthenticated(null)).to.be.false;
    });

    it('should return false for undefined user', () => {
      expect(isAuthenticated(undefined)).to.be.false;
    });

    it('should return false for empty user object', () => {
      expect(isAuthenticated({})).to.be.false;
    });

    it('should return true for valid user object', () => {
      expect(isAuthenticated({ username: 'test' })).to.be.true;
    });
  });

  describe('isAdmin', () => {
    it('should return false for null user', () => {
      expect(isAdmin(null)).to.be.false;
    });

    it('should return false for undefined user', () => {
      expect(isAdmin(undefined)).to.be.false;
    });

    it('should return false for non-admin user', () => {
      expect(isAdmin({ username: 'test', admin: false })).to.be.false;
    });

    it('should return true for admin user', () => {
      expect(isAdmin({ username: 'test', admin: true })).to.be.true;
    });
  });

  describe('hasRouteAccess', () => {
    it('should allow access to public routes for unauthenticated users', () => {
      expect(hasRouteAccess(null, '/login')).to.be.true;
      expect(hasRouteAccess(null, '/register')).to.be.true;
      expect(hasRouteAccess(null, '/forgot-password')).to.be.true;
    });

    it('should deny access to admin routes for non-admin users', () => {
      const user = { username: 'test', admin: false };
      expect(hasRouteAccess(user, '/admin/user')).to.be.false;
    });

    it('should allow access to admin routes for admin users', () => {
      const user = { username: 'test', admin: true };
      expect(hasRouteAccess(user, '/admin/user')).to.be.true;
    });

    it('should allow access to authenticated routes for authenticated users', () => {
      const user = { username: 'test' };
      expect(hasRouteAccess(user, '/admin/repo')).to.be.true;
      expect(hasRouteAccess(user, '/admin/push')).to.be.true;
      expect(hasRouteAccess(user, '/admin/profile')).to.be.true;
    });

    it('should deny access to authenticated routes for unauthenticated users', () => {
      expect(hasRouteAccess(null, '/admin/repo')).to.be.false;
      expect(hasRouteAccess(null, '/admin/push')).to.be.false;
      expect(hasRouteAccess(null, '/admin/profile')).to.be.false;
    });
  });
});
