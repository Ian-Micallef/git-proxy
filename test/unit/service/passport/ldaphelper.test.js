const chai = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const expect = chai.expect;
const ldapHelper = require('../../../../src/service/passport/ldaphelper');
const config = require('../../../../src/config');

describe('LDAP Helper', () => {
  let axiosGetStub;

  beforeEach(() => {
    // Create a stub for axios.get
    axiosGetStub = sinon.stub();
    sinon.stub(axios, 'create').returns({ get: axiosGetStub });
    
    // Create a stub for config.getAPIs
    sinon.stub(config, 'getAPIs').returns({
      ls: {
        userInADGroup: 'http://example.com/api/users/<id>/domain/<domain>/group/<name>',
      },
    });
  });

  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });

  describe('isUserInAdGroup', () => {
    it('should return true when user is in the group', async () => {
      axiosGetStub.resolves({ data: true });
      const result = await ldapHelper.isUserInAdGroup('user1', 'domain1', 'group1');
      expect(result).to.be.true;
    });

    it('should return false when user is not in the group', async () => {
      axiosGetStub.resolves({ data: false });
      const result = await ldapHelper.isUserInAdGroup('user1', 'domain1', 'group1');
      expect(result).to.be.false;
    });

    it('should return false when API call fails', async () => {
      axiosGetStub.rejects(new Error('API error'));
      const result = await ldapHelper.isUserInAdGroup('user1', 'domain1', 'group1');
      expect(result).to.be.false;
    });
  });

  describe('isUserInAnyAdGroup', () => {
    it('should return true when user is in at least one group', async () => {
      axiosGetStub.onFirstCall().resolves({ data: false });
      axiosGetStub.onSecondCall().resolves({ data: true });
      axiosGetStub.onThirdCall().resolves({ data: false });
      
      const result = await ldapHelper.isUserInAnyAdGroup('user1', 'domain1', ['group1', 'group2', 'group3']);
      expect(result).to.be.true;
    });

    it('should return false when user is not in any group', async () => {
      axiosGetStub.resolves({ data: false });
      const result = await ldapHelper.isUserInAnyAdGroup('user1', 'domain1', ['group1', 'group2']);
      expect(result).to.be.false;
    });

    it('should return false when groups array is empty', async () => {
      const result = await ldapHelper.isUserInAnyAdGroup('user1', 'domain1', []);
      expect(result).to.be.false;
    });

    it('should return false when groups parameter is not an array', async () => {
      const result = await ldapHelper.isUserInAnyAdGroup('user1', 'domain1', 'group1');
      expect(result).to.be.false;
    });
  });

  describe('isUserInAllAdGroups', () => {
    it('should return true when user is in all groups', async () => {
      axiosGetStub.resolves({ data: true });
      const result = await ldapHelper.isUserInAllAdGroups('user1', 'domain1', ['group1', 'group2']);
      expect(result).to.be.true;
    });

    it('should return false when user is not in all groups', async () => {
      axiosGetStub.onFirstCall().resolves({ data: true });
      axiosGetStub.onSecondCall().resolves({ data: false });
      
      const result = await ldapHelper.isUserInAllAdGroups('user1', 'domain1', ['group1', 'group2']);
      expect(result).to.be.false;
    });

    it('should return false when groups array is empty', async () => {
      const result = await ldapHelper.isUserInAllAdGroups('user1', 'domain1', []);
      expect(result).to.be.false;
    });

    it('should return false when groups parameter is not an array', async () => {
      const result = await ldapHelper.isUserInAllAdGroups('user1', 'domain1', 'group1');
      expect(result).to.be.false;
    });
  });
});
