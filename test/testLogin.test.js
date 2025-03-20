// Import the dependencies for testing
const chai = require('chai');
const chaiHttp = require('chai-http');
const db = require('../src/db');
const service = require('../src/service');
const speakeasy = require('speakeasy');

chai.use(chaiHttp);
chai.should();
const expect = chai.expect;

describe('auth', async () => {
  let app;
  let cookie;

  before(async function () {
    app = await service.start();
    await db.deleteUser('login-test-user');
  });

  describe('test login / logout', async function () {
    // Test to get all students record
    it('should get 401 not logged in', async function () {
      const res = await chai.request(app).get('/api/auth/profile');

      res.should.have.status(401);
    });

    it('should be able to login with standard authentication', async function () {
      // Ensure admin user doesn't have MFA enabled
      const adminUser = await db.findUser('admin');
      if (adminUser.mfaEnabled) {
        adminUser.mfaEnabled = false;
        adminUser.mfaSecret = null;
        await db.updateUser(adminUser);
      }

      const res = await chai.request(app).post('/api/auth/login').send({
        username: 'admin',
        password: 'admin',
      });

      expect(res).to.have.cookie('connect.sid');
      res.should.have.status(200);
      res.body.should.not.have.property('requireMFA');

      // Get the connect cookie
      res.headers['set-cookie'].forEach((x) => {
        if (x.startsWith('connect')) {
          cookie = x.split(';')[0];
        }
      });
    });

    it('should now be able to access the user login metadata', async function () {
      const res = await chai.request(app).get('/api/auth/userLoggedIn').set('Cookie', `${cookie}`);
      res.should.have.status(200);
    });

    it('should now be able to access the profile', async function () {
      const res = await chai.request(app).get('/api/auth/profile').set('Cookie', `${cookie}`);
      res.should.have.status(200);
    });

    it('should now be able to logout', async function () {
      const res = await chai.request(app).post('/api/auth/logout').set('Cookie', `${cookie}`);
      res.should.have.status(200);
    });

    it('test cannot access profile page', async function () {
      const res = await chai.request(app).get('/api/auth/profile').set('Cookie', `${cookie}`);

      res.should.have.status(401);
    });
    
    it('should handle login with MFA when enabled', async () => {
      // Increase timeout for this test (using function-level timeout in mocha)
      
      // Setup MFA for admin user
      const adminUser = await db.findUser('admin');
      if (!adminUser) {
        // Skip test if admin user doesn't exist
        return;
      }
      
      const secret = speakeasy.generateSecret({ name: 'GitProxy:admin' });
      
      // Make sure MFA fields exist
      if (adminUser.mfaEnabled === undefined) {
        adminUser.mfaEnabled = false;
      }
      if (adminUser.mfaSecret === undefined) {
        adminUser.mfaSecret = null;
      }
      
      // Enable MFA
      adminUser.mfaSecret = secret.base32;
      adminUser.mfaEnabled = true;
      await db.updateUser(adminUser);
      
      try {
        // First login step - should indicate MFA is required
        const loginRes = await chai.request(app).post('/api/auth/login').send({
          username: 'admin',
          password: 'admin',
        });
        
        loginRes.should.have.status(200);
        loginRes.body.should.have.property('requireMFA').eql(true);
        
        // Get the session cookie
        let mfaCookie;
        loginRes.headers['set-cookie'].forEach((x) => {
          if (x.startsWith('connect')) {
            mfaCookie = x.split(';')[0];
          }
        });
        
        // Generate a valid TOTP token
        const token = speakeasy.totp({
          secret: secret.base32,
          encoding: 'base32'
        });
        
        // Complete MFA verification
        const mfaRes = await chai.request(app)
          .post('/api/auth/mfa/validate')
          .set('Cookie', `${mfaCookie}`)
          .send({ token });
        
        mfaRes.should.have.status(200);
        mfaRes.body.should.have.property('success').eql(true);
        
        // Verify we can access protected resources
        const profileRes = await chai.request(app)
          .get('/api/auth/profile')
          .set('Cookie', `${mfaCookie}`);
        
        profileRes.should.have.status(200);
      } finally {
        // Clean up - disable MFA for admin
        adminUser.mfaEnabled = false;
        adminUser.mfaSecret = null;
        await db.updateUser(adminUser);
      }
    });
  });

  after(async function () {
    await service.httpServer.close();
  });
});
