const speakeasy = require('speakeasy');
const passport = require('passport');

// Configure Passport to use TOTP as a second factor
const configure = async () => {
  // Verify TOTP token during login
  passport.use('totp', new (require('passport')).Strategy(
    async (user, done) => {
      try {
        if (!user.mfaEnabled) {
          return done(null, user);
        }
        
        // TOTP verification will be handled in auth.js routes
        return done(null, user, { requireTOTP: true });
      } catch (error) {
        return done(error);
      }
    }
  ));

  return passport;
};

// Generate a new TOTP secret for a user
const generateSecret = (label) => {
  return speakeasy.generateSecret({
    name: label
  });
};

// Verify a TOTP token
const verifyToken = (secret, token) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 1 // Allow a 30-second window before and after
  });
};

module.exports = {
  configure,
  generateSecret,
  verifyToken
};
