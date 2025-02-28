const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { Action } = require('../../../../../src/proxy/actions/Action');
const detectSecrets = require('../../../../../src/proxy/processors/push-action/detectSecrets');

describe('Detect Secrets Plugin', () => {
  let req;
  let action;

  beforeEach(() => {
    req = {};
    action = new Action();
    action.continue = true;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should skip detection if no diff is present', async () => {
    action.diff = null;
    const result = await detectSecrets.exec(req, action);
    
    expect(result.steps.length).to.equal(1);
    expect(result.steps[0].stepName).to.equal('detectSecrets');
    expect(result.steps[0].error).to.be.false;
    expect(result.continue).to.be.true;
  });

  it('should handle non-string diff values', async () => {
    action.diff = 1337;
    const result = await detectSecrets.exec(req, action);
    
    expect(result.steps.length).to.equal(1);
    expect(result.steps[0].stepName).to.equal('detectSecrets');
    expect(result.steps[0].error).to.be.true;
    expect(result.continue).to.be.true;
  });

  it('should detect AWS access key in diff', async () => {
    action.diff = `diff --git a/config.js b/config.js
index 1234567..abcdefg 100644
--- a/config.js
+++ b/config.js
@@ -1,5 +1,5 @@
 module.exports = {
-  apiKey: 'old-key',
+  apiKey: 'AKIAIOSFODNN7EXAMPLE',
   region: 'us-west-2'
 };`;
    
    const result = await detectSecrets.exec(req, action);
    
    expect(result.steps.length).to.equal(1);
    expect(result.steps[0].stepName).to.equal('detectSecrets');
    expect(result.steps[0].error).to.be.true;
    expect(result.continue).to.be.false;
    expect(result.steps[0].errorMessage).to.include('AWS (Amazon Web Services) Access Key ID');
    expect(result.steps[0].errorMessage).to.include('AKIAIOSFODNN7EXAMPLE');
  });

  it('should detect GitHub token in diff', async () => {
    action.diff = `diff --git a/config.js b/config.js
index 1234567..abcdefg 100644
--- a/config.js
+++ b/config.js
@@ -1,5 +1,5 @@
 module.exports = {
-  token: 'old-token',
+  token: 'ghp_8bad94efbf710a582bd5f14faf01f9a8ac4fa023',
   username: 'user'
 };`;
    
    const result = await detectSecrets.exec(req, action);
    
    expect(result.steps.length).to.equal(1);
    expect(result.steps[0].stepName).to.equal('detectSecrets');
    expect(result.steps[0].error).to.be.true;
    expect(result.continue).to.be.false;
    expect(result.steps[0].errorMessage).to.include('GitHub Personal Access Token');
    expect(result.steps[0].errorMessage).to.include('ghp_8bad94efbf710a582bd5f14faf01f9a8ac4f');
  });

  it('should detect private key in diff', async () => {
    action.diff = `diff --git a/key.pem b/key.pem
index 1234567..abcdefg 100644
--- a/key.pem
+++ b/key.pem
@@ -1,5 +1,5 @@
-old content
+-----BEGIN RSA PRIVATE KEY-----
+content
+-----END RSA PRIVATE KEY-----`;
    
    const result = await detectSecrets.exec(req, action);
    
    expect(result.steps.length).to.equal(1);
    expect(result.steps[0].stepName).to.equal('detectSecrets');
    expect(result.steps[0].error).to.be.true;
    expect(result.continue).to.be.false;
    expect(result.steps[0].errorMessage).to.include('Private Key');
    expect(result.steps[0].errorMessage).to.include('-----BEGIN RSA PRIVATE KEY-----');
  });

  it('should detect multiple secrets in diff', async () => {
    action.diff = `diff --git a/config.js b/config.js
index 1234567..abcdefg 100644
--- a/config.js
+++ b/config.js
@@ -1,5 +1,5 @@
 module.exports = {
-  awsKey: 'old-key',
+  awsKey: 'AKIAIOSFODNN7EXAMPLE',
-  githubToken: 'old-token',
+  githubToken: 'ghp_8bad94efbf710a582bd5f14faf01f9a8ac4fa023',
 };`;
    
    const result = await detectSecrets.exec(req, action);
    
    expect(result.steps.length).to.equal(1);
    expect(result.steps[0].stepName).to.equal('detectSecrets');
    expect(result.steps[0].error).to.be.true;
    expect(result.continue).to.be.false;
    expect(result.steps[0].errorMessage).to.include('AWS (Amazon Web Services) Access Key ID');
    expect(result.steps[0].errorMessage).to.include('AKIAIOSFODNN7EXAMPLE');
    expect(result.steps[0].errorMessage).to.include('GitHub Personal Access Token');
    expect(result.steps[0].errorMessage).to.include('ghp_8bad94efbf710a582bd5f14faf01f9a8ac4f');
  });

  it('should not block diff with no secrets', async () => {
    action.diff = `diff --git a/config.js b/config.js
index 1234567..abcdefg 100644
--- a/config.js
+++ b/config.js
@@ -1,5 +1,5 @@
 module.exports = {
-  debug: false,
+  debug: true,
   logLevel: 'info'
 };`;
    
    const result = await detectSecrets.exec(req, action);
    
    expect(result.steps.length).to.equal(1);
    expect(result.steps[0].stepName).to.equal('detectSecrets');
    expect(result.steps[0].error).to.be.false;
    expect(result.continue).to.be.true;
  });
});
