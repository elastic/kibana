/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { MigrationResources } from '../retrievers/resource_retriever';
import {
  enrichLookupResourcesWithMappings,
  getRuntimeMappingFields,
} from './enrich_lookup_resources';

describe('lookup resource mappings', () => {
  const logger = loggerMock.create();
  const getMapping = jest.fn();
  const esClient = {
    indices: { getMapping },
  } as unknown as ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRuntimeMappingFields', () => {
    it('returns sorted runtime mapping fields', () => {
      expect(
        getRuntimeMappingFields({
          runtime: {
            threat_category: { type: 'keyword' },
            ip: { type: 'ip' },
          },
        })
      ).toEqual([
        { path: 'ip', type: 'ip' },
        { path: 'threat_category', type: 'keyword' },
      ]);
    });

    it('flattens composite runtime fields', () => {
      expect(
        getRuntimeMappingFields({
          runtime: {
            threat: {
              type: 'composite',
              fields: {
                category: { type: 'keyword' },
                score: { type: 'long' },
              },
            },
          },
        })
      ).toEqual([
        { path: 'threat.category', type: 'keyword' },
        { path: 'threat.score', type: 'long' },
      ]);
    });
  });

  describe('enrichLookupResourcesWithMappings', () => {
    it('adds runtime fields to lookup resources by lookup index name', async () => {
      const resources: MigrationResources = {
        lookup: [
          { type: 'lookup', name: 'threat_intel_ip', content: 'lookup_default_threat_intel_ip' },
          { type: 'lookup', name: 'benign_ips', content: 'lookup_default_benign_ips' },
        ],
      };
      getMapping.mockResolvedValue({
        lookup_default_threat_intel_ip: {
          mappings: {
            runtime: {
              ip: { type: 'ip' },
              threat_category: { type: 'keyword' },
            },
          },
        },
        lookup_default_benign_ips: {
          mappings: {
            runtime: {
              ip: { type: 'ip' },
            },
          },
        },
      });

      await expect(
        enrichLookupResourcesWithMappings({ resources, esClient, logger })
      ).resolves.toEqual({
        lookup: [
          {
            type: 'lookup',
            name: 'threat_intel_ip',
            content: 'lookup_default_threat_intel_ip',
            fields: [
              { path: 'ip', type: 'ip' },
              { path: 'threat_category', type: 'keyword' },
            ],
          },
          {
            type: 'lookup',
            name: 'benign_ips',
            content: 'lookup_default_benign_ips',
            fields: [{ path: 'ip', type: 'ip' }],
          },
        ],
      });
      expect(getMapping).toHaveBeenCalledWith({
        index: ['lookup_default_threat_intel_ip', 'lookup_default_benign_ips'],
        allow_no_indices: true,
        ignore_unavailable: true,
      });
    });

    it('skips lookups with empty content and leaves missing mappings unchanged', async () => {
      const resources: MigrationResources = {
        lookup: [
          { type: 'lookup', name: 'empty_lookup', content: '' },
          { type: 'lookup', name: 'deleted_lookup', content: 'lookup_default_deleted' },
        ],
      };
      getMapping.mockResolvedValue({});

      await expect(
        enrichLookupResourcesWithMappings({ resources, esClient, logger })
      ).resolves.toEqual(resources);
    });

    it('returns original resources when mapping lookup fails', async () => {
      const resources: MigrationResources = {
        lookup: [{ type: 'lookup', name: 'threat_intel_ip', content: 'lookup_default_threat' }],
      };
      getMapping.mockRejectedValue(new Error('mapping unavailable'));

      await expect(
        enrichLookupResourcesWithMappings({ resources, esClient, logger })
      ).resolves.toEqual(resources);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to enrich lookup resources with runtime mappings: Error: mapping unavailable'
      );
    });
  });
});
