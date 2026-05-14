/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fetchEntityEnrichment } from './fetch_entity_enrichment';
import type { Logger } from '@kbn/core/server';

describe('fetchEntityEnrichment', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  let logger: Logger;

  beforeEach(() => {
    logger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;
  });

  afterEach(() => jest.resetAllMocks());

  it('returns empty map when entityIds is empty', async () => {
    const result = await fetchEntityEnrichment(esClient, logger, [], 'default');
    expect(result.size).toBe(0);
    expect(esClient.asInternalUser.indices.exists).not.toHaveBeenCalled();
  });

  it('returns empty map when entity store index does not exist', async () => {
    (esClient.asInternalUser.indices as jest.Mocked<any>).exists = jest
      .fn()
      .mockResolvedValueOnce(false);

    const result = await fetchEntityEnrichment(esClient, logger, ['user:alice'], 'default');
    expect(result.size).toBe(0);
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
  });

  it('returns enrichment data for known entity IDs', async () => {
    (esClient.asInternalUser.indices as jest.Mocked<any>).exists = jest
      .fn()
      .mockResolvedValueOnce(true);

    (esClient.asInternalUser.helpers.esql as unknown as jest.Mock).mockReturnValue({
      toRecords: jest.fn().mockResolvedValue({
        records: [
          {
            'entity.id': 'user:alice',
            'entity.name': 'Alice',
            'entity.type': 'user',
            'entity.sub_type': 'okta_user',
            'entity.EngineMetadata.Type': 'ecs',
            'host.ip': null,
          },
        ],
      }),
    });

    const result = await fetchEntityEnrichment(esClient, logger, ['user:alice'], 'default');
    expect(result.get('user:alice')).toEqual({
      name: 'Alice',
      type: 'user',
      subType: 'okta_user',
      engineType: 'ecs',
      hostIps: [],
    });
  });

  it('chunks 101 entity IDs into two queries', async () => {
    (esClient.asInternalUser.indices as jest.Mocked<any>).exists = jest
      .fn()
      .mockResolvedValue(true);

    (esClient.asInternalUser.helpers.esql as unknown as jest.Mock).mockReturnValue({
      toRecords: jest.fn().mockResolvedValue({ records: [] }),
    });

    const ids = Array.from({ length: 101 }, (_, i) => `user:entity${i}`);
    await fetchEntityEnrichment(esClient, logger, ids, 'default');
    expect(esClient.asInternalUser.helpers.esql).toHaveBeenCalledTimes(2);
  });

  it('returns partial map when one chunk fails', async () => {
    (esClient.asInternalUser.indices as jest.Mocked<any>).exists = jest
      .fn()
      .mockResolvedValue(true);

    (esClient.asInternalUser.helpers.esql as unknown as jest.Mock)
      .mockReturnValueOnce({
        toRecords: jest.fn().mockRejectedValue(new Error('ES error')),
      })
      .mockReturnValue({
        toRecords: jest.fn().mockResolvedValue({ records: [] }),
      });

    const ids = Array.from({ length: 101 }, (_, i) => `user:entity${i}`);
    const result = await fetchEntityEnrichment(esClient, logger, ids, 'default');
    // Should not throw, should return partial (empty) map
    expect(result).toBeInstanceOf(Map);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('handles array host.ip values', async () => {
    (esClient.asInternalUser.indices as jest.Mocked<any>).exists = jest
      .fn()
      .mockResolvedValueOnce(true);

    (esClient.asInternalUser.helpers.esql as unknown as jest.Mock).mockReturnValue({
      toRecords: jest.fn().mockResolvedValue({
        records: [
          {
            'entity.id': 'host:myhost',
            'entity.name': 'myhost',
            'entity.type': 'host',
            'entity.sub_type': null,
            'entity.EngineMetadata.Type': null,
            'host.ip': ['192.168.1.1', '10.0.0.1'],
          },
        ],
      }),
    });

    const result = await fetchEntityEnrichment(esClient, logger, ['host:myhost'], 'default');
    expect(result.get('host:myhost')?.hostIps).toEqual(['192.168.1.1', '10.0.0.1']);
  });

  it('returns empty map when index existence check throws', async () => {
    (esClient.asInternalUser.indices as jest.Mocked<any>).exists = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchEntityEnrichment(esClient, logger, ['user:alice'], 'default');
    expect(result.size).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to check'));
  });
});
