// Import the dependencies for testing
const chai = require('chai');
const chaiHttp = require('chai-http');
const db = require('../src/db');
const service = require('../src/service');
const speakeasy = require('speakeasy');

chai.use(chaiHttp);
chai.should();
const expect = chai.expect;

describe('MFA Authentication', async () => {
  let app;
  let cookie;
  const testUser = 'mfa-test-user';
  const testPassword = 'test-password';
  let mfaSecret;

  before(async () => {
    // Increase timeout for setup (using function-level timeout in mocha)
    app = await service.start();
    
    try {
      // Create a test user
      await db.deleteUser(testUser);
      
      // Create user with all required fields - parameters must be passed individually
      await db.createUser(
        testUser,                // username
        testPassword,            // password
        'mfa-test@example.com',  // email
        'mfa-test-account',      // gitAccount
        false                    // admin
      );
    } catch (error) {
      console.error('Error setting up MFA test:', error);
      throw error;
    }
  });

  describe('MFA Setup and Verification', async function () {
    it('should not allow MFA setup without authentication', async function () {
      const res = await chai.request(app).post('/api/auth/mfa/setup');
      res.should.have.status(401);
    });

    it('should login with username and password', async function () {
      const res = await chai.request(app).post('/api/auth/login').send({
        username: testUser,
        password: testPassword,
      });

      expect(res).to.have.cookie('connect.sid');
      res.should.have.status(200);

      // Get the connect cookie
      res.headers['set-cookie'].forEach((x) => {
        if (x.startsWith('connect')) {
          cookie = x.split(';')[0];
        }
      });
    });

    it('should allow MFA setup when authenticated', async function () {
      const res = await chai.request(app)
        .post('/api/auth/mfa/setup')
        .set('Cookie', `${cookie}`);
      
      res.should.have.status(200);
      res.body.should.have.property('secret');
      res.body.should.have.property('otpauth_url');
      
      // Save the secret for later tests
      mfaSecret = res.body.secret;
    });

    it('should generate QR code for MFA setup', async function () {
      const res = await chai.request(app)
        .get('/api/auth/mfa/qrcode')
        .set('Cookie', `${cookie}`);
      
      res.should.have.status(200);
      res.body.should.have.property('qrcode');
    });

    it('should verify and enable MFA with valid token', async function () {
      // Generate a valid TOTP token using the secret
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const res = await chai.request(app)
        .post('/api/auth/mfa/verify')
        .set('Cookie', `${cookie}`)
        .send({ token });
      
      res.should.have.status(200);
      res.body.should.have.property('success').eql(true);
      
      // Verify MFA is enabled for the user
      const user = await db.findUser(testUser);
      expect(user.mfaEnabled).to.be.true;
      expect(user.mfaSecret).to.equal(mfaSecret);
    });

    it('should reject invalid MFA tokens', async function () {
      const res = await chai.request(app)
        .post('/api/auth/mfa/verify')
        .set('Cookie', `${cookie}`)
        .send({ token: '123456' });
      
      res.should.have.status(400);
    });
  });

  describe('Login with MFA', async function () {
    let mfaCookie;
    
    before(async function () {
      // Ensure we're logged out
      await chai.request(app).post('/api/auth/logout').set('Cookie', `${cookie}`);
    });

    it('should require MFA verification after password login', async function () {
      const res = await chai.request(app).post('/api/auth/login').send({
        username: testUser,
        password: testPassword,
      });

      res.should.have.status(200);
      res.body.should.have.property('requireMFA').eql(true);

      // Get the connect cookie for MFA validation
      res.headers['set-cookie'].forEach((x) => {
        if (x.startsWith('connect')) {
          mfaCookie = x.split(';')[0];
          cookie = mfaCookie; // Update the global cookie
        }
      });
    });

    it('should reject invalid MFA tokens during login', async function () {
      const res = await chai.request(app)
        .post('/api/auth/mfa/validate')
        .set('Cookie', `${mfaCookie}`)
        .send({ token: '123456' });
      
      res.should.have.status(400);
    });

    it('should complete login with valid MFA token', async function () {
      // Generate a valid TOTP token
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const res = await chai.request(app)
        .post('/api/auth/mfa/validate')
        .set('Cookie', `${mfaCookie}`)
        .send({ token });
      
      res.should.have.status(200);
      res.body.should.have.property('success').eql(true);
      
      // Get the updated cookie if it changed
      if (res.headers['set-cookie']) {
        res.headers['set-cookie'].forEach((x) => {
          if (x.startsWith('connect')) {
            mfaCookie = x.split(';')[0];
            cookie = mfaCookie; // Update the global cookie
          }
        });
      }
    });

    it('should now be able to access protected resources', async function () {
      const res = await chai.request(app)
        .get('/api/auth/profile')
        .set('Cookie', `${mfaCookie}`);
      
      res.should.have.status(200);
    });
  });

  describe('Disable MFA', async function () {
    // For this test, we'll manually disable MFA in the database
    it('should disable MFA when directly updating the database', async function () {
      // Directly disable MFA in the database
      const user = await db.findUser(testUser);
      user.mfaEnabled = false;
      user.mfaSecret = null;
      await db.updateUser(user);
      
      // Verify MFA is disabled for the user
      const updatedUser = await db.findUser(testUser);
      expect(updatedUser.mfaEnabled).to.be.false;
      expect(updatedUser.mfaSecret).to.be.null;
    });

    it('should login without MFA after disabling', async function () {
      // Logout first to ensure clean state
      await chai.request(app).post('/api/auth/logout').set('Cookie', `${cookie}`);
      
      // Login again
      const res = await chai.request(app).post('/api/auth/login').send({
        username: testUser,
        password: testPassword,
      });

      res.should.have.status(200);
      // Since we've disabled MFA, we should not get requireMFA in the response
      res.body.should.not.have.property('requireMFA');
      res.body.should.have.property('message').eql('success');
    });
  });

  after(async function () {
    await db.deleteUser(testUser);
    await service.httpServer.close();
  });
});
