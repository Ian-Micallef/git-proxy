const express = require('express');
const router = new express.Router();
const passport = require('../passport').getPassport();
const db = require('../../db');
const passportType = passport.type;

router.get('/', (req, res) => {
  res.status(200).json({
    login: {
      action: 'post',
      uri: '/api/auth/login',
    },
    profile: {
      action: 'get',
      uri: '/api/auth/profile',
    },
    logout: {
      action: 'post',
      uri: '/api/auth/logout',
    },
  });
});

router.post('/login', (req, res, next) => {
  passport.authenticate(passportType, async (err, user, info) => {
    if (err) {
      console.log(`service.routes.auth.login: Error logging user in ${JSON.stringify(err)}`);
      return res.status(500).send('Failed to login').end();
    }
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    try {
      // Check if MFA is enabled for the user
      const userRecord = await db.findUser(user.username);
      if (userRecord.mfaEnabled) {
        // Store user in session but mark as requiring MFA
        req.session.mfaPending = true;
        req.session.mfaPendingUser = user.username;
        return res.json({ requireMFA: true });
      }
      
      // No MFA required, complete login
      req.login(user, (err) => {
        if (err) {
          console.log(`service.routes.auth.login: Error logging user in ${JSON.stringify(err)}`);
          return res.status(500).send('Failed to login').end();
        }
        
        const currentUser = { ...user };
        delete currentUser.password;
        console.log(
          `serivce.routes.auth.login: user logged in, username=${
            currentUser.username
          } profile=${JSON.stringify(currentUser)}`,
        );
        
        return res.send({
          message: 'success',
          user: currentUser,
        });
      });
    } catch (e) {
      console.log(`service.routes.auth.login: Error logging user in ${JSON.stringify(e)}`);
      res.status(500).send('Failed to login').end();
      return;
    }
  })(req, res, next);
});

// when login is successful, retrieve user info
router.get('/success', (req, res) => {
  console.log('authenticated' + JSON.stringify(req.user));
  if (req.user) {
    res.json({
      success: true,
      message: 'user has successfully authenticated',
      user: req.user,
      cookies: req.cookies,
    });
  } else {
    res.status(401).end();
  }
});

// when login failed, send failed msg
router.get('failed', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'user failed to authenticate.',
  });
});

router.post('/logout', (req, res, next) => {
  req.logout(req.user, (err) => {
    if (err) return next(err);
  });
  res.clearCookie('connect.sid');
  res.send({ isAuth: req.isAuthenticated(), user: req.user });
});

router.get('/profile', async (req, res) => {
  if (req.user) {
    const userVal = await db.findUser(req.user.username);
    delete userVal.password;
    res.send(userVal);
  } else {
    res.status(401).end();
  }
});

router.post('/gitAccount', async (req, res) => {
  if (req.user) {
    try {
      let login =
        req.body.username == null || req.body.username == 'undefined'
          ? req.body.id
          : req.body.username;

      login = login.split('@')[0];

      const user = await db.findUser(login);

      console.log('Adding gitAccount' + req.body.gitAccount);
      user.gitAccount = req.body.gitAccount;
      db.updateUser(user);
      res.status(200).end();
    } catch (e) {
      res
        .status(500)
        .send({
          message: 'An error occurred',
        })
        .end();
    }
  } else {
    res.status(401).end();
  }
});

router.get('/userLoggedIn', async (req, res) => {
  if (req.user) {
    const user = JSON.parse(JSON.stringify(req.user));
    delete user.password;
    const login = user.username;
    const userVal = await db.findUser(login);
    delete userVal.password;
    res.send(userVal);
  } else {
    res.status(401).end();
  }
});

// Add MFA setup endpoint
router.post('/mfa/setup', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = await db.findUser(req.user.username);
  const totp = require('../passport/totp');
  const secret = totp.generateSecret(`GitProxy:${user.username}`);
  
  // Store MFA secret temporarily (not enabled yet)
  user.mfaSecret = secret.base32;
  user.mfaEnabled = false;
  await db.updateUser(user);
  
  res.json({
    secret: secret.base32,
    otpauth_url: secret.otpauth_url
  });
});

// Verify and enable MFA
router.post('/mfa/verify', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { token } = req.body;
  const user = await db.findUser(req.user.username);
  const totp = require('../passport/totp');
  
  if (!user.mfaSecret) {
    return res.status(400).json({ error: 'MFA not set up' });
  }
  
  const verified = totp.verifyToken(user.mfaSecret, token);
  
  if (verified) {
    // Enable MFA for the user
    user.mfaEnabled = true;
    await db.updateUser(user);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid token' });
  }
});

// Verify MFA during login
router.post('/mfa/validate', async (req, res) => {
  if (!req.session.mfaPending || !req.session.mfaPendingUser) {
    return res.status(401).json({ error: 'No MFA authentication in progress' });
  }
  
  const { token } = req.body;
  const username = req.session.mfaPendingUser;
  const user = await db.findUser(username);
  const totp = require('../passport/totp');
  
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return res.status(400).json({ error: 'MFA not enabled for user' });
  }
  
  const verified = totp.verifyToken(user.mfaSecret, token);
  
  if (verified) {
    // Complete login
    req.session.mfaPending = false;
    req.session.mfaPendingUser = null;
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }
      return res.json({ success: true });
    });
  } else {
    res.status(400).json({ error: 'Invalid token' });
  }
});

// Disable MFA
router.post('/mfa/disable', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const user = await db.findUser(req.user.username);
  user.mfaEnabled = false;
  user.mfaSecret = null;
  await db.updateUser(user);
  
  res.json({ success: true });
});

// Add QR code generation endpoint for MFA setup
router.get('/mfa/qrcode', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const user = await db.findUser(req.user.username);
  if (!user.mfaSecret) {
    return res.status(400).json({ error: 'MFA not set up' });
  }
  
  const QRCode = require('qrcode');
  const speakeasy = require('speakeasy');
  const otpauthUrl = speakeasy.otpauthURL({
    secret: user.mfaSecret,
    label: encodeURIComponent(`GitProxy:${user.username}`),
    issuer: 'GitProxy',
    encoding: 'base32'
  });
  
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    res.json({ qrcode: qrCodeDataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

module.exports = router;
