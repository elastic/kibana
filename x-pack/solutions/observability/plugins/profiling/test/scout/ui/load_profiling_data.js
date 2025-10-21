/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const fs = require('fs');
const axios = require('axios');

const ES_NODE = 'http://elastic:changeme@localhost:9220';
const PROFILING_DATA_PATH =
  '../../../../test/profiling_cypress/es_archivers/profiling_data_anonymized.json';

async function loadProfilingData() {
  console.log('Loading Universal profiling data...');

  try {
    // Read the profiling data file
    const profilingData = fs.readFileSync(PROFILING_DATA_PATH, 'utf8');

    // Split into operations (each line is a separate operation)
    const operations = profilingData.split('\n').filter((line) => line.trim());

    // Bulk index the data
    const response = await axios.post(`${ES_NODE}/_bulk`, operations.join('\n') + '\n', {
      headers: {
        'Content-Type': 'application/x-ndjson',
      },
      params: {
        refresh: 'wait_for',
        timeout: '1m',
      },
    });

    if (response.data.errors) {
      console.error(
        'Some errors occurred during bulk indexing:',
        response.data.items.filter((item) => item.index?.error)
      );
    } else {
      console.log(`Successfully indexed ${response.data.items.length} profiling documents`);
    }

    console.log('[Done] Loading Universal profiling data.');
  } catch (error) {
    console.error('Error loading profiling data:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  try {
    await loadProfilingData();
    console.log('Profiling data loading complete!');
  } catch (error) {
    console.error('Data loading failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { loadProfilingData };
