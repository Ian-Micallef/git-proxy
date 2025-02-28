const Step = require('../../actions').Step;

/**
 * Detect secrets and sensitive patterns in git commits
 * @param {Object} req - Express request object
 * @param {Object} action - Action object
 * @return {Promise<Object>} - Updated action object
 */
const exec = async (req, action) => {
  const step = new Step('detectSecrets');
  step.log('Scanning for secrets and sensitive patterns in commit diff');

  if (!action.diff) {
    step.log('No commit diff found, skipping secrets detection');
    action.addStep(step);
    return action;
  }

  if (typeof action.diff !== 'string') {
    step.log('A non-string value has been captured for the commit diff...');
    step.setError('A non-string value has been captured for the commit diff...');
    action.addStep(step);
    return action;
  }

  // Parse the diff to extract changes
  const changes = parseDiff(action.diff);
  
  // Scan for sensitive patterns
  const results = scanForSecrets(changes);

  if (results.length > 0) {
    step.log('Sensitive information detected in commit');
    
    // Format the error message
    let errorMessage = '\n\n\nYour push has been blocked.\n\n';
    errorMessage += 'Please ensure your code does not contain sensitive information or URLs.\n\n\n';
    
    // Add details for each detected secret
    results.forEach((result, index) => {
      errorMessage += `---------------------------------- #${index + 1} ${result.type} ------------------------------\n`;
      errorMessage += `    Policy Exception Type: ${result.type}\n`;
      errorMessage += `    DETECTED: ${result.literal} \n`;
      errorMessage += `    FILE(S) LOCATED: ${result.file}\n`;
      errorMessage += `    Line(s) of code: ${result.lines}\n\n\n`;
    });
    
    step.setError(errorMessage);
    action.continue = false;
    action.addStep(step);
    return action;
  }

  step.log('No sensitive information detected in commit');
  action.addStep(step);
  return action;
};

/**
 * Parse git diff to extract changes
 * @param {string} diff - Git diff string
 * @return {Array} - Array of change objects
 */
const parseDiff = (diff) => {
  const changes = [];
  const files = diff.split('diff --git');

  for (let i = 1; i < files.length; i++) {
    const file = files[i].trim();
    const fileNameMatch = file.match(/a\/(.+?) b\//);
    if (!fileNameMatch) continue;
    
    const fileName = fileNameMatch[1];
    const hunks = file.split(/^@@.+?@@/m).slice(1);
    
    hunks.forEach(hunk => {
      const lines = hunk.split('\n').filter(line => line.trim() !== '');
      lines.forEach((line, lineIndex) => {
        if (line.startsWith('+') && line.length > 1) {
          changes.push({
            file: fileName,
            content: line,
            lineNumber: lineIndex + 1 // Approximate line number
          });
        }
      });
    });
  }
  
  return changes;
};

/**
 * Scan for secrets and sensitive patterns in changes
 * @param {Array} changes - Array of change objects
 * @return {Array} - Array of detected secrets
 */
const scanForSecrets = (changes) => {
  const results = [];
  
  // Define patterns for common secrets and sensitive information
  const patterns = [
    {
      type: 'AWS (Amazon Web Services) Access Key ID',
      regex: /AKIA[0-9A-Z]{16}/g
    },
    {
      type: 'AWS (Amazon Web Services) Secret Access Key',
      regex: /[0-9a-zA-Z/+]{40}/g
    },
    {
      type: 'GitHub Personal Access Token',
      regex: /ghp_[0-9a-zA-Z]{36}/g
    },
    {
      type: 'GitHub Fine Grained Personal Access Token',
      regex: /github_pat_[0-9a-zA-Z_]{82}/g
    },
    {
      type: 'GitHub Actions Token',
      regex: /ghs_[0-9a-zA-Z]{36}/g
    },
    {
      type: 'Google Cloud Platform API Key',
      regex: /AIza[0-9A-Za-z\-_]{35}/g
    },
    {
      type: 'Google OAuth Access Token',
      regex: /ya29\.[0-9A-Za-z\-_]+/g
    },
    {
      type: 'JSON Web Token (JWT)',
      regex: /eyJ[a-zA-Z0-9]{10,}\.eyJ[a-zA-Z0-9]{10,}\.[a-zA-Z0-9_-]{10,}/g
    },
    {
      type: 'Private Key',
      regex: /-----BEGIN (RSA |DSA |EC |OPENSSH |PGP |)PRIVATE KEY( BLOCK)?-----/g
    },
    {
      type: 'Slack API Token',
      regex: /xox[pbar]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32}/g
    },
    {
      type: 'Stripe API Key',
      regex: /sk_live_[0-9a-zA-Z]{24}/g
    }
  ];
  
  // Scan each change for sensitive patterns
  changes.forEach(change => {
    patterns.forEach(pattern => {
      const matches = change.content.match(pattern.regex);
      if (matches) {
        matches.forEach(match => {
          results.push({
            type: pattern.type,
            literal: match,
            file: change.file,
            lines: change.lineNumber.toString(),
            content: change.content
          });
        });
      }
    });
  });
  
  return results;
};

exec.displayName = 'detectSecrets.exec';
exports.exec = exec;
