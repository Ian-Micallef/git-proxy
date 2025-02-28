const axios = require('axios');
const thirdpartyApiConfig = require('../../config').getAPIs();
const client = axios.create({
  responseType: 'json',
  headers: {
    'content-type': 'application/json',
  },
});

const isUserInAdGroup = (id, domain, name) => {
  const url = String(thirdpartyApiConfig.ls.userInADGroup)
    .replace('<domain>', domain)
    .replace('<name>', name)
    .replace('<id>', id);

  console.log(`checking if user is in group ${url}`);
  return client
    .get(url)
    .then((res) => res.data)
    .catch(() => {
      return false;
    });
};

/**
 * Check if a user is in any of the specified AD groups
 * @param {string} id - User ID
 * @param {string} domain - Domain
 * @param {Array<string>} groups - Array of group names to check
 * @return {Promise<boolean>} - True if user is in any of the groups, false otherwise
 */
const isUserInAnyAdGroup = async (id, domain, groups) => {
  if (!Array.isArray(groups) || groups.length === 0) {
    return false;
  }

  try {
    const results = await Promise.all(
      groups.map((group) => isUserInAdGroup(id, domain, group))
    );
    return results.some((result) => result === true);
  } catch (error) {
    console.error(`Error checking user groups: ${error.message}`);
    return false;
  }
};

/**
 * Check if a user is in all of the specified AD groups
 * @param {string} id - User ID
 * @param {string} domain - Domain
 * @param {Array<string>} groups - Array of group names to check
 * @return {Promise<boolean>} - True if user is in all of the groups, false otherwise
 */
const isUserInAllAdGroups = async (id, domain, groups) => {
  if (!Array.isArray(groups) || groups.length === 0) {
    return false;
  }

  try {
    const results = await Promise.all(
      groups.map((group) => isUserInAdGroup(id, domain, group))
    );
    return results.every((result) => result === true);
  } catch (error) {
    console.error(`Error checking user groups: ${error.message}`);
    return false;
  }
};

module.exports = {
  isUserInAdGroup,
  isUserInAnyAdGroup,
  isUserInAllAdGroups,
};
