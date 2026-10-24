/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import {
  ensureFingerprintIndexMapping,
  FINGERPRINT_INDEX_MAPPINGS,
} from './ensure_fingerprint_index';

const logger = {
  warn: jest.fn(),
} as unknown as Logger;

const privileges = (
  FINGERPRINT_INDEX_MAPPINGS.properties?.permissions as {
    properties: { kibana: { properties: { privileges: { type: string } } } };
  }
).properties.kibana.properties.privileges;

describe('ensureFingerprintIndexMapping', () => {
  it('creates the index with a nested space privilege', async () => {
    const create = jest.fn().mockResolvedValue({ acknowledged: true });
    const esClient = {
      indices: {
        exists: jest.fn().mockResolvedValue(false),
        create,
        getMapping: jest.fn(),
        putMapping: jest.fn(),
      },
    } as unknown as ElasticsearchClient;

    await ensureFingerprintIndexMapping(esClient, logger);

    expect(privileges.type).toBe('nested');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-idx-security-attack-fingerprints',
        mappings: FINGERPRINT_INDEX_MAPPINGS,
      })
    );
  });
});
