/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-process-exit */

/**
 * Stress Test Mappings Script -- generated almost entirely by gemini-pro-2.5 via gemini-cli.
 *
 * Updated to include test data for nested fields and multi-fields scenarios to validate
 * the Security Assistant Index Entry form field suggestions fix (issue #239429).
 *
 * The script now creates indices with:
 * - Multi-field examples: keyword fields with text sub-fields (e.g., executable.text)
 * - Nested object examples: complex nested structures with searchable fields at various levels
 * - Original simple and complex field types for comprehensive stress testing
 */

require('../../../../../../src/setup_node_env');
const http = require('http');
const https = require('https');
const readline = require('readline');

function parseArgs() {
  const args = process.argv.slice(2).reduce((acc, arg, i, arr) => {
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = arr[i + 1];
      if (next && !next.startsWith('--')) {
        acc[key] = next;
      } else {
        acc[key] = true;
      }
    }
    return acc;
  }, {});

  if (args.help || args.h) {
    console.log(`
    Elasticsearch Index/Mapping Populator and Cleanup Script

    Usage:
      node stress_test_mappings.js [options]
      node stress_test_mappings.js --cleanup
      node stress_test_mappings.js --delete-by-count <number>

    Description:
      This script stress-tests an Elasticsearch instance by creating a large number
      of indices with many fields. It can also clean up the indices it creates.

    Creation Options:
      --host <url>          Elasticsearch host URL (default: http://localhost:9200)
      --user <username>     Username for basic auth (default: elastic)
      --pass <password>     Password for basic auth (default: changeme)
      --apiKey <key>        API key for authentication (overrides user/pass)
      --indices <number>    Number of indices to create (default: 5000)
      --mappings <number>   Number of mappings per index (default: 5000)
      --maxFields <number>  The max number of fields per index (default: same as --mappings)
      --shards <number>     Number of primary shards per index (default: 1)
      --replicas <number>   Number of replicas per index (default: 0)

    Cleanup & Recovery Options:
      --cleanup             Delete all indices created by this script.
      --delete-by-count <N> Delete the <N> newest stress-test indices.
      --yes                 Bypass confirmation prompt during cleanup.

    Other Options:
      -h, --help            Show this help message
    `);
    process.exit(0);
  }

  return {
    host: args.host || 'http://localhost:9200',
    user: args.user || 'elastic',
    pass: args.pass || 'changeme',
    apiKey: args.apiKey,
    indices: parseInt(args.indices, 10) || 5000,
    mappings: parseInt(args.mappings, 10) || 5000,
    maxFields: parseInt(args.maxFields, 10) || parseInt(args.mappings, 10) || 5000,
    shards: parseInt(args.shards, 10) || 1,
    replicas: parseInt(args.replicas, 10) || 0,
    cleanup: !!args.cleanup,
    deleteByCount: parseInt(args['delete-by-count'], 10) || 0,
    yes: !!args.yes,
  };
}

const config = parseArgs();

const simpleFieldTypes = [
  { type: 'text' },
  { type: 'keyword' },
  { type: 'long' },
  { type: 'integer' },
  { type: 'short' },
  { type: 'byte' },
  { type: 'double' },
  { type: 'float' },
  { type: 'half_float' },
  { type: 'scaled_float', scaling_factor: 100 },
  { type: 'date' },
  { type: 'date_nanos' },
  { type: 'boolean' },
  { type: 'binary' },
  { type: 'geo_point' },
  { type: 'ip' },
  { type: 'completion' },
  { type: 'token_count', analyzer: 'standard' },
];

const complexFieldTypes = [
  { type: 'integer_range' },
  { type: 'float_range' },
  { type: 'long_range' },
  { type: 'double_range' },
  { type: 'date_range' },
  { type: 'geo_shape' },
  { type: 'search_as_you_type' },
  { type: 'dense_vector', dims: 4 },
  { type: 'semantic_text' },
];

// Multi-field examples (keyword with text sub-fields)
const multiFieldExamples = [
  {
    name: 'executable',
    definition: {
      type: 'keyword',
      ignore_above: 1024,
      fields: {
        text: { type: 'text' },
        caseless: { type: 'keyword', normalizer: 'lowercase' },
      },
    },
  },
  {
    name: 'process_name',
    definition: {
      type: 'keyword',
      fields: {
        text: { type: 'text' },
      },
    },
  },
  {
    name: 'file_path',
    definition: {
      type: 'keyword',
      ignore_above: 1024,
      fields: {
        text: { type: 'text' },
      },
    },
  },
];

// Nested object examples
const nestedObjectExamples = [
  {
    name: 'Events',
    definition: {
      type: 'object',
      properties: {
        executable: {
          type: 'keyword',
          ignore_above: 1024,
          fields: {
            text: { type: 'text' },
            caseless: { type: 'keyword', normalizer: 'lowercase' },
          },
        },
        process: {
          type: 'object',
          properties: {
            name: {
              type: 'keyword',
              fields: {
                text: { type: 'text' },
              },
            },
            command_line: { type: 'text' },
            pid: { type: 'long' },
          },
        },
        timestamp: { type: 'date' },
      },
    },
  },
  {
    name: 'user',
    definition: {
      type: 'object',
      properties: {
        name: { type: 'text' },
        email: { type: 'keyword' },
        profile: {
          type: 'object',
          properties: {
            bio: { type: 'text' },
            location: {
              type: 'keyword',
              fields: {
                text: { type: 'text' },
              },
            },
          },
        },
      },
    },
  },
];

function generateIndexBody(numMappings, maxFields, numShards, numReplicas) {
  const properties = {};
  let fieldCount = 0;

  // Add multi-field examples (tests for keyword fields with text sub-fields)
  for (const multiField of multiFieldExamples) {
    if (fieldCount >= numMappings) break;
    properties[multiField.name] = { ...multiField.definition };
    fieldCount++;
  }

  // Add nested object examples (tests for nested properties with searchable fields)
  for (const nestedObj of nestedObjectExamples) {
    if (fieldCount >= numMappings) break;
    properties[nestedObj.name] = { ...nestedObj.definition };
    fieldCount++;
  }

  // Add complex field types
  for (const fieldType of complexFieldTypes) {
    if (fieldCount >= numMappings) break;
    properties[`complex_${fieldType.type}_${fieldCount}`] = { ...fieldType };
    fieldCount++;
  }

  // Fill remaining with simple field types
  while (fieldCount < numMappings) {
    const fieldTypeDefinition = simpleFieldTypes[fieldCount % simpleFieldTypes.length];
    properties[`field_${fieldCount}`] = { ...fieldTypeDefinition };
    fieldCount++;
  }

  return {
    settings: {
      'index.mapping.total_fields.limit': maxFields,
      'index.number_of_shards': numShards,
      'index.number_of_replicas': numReplicas,
    },
    mappings: { properties },
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function makeRequest(method, path, body, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await new Promise((resolve, reject) => {
        const url = new URL(config.host);
        const protocol = url.protocol === 'https:' ? https : http;
        const options = {
          hostname: url.hostname,
          port: url.port,
          path,
          method,
          headers: { 'Content-Type': 'application/json' },
        };

        if (config.apiKey) {
          options.headers.Authorization = `ApiKey ${config.apiKey}`;
        } else if (config.user && config.pass) {
          const auth = `Basic ${Buffer.from(`${config.user}:${config.pass}`).toString('base64')}`;
          options.headers.Authorization = auth;
        }

        const req = protocol.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve({ statusCode: res.statusCode, body: JSON.parse(data || '{}') });
              } catch (e) {
                reject(new Error('Failed to parse JSON response.'));
              }
            } else {
              const err = new Error(`Request failed with status code ${res.statusCode}: ${data}`);
              if (data.includes('resource_already_exists_exception')) {
                err.isAlreadyExists = true;
              }
              if ([429, 503, 504].includes(res.statusCode)) {
                err.isRetryable = true;
              }
              reject(err);
            }
          });
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
      });
    } catch (error) {
      if (error.isAlreadyExists || !error.isRetryable || i === retries - 1) {
        throw error;
      }
      await sleep(delay);
      // eslint-disable-next-line no-param-reassign
      delay *= 2;
    }
  }
}

async function cleanupIndices() {
  console.log('Starting cleanup of stress-test indices...');
  if (!config.yes) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise((resolve) => {
      rl.question(
        'Are you sure you want to delete all indices with the pattern "*-stress-test-index-*"? (y/N) ',
        (answer) => {
          if (answer.toLowerCase() !== 'y') {
            console.log('Cleanup cancelled.');
            process.exit(0);
          }
          rl.close();
          resolve();
        }
      );
    });
  }

  try {
    const { body } = await makeRequest('DELETE', '/*-stress-test-index-*');
    console.log('Cleanup successful:', body);
  } catch (error) {
    if (error.message.includes('404')) {
      console.log('No stress-test indices found to delete.');
    } else {
      console.error('An error occurred during cleanup:', error.message);
      process.exit(1);
    }
  }
}

async function deleteIndicesByCount(count) {
  console.log(`Fetching the ${count} newest stress-test indices to delete...`);
  try {
    const { body } = await makeRequest(
      'GET',
      `/_cat/indices/*-stress-test-index-*?h=index&s=creation.date:desc&format=json`
    );
    const indices = body.map((item) => item.index);

    if (indices.length === 0) {
      console.log('No stress-test indices found to delete.');
      return;
    }

    const batchToDelete = indices.slice(0, count);
    console.log(`Deleting ${batchToDelete.length} indices: ${batchToDelete.join(', ')}`);
    await makeRequest('DELETE', `/${batchToDelete.join(',')}`);
    console.log('Deletion successful.');
  } catch (e) {
    console.error('\n[FATAL] Could not get or delete indices:', e.message);
    process.exit(1);
  }
}

async function createIndices() {
  console.log('Starting to populate Elasticsearch...');
  console.log('Configuration:', {
    ...config,
    pass: '***',
    apiKey: config.apiKey ? '***' : undefined,
  });

  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let createdCount = 0;
  let skippedCount = 0;
  const total = config.indices;
  const barWidth = 40;

  for (let i = 0; i < total; i++) {
    const indexName = `${alphabet[i % alphabet.length]}-stress-test-index-${String(i).padStart(
      5,
      '0'
    )}`;
    const percent = (i + 1) / total;
    const filledWidth = Math.round(barWidth * percent);
    const bar = `[${'█'.repeat(filledWidth)}${'-'.repeat(barWidth - filledWidth)}]`;
    const percentStr = `${(percent * 100).toFixed(1)}%`;

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`${bar} ${percentStr} | [${i + 1}/${total}] Processing: ${indexName}`);

    const indexBody = generateIndexBody(
      config.mappings,
      config.maxFields,
      config.shards,
      config.replicas
    );

    try {
      await makeRequest('PUT', `/${indexName}`, indexBody);
      createdCount++;
    } catch (error) {
      if (error.isAlreadyExists) {
        skippedCount++;
        // eslint-disable-next-line no-continue
        continue;
      }

      process.stdout.write('\n');
      console.error(`\n[FATAL] Failed while processing index ${indexName}:`, error.message);
      console.error(
        'Exiting due to a critical error. Please check your Elasticsearch cluster status and settings.'
      );

      process.exit(1);
    }
  }
  process.stdout.write('\n');
  console.log(
    `\nPopulation complete. Created: ${createdCount}, Skipped: ${skippedCount}, Total processed: ${
      createdCount + skippedCount
    }.`
  );
}

async function main() {
  if (config.cleanup) {
    await cleanupIndices();
  } else if (config.deleteByCount > 0) {
    await deleteIndicesByCount(config.deleteByCount);
  } else {
    await createIndices();
  }
}

main().catch((err) => {
  console.error('\nAn unexpected error occurred:', err.message);
  process.exit(1);
});
