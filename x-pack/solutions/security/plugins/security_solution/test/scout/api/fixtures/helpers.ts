/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

const TEST_INDEX_PREFIX = 'scout-siem-readiness-test';

/**
 * Creates a test index with sample event data for SIEM Readiness tests
 */
export const seedTestEventData = async (
  esClient: Client,
  indexName: string,
  eventCategory: string | string[],
  docCount: number = 10
): Promise<void> => {
  const categories = Array.isArray(eventCategory) ? eventCategory : [eventCategory];

  const operations = [];
  for (let i = 0; i < docCount; i++) {
    operations.push({ index: { _index: indexName } });
    operations.push({
      '@timestamp': new Date().toISOString(),
      event: {
        category: categories,
        kind: 'event',
      },
      message: `Test event ${i + 1} for SIEM Readiness`,
    });
  }

  await esClient.bulk({ operations, refresh: true });
};

/**
 * Cleans up test indices created during SIEM Readiness tests
 */
export const cleanupTestIndices = async (esClient: Client): Promise<void> => {
  try {
    await esClient.indices.delete({
      index: `${TEST_INDEX_PREFIX}-*`,
      ignore_unavailable: true,
    });
  } catch {
    // Ignore errors if indices don't exist
  }
};

/**
 * Creates a test data stream for retention tests
 */
export const createTestDataStream = async (
  esClient: Client,
  name: string
): Promise<void> => {
  const templateName = `${name}-template`;

  // Create index template for data stream
  await esClient.indices.putIndexTemplate({
    name: templateName,
    index_patterns: [name],
    data_stream: {},
    template: {
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          message: { type: 'text' },
          event: {
            properties: {
              category: { type: 'keyword' },
            },
          },
        },
      },
    },
  });

  // Create the data stream by indexing a document
  await esClient.index({
    index: name,
    document: {
      '@timestamp': new Date().toISOString(),
      message: 'Initial document to create data stream',
      event: { category: 'test' },
    },
    refresh: true,
  });
};

/**
 * Deletes a test data stream
 */
export const deleteTestDataStream = async (
  esClient: Client,
  name: string
): Promise<void> => {
  const templateName = `${name}-template`;

  try {
    await esClient.indices.deleteDataStream({ name });
  } catch {
    // Ignore if doesn't exist
  }

  try {
    await esClient.indices.deleteIndexTemplate({ name: templateName });
  } catch {
    // Ignore if doesn't exist
  }
};

/**
 * Waits for a condition to be true with polling
 */
export const waitFor = async (
  condition: () => Promise<boolean>,
  timeoutMs: number = 30000,
  intervalMs: number = 1000
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
};
