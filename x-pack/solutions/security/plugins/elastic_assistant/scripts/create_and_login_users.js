/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Script to create and log in multiple test users in Elasticsearch and Kibana.
 *
 * This script uses Axios to interact with Elasticsearch's security API to create users
 * and Puppeteer to automate logging into Kibana. It generates random user data using Faker.
 */

const axios = require('axios');
const puppeteer = require('puppeteer');
const { faker } = require('@faker-js/faker');

// CLI arg: number of users to create. Defaults to 10 if not provided.
const totalUsers = parseInt(process.argv[2], 10) || 10;

// Elasticsearch and Kibana configuration
const elasticUrl = 'http://localhost:9200';
const kibanaUrl = 'http://localhost:5601/kbn';
const elasticAuth = {
  username: 'elastic',
  password: 'changeme',
};

/**
 * Creates a user in Elasticsearch.
 *
 * @param {string} username - The username of the user to create.
 * @param {string} fullName - The full name of the user.
 */
const createUser = async (username, fullName) => {
  const url = `${elasticUrl}/_security/user/${username}`;
  try {
    await axios.put(
      url,
      {
        password: 'changeme',
        roles: ['superuser'],
        full_name: fullName,
      },
      {
        auth: elasticAuth,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    console.log(`✅ Created user ${username} (${fullName})`);
  } catch (err) {
    if (err.response?.status === 409) {
      console.log(`ℹ️  User ${username} already exists`);
    } else {
      console.error(`❌ Failed to create ${username}:`, err.response?.data || err.message);
    }
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
 * Example:
 * node x-pack/solutions/security/plugins/elastic_assistant/scripts/create_and_login_users.js 35
 */
(async () => {
  console.log(`🚀 Creating ${totalUsers} test users...\n`);

  for (let i = 0; i < totalUsers; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const username = toUsername(firstName, lastName);

    await createUser(username, fullName);
    await loginUser(username);
  }

  console.log('\n🎉 Done creating and logging in all users.');
})();
