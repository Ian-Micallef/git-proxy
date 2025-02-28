const { PushActionPlugin } = require('../plugin');
const detectSecrets = require('../proxy/processors/push-action/detectSecrets');

/**
 * Plugin to detect secrets and sensitive patterns in git commits
 */
class SecretsDetectionPlugin extends PushActionPlugin {
  constructor() {
    super(detectSecrets.exec);
    this.name = 'SecretsDetectionPlugin';
    this.description = 'Detects secrets and sensitive patterns in git commits';
  }
}

module.exports = new SecretsDetectionPlugin();
