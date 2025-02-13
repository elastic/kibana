/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { Client } = require('@elastic/elasticsearch');
const { faker } = require('@faker-js/faker');

const THREAT_INDEX = 'logs-ti';

/** Drop the index first? */
const CLEANUP_FIRST = true;

/** Adjust this to alter the threat number */
const HOW_MANY_THREATS = 1_000_000;

/** Feed names */
const FEED_NAMES = ['Max', 'Philippe', 'Lukasz', 'Fernanda', 'Drew'];

/**
 * Customizing this is optional, you can skip it
 */
const CHUNK_SIZE = 10_000;
const TO_GENERATE = HOW_MANY_THREATS;

const client = new Client({
  node: 'http://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'changeme',
  },
});

const main = async () => {
  if (await client.indices.exists({ index: THREAT_INDEX })) {
    if (CLEANUP_FIRST) {
      console.log(`deleting index "${THREAT_INDEX}"`);

      await client.indices.delete({ index: THREAT_INDEX });

      await client.indices.create({
        index: THREAT_INDEX,
        mappings: {
          properties: {
            'threat.indicator.type': {
              type: 'keyword',
            },
            'threat.feed.name': {
              type: 'keyword',
            },
            'threat.indicator.url.full': {
              type: 'keyword',
            },
            'threat.indicator.first_seen': {
              type: 'date',
            },
            '@timestamp': {
              type: 'date',
            },
          },
        },
      });
    } else {
      console.info(
        `!!! appending to existing index "${THREAT_INDEX}" !!! (because CLEANUP_FIRST is set to true)`
      );
    }
  } else if (!CLEANUP_FIRST) {
    throw new Error(
      `index "${THREAT_INDEX}" does not exist. run this script with CLEANUP_FIRST set to true or create it some other way first.`
    );
  }

  let pendingCount = TO_GENERATE;

  // When there are threats to generate
  while (pendingCount) {
    const operations = [];

    for (let i = 0; i < CHUNK_SIZE; i++) {
      const RANDOM_OFFSET_WITHIN_ONE_MONTH = Math.floor(Math.random() * 3600 * 24 * 30 * 1000);

      const timestamp = new Date(Date.now() - RANDOM_OFFSET_WITHIN_ONE_MONTH).toISOString();

      operations.push(
        ...[
          { create: { _index: THREAT_INDEX } },
          {
            '@timestamp': timestamp,
            'threat.indicator.first_seen': timestamp,
            'threat.feed.name': FEED_NAMES[Math.ceil(Math.random() * FEED_NAMES.length) - 1],
            'threat.indicator.type': 'url',
            'threat.indicator.url.full': faker.internet.url(),
            'event.type': 'indicator',
            'event.category': 'threat',
          },
        ]
      );

      pendingCount--;

      if (!pendingCount) {
        break;
      }
    }

    await client.bulk({ operations });

    console.info(
      `${operations.length / 2} new threats indexed, ${
        pendingCount ? `${pendingCount} pending` : 'complete'
      }`
    );
  }

  console.info('done, run your tests would you?');
};

main();
