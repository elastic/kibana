/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Script to create and log in multiple test users in Elasticsearch and Kibana.
 *
 * This script uses native fetch to interact with Elasticsearch's security API to create users
 * and Puppeteer to automate logging into Kibana. It generates random user data using Faker.
 */

const puppeteer = require('puppeteer');
const { faker } = require('@faker-js/faker');
const { SECURITY_FEATURE_ID } = require('../common/constants');

// CLI args: number of users to create and optional --no-assistant flag
const args = process.argv.slice(2);
const totalUsers =
  parseInt(
    args.find((arg) => !arg.startsWith('--')),
    10
  ) || 10;
const noAssistant = args.includes('--no-assistant');

// Elasticsearch and Kibana configuration
const elasticUrl = 'http://localhost:9200';
const kibanaUrl = 'http://localhost:5601/kbn';
const elasticBasicAuth = `Basic ${Buffer.from('elastic:changeme').toString('base64')}`;

/**
 * Creates a restricted role that denies access to the Security Assistant.
 *
 * @param {string} roleName - The name of the role to create.
 */
const createRestrictedRole = async (roleName) => {
  const url = `${kibanaUrl}/api/security/role/${roleName}`;

  // First check if the role already exists
  try {
    const checkResponse = await fetch(url, {
      headers: { Authorization: elasticBasicAuth, 'Content-Type': 'application/json' },
    });

    if (checkResponse.ok) {
      console.log(`ℹ️  Role ${roleName} already exists`);
      return;
    }
    // Role doesn't exist, continue to create it
    if (checkResponse.status !== 404) {
      const body = await checkResponse.text();
      console.error(`❌ Error checking role ${roleName}:`, body);
      return new Error(body);
    }
  } catch (err) {
    console.error(`❌ Error checking role ${roleName}:`, err.message);
    return err;
  }

  try {
    const createResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: elasticBasicAuth,
        'Content-Type': 'application/json',
        'kbn-xsrf': 'xsrf',
      },
      body: JSON.stringify({
        description: '',
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: {
              searchSynonyms: ['all'],
              searchQueryRules: ['all'],
              enterpriseSearch: ['all'],
              searchPlayground: ['all'],
              searchInferenceEndpoints: ['all'],
              enterpriseSearchApplications: ['all'],
              enterpriseSearchAnalytics: ['all'],
              discover_v2: ['all'],
              dashboard_v2: ['all'],
              canvas: ['all'],
              maps_v2: ['all'],
              ml: ['all'],
              graph: ['all'],
              streams: ['all'],
              logs: ['all'],
              visualize_v2: ['all'],
              infrastructure: ['all'],
              apm: ['all'],
              agentBuilder: ['all'],
              uptime: ['all'],
              observabilityCasesV3: ['all'],
              [SECURITY_FEATURE_ID]: ['all'],
              rules: ['all'],
              securitySolutionCasesV3: ['all'],
              securitySolutionTimeline: ['all'],
              securitySolutionNotes: ['all'],
              slo: ['all'],
              dev_tools: ['all'],
              securitySolutionAttackDiscovery: ['all'],
              securitySolutionSiemMigrations: ['all'],
              advancedSettings: ['all'],
              indexPatterns: ['all'],
              filesManagement: ['all'],
              filesSharedImage: ['all'],
              savedObjectsManagement: ['all'],
              savedQueryManagement: ['all'],
              savedObjectsTagging: ['all'],
              osquery: ['all'],
              actions: ['all'],
              generalCasesV3: ['all'],
              observabilityAIAssistant: ['all'],
              aiAssistantManagementSelection: ['all'],
              guidedOnboardingFeature: ['all'],
              rulesSettings: ['all'],
              maintenanceWindow: ['all'],
              stackAlerts: ['all'],
              manageReporting: ['all'],
              fleetv2: ['all'],
              fleet: ['all'],
              dataQuality: ['all'],
            },
          },
        ],
      }),
    });
    if (!createResponse.ok) {
      const body = await createResponse.text();
      console.error(`❌ Failed to create role ${roleName}:`, body);
      return new Error(body);
    }
    console.log(`✅ Created restricted role ${roleName}`);
  } catch (err) {
    console.error(`❌ Failed to create role ${roleName}:`, err.message);
    return err;
  }
};

/**
 * Creates a user in Elasticsearch.
 *
 * @param {string} username - The username of the user to create.
 * @param {string} fullName - The full name of the user.
 * @param {boolean} restricted - Whether to create a user with restricted Security Assistant access.
 */
const createUser = async (username, fullName, restricted = false) => {
  // If creating a restricted user, first ensure the restricted role exists
  const restrictedRoleName = 'security_assistant_restricted';
  if (restricted) {
    await createRestrictedRole(restrictedRoleName);
  }

  const url = `${elasticUrl}/_security/user/${username}`;
  try {
    const userResponse = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: elasticBasicAuth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: 'changeme',
        roles: restricted ? [restrictedRoleName] : ['superuser'],
        full_name: fullName,
        email: `${username}@elastic.co`,
      }),
    });
    if (userResponse.ok) {
      console.log(
        `✅ Created user ${username} (${fullName})${
          restricted ? ' with Security Assistant restrictions' : ''
        }`
      );
    } else if (userResponse.status === 409) {
      console.log(`ℹ️  User ${username} already exists`);
    } else {
      console.error(`❌ Failed to create ${username}:`, await userResponse.text());
    }
  } catch (err) {
    console.error(`❌ Failed to create ${username}:`, err.message);
  }
};

/**
 * Logs a user into Kibana using Puppeteer.
 *
 * @param {string} username - The username of the user to log in.
 */
const loginUser = async (username) => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  try {
    await page.goto(`${kibanaUrl}/login`, { waitUntil: 'networkidle0' });
    await page.type('input[name="username"]', username);
    await page.type('input[name="password"]', 'changeme');

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    console.log(`✅ Logged in as ${username}`);
  } catch (err) {
    console.error(`❌ Failed login for ${username}:`, err.message);
  } finally {
    await browser.close();
  }
};

/**
 * Generates a username from a first and last name.
 *
 * @param {string} first - The first name.
 * @param {string} last - The last name.
 * @returns {string} - A sanitized username.
 */
const toUsername = (first, last) => {
  return `test_${first.toLowerCase()}_${last.toLowerCase()}`.replace(/[^a-z0-9_]/g, '');
};

/**
 * Main function to create and log in multiple test users.
 *
 * Generates random user data using Faker, creates users in Elasticsearch,
 * and logs them into Kibana.
 *
 * Run the script with Node.js, optionally specifying the number of users to create (default is 10):
 * Examples:
 * node x-pack/solutions/security/plugins/elastic_assistant/scripts/create_and_login_users.js 35
 * node x-pack/solutions/security/plugins/elastic_assistant/scripts/create_and_login_users.js 1 --no-assistant
 */
(async () => {
  console.log(
    `🚀 Creating ${totalUsers} test users${
      noAssistant ? ' with Security Assistant restrictions' : ''
    }...\n`
  );

  for (let i = 0; i < totalUsers; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const username = toUsername(firstName, lastName);

    await createUser(username, fullName, noAssistant);
    await loginUser(username);
  }

  console.log('\n🎉 Done creating and logging in all users.');
})();
