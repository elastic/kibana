/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const axios = require('axios');

const KIBANA_URL_WITH_AUTH = 'http://elastic:changeme@localhost:5620';
const DEFAULT_HEADERS = {
  'kbn-xsrf': true,
  'x-elastic-internal-origin': 'Kibana',
};

async function setupProfilingResources() {
  console.log('Setting up Universal profiling resources...');
  try {
    await axios.post(
      `${KIBANA_URL_WITH_AUTH}/api/profiling/setup/es_resources`,
      {},
      { headers: DEFAULT_HEADERS }
    );
    console.log('[Done] Setting up Universal profiling resources.');
  } catch (error) {
    console.error('Error setting up profiling resources:', error.response?.data || error.message);
    throw error;
  }
}

async function checkProfilingStatus() {
  try {
    const response = await axios.get(`${KIBANA_URL_WITH_AUTH}/api/profiling/setup/es_resources`, {
      headers: DEFAULT_HEADERS,
    });
    return response.data;
  } catch (error) {
    console.error('Error checking profiling status:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('Checking profiling status...');
    const status = await checkProfilingStatus();
    console.log('Profiling status:', status);

    if (!status.has_setup) {
      await setupProfilingResources();
    } else {
      console.log('Profiling resources already set up.');
    }

    console.log('Profiling setup complete!');
  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { setupProfilingResources, checkProfilingStatus };
