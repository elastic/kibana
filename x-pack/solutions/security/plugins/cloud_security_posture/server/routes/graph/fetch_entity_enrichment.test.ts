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
    const result = await fetchEntityEnrichment(esClient, logger, [], 'default', true);
    expect(result.size).toBe(0);
    expect(esClient.asInternalUser.helpers.esql).not.toHaveBeenCalled();
  });

  it('returns empty map when entity store index does not exist', async () => {
    const result = await fetchEntityEnrichment(esClient, logger, ['user:alice'], 'default', false);
    expect(result.size).toBe(0);
    // Existence is decided upstream; this function no longer calls indices.exists itself
    expect(esClient.asInternalUser.helpers.esql).not.toHaveBeenCalled();
  });

  it('returns enrichment data for known entity IDs', async () => {
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

    const result = await fetchEntityEnrichment(esClient, logger, ['user:alice'], 'default', true);
    const enrichment = result.get('user:alice');
    expect(enrichment?.name).toBe('Alice');
    expect(enrichment?.type).toBe('user');
    expect(enrichment?.subType).toBe('okta_user');
    expect(enrichment?.engineType).toBe('ecs');
    expect(enrichment?.hostIps).toEqual([]);
  });

  it('builds typed sourceFields for user entities', async () => {
    (esClient.asInternalUser.helpers.esql as unknown as jest.Mock).mockReturnValue({
      toRecords: jest.fn().mockResolvedValue({
        records: [
          {
            'entity.id': 'user:alice@example.com',
            'entity.name': 'Alice',
            'entity.type': 'user',
            'entity.sub_type': null,
            'entity.EngineMetadata.Type': null,
            'host.ip': null,
            'user.email': 'alice@example.com',
            'user.id': 'alice',
            'user.name': 'alice',
            'user.domain': null,
            'host.id': null,
            'host.name': null,
            'service.name': null,
          },
        ],
      }),
    });

    const result = await fetchEntityEnrichment(
      esClient,
      logger,
      ['user:alice@example.com'],
      'default',
      true
    );
    const enrichment = result.get('user:alice@example.com');
    expect(enrichment?.sourceFields).toBeDefined();
    expect(enrichment?.sourceFields?.['user.email']).toBe('alice@example.com');
    expect(enrichment?.sourceFields?.['user.id']).toBe('alice');
    expect(enrichment?.sourceFields?.['user.name']).toBe('alice');
    // Null fields are excluded
    expect(enrichment?.sourceFields?.['user.domain']).toBeUndefined();
    // Non-user fields are excluded for user entities
    expect(enrichment?.sourceFields?.['service.name']).toBeUndefined();
  });

  it('builds typed sourceFields for host entities', async () => {
    (esClient.asInternalUser.helpers.esql as unknown as jest.Mock).mockReturnValue({
      toRecords: jest.fn().mockResolvedValue({
        records: [
          {
            'entity.id': 'host:my-server',
            'entity.name': 'my-server',
            'entity.type': 'host',
            'entity.sub_type': null,
            'entity.EngineMetadata.Type': null,
            'host.ip': null,
            'host.id': 'my-server',
            'host.name': 'my-server',
            'host.hostname': 'my-server.example.com',
            'user.email': null,
            'user.id': null,
          },
        ],
      }),
    });

    const result = await fetchEntityEnrichment(
      esClient,
      logger,
      ['host:my-server'],
      'default',
      true
    );
    const enrichment = result.get('host:my-server');
    expect(enrichment?.sourceFields?.['host.id']).toBe('my-server');
    expect(enrichment?.sourceFields?.['host.name']).toBe('my-server');
    expect(enrichment?.sourceFields?.['host.hostname']).toBe('my-server.example.com');
    // User fields excluded for host entities
    expect(enrichment?.sourceFields?.['user.email']).toBeUndefined();
  });

  it('omits sourceFields entirely when all source columns are null', async () => {
    (esClient.asInternalUser.helpers.esql as unknown as jest.Mock).mockReturnValue({
      toRecords: jest.fn().mockResolvedValue({
        records: [
          {
            'entity.id': 'user:alice',
            'entity.name': 'Alice',
            'entity.type': 'user',
            'entity.sub_type': null,
            'entity.EngineMetadata.Type': null,
            'host.ip': null,
            'user.email': null,
            'user.id': null,
            'user.name': null,
            'user.domain': null,
          },
        ],
      }),
    });

    const result = await fetchEntityEnrichment(esClient, logger, ['user:alice'], 'default', true);
    const enrichment = result.get('user:alice');
    expect(enrichment?.sourceFields).toBeUndefined();
  });

  it('chunks 101 entity IDs into two queries', async () => {
    (esClient.asInternalUser.helpers.esql as unknown as jest.Mock).mockReturnValue({
      toRecords: jest.fn().mockResolvedValue({ records: [] }),
    });

    const ids = Array.from({ length: 101 }, (_, i) => `user:entity${i}`);
    await fetchEntityEnrichment(esClient, logger, ids, 'default', true);
    expect(esClient.asInternalUser.helpers.esql).toHaveBeenCalledTimes(2);
  });

  it('returns partial map when one chunk fails', async () => {
    (esClient.asInternalUser.helpers.esql as unknown as jest.Mock)
      .mockReturnValueOnce({
        toRecords: jest.fn().mockRejectedValue(new Error('ES error')),
      })
      .mockReturnValue({
        toRecords: jest.fn().mockResolvedValue({ records: [] }),
      });

    const ids = Array.from({ length: 101 }, (_, i) => `user:entity${i}`);
    const result = await fetchEntityEnrichment(esClient, logger, ids, 'default', true);
    // Should not throw, should return partial (empty) map
    expect(result).toBeInstanceOf(Map);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('handles array host.ip values', async () => {
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

    const result = await fetchEntityEnrichment(esClient, logger, ['host:myhost'], 'default', true);
    expect(result.get('host:myhost')?.hostIps).toEqual(['192.168.1.1', '10.0.0.1']);
  });

  it('first-seen value wins when entity.id appears twice', async () => {
    (esClient.asInternalUser.helpers.esql as unknown as jest.Mock).mockReturnValue({
      toRecords: jest.fn().mockResolvedValue({
        records: [
          {
            'entity.id': 'user:alice',
            'entity.name': 'First Alice',
            'entity.type': 'user',
            'entity.sub_type': null,
            'entity.EngineMetadata.Type': null,
            'host.ip': null,
          },
          {
            'entity.id': 'user:alice',
            'entity.name': 'Second Alice',
            'entity.type': 'user',
            'entity.sub_type': null,
            'entity.EngineMetadata.Type': null,
            'host.ip': null,
          },
        ],
      }),
    });

    const result = await fetchEntityEnrichment(esClient, logger, ['user:alice'], 'default', true);
    expect(result.get('user:alice')?.name).toBe('First Alice');
  });

  it('uses parameterized query format', async () => {
    (esClient.asInternalUser.helpers.esql as unknown as jest.Mock).mockReturnValue({
      toRecords: jest.fn().mockResolvedValue({ records: [] }),
    });

    await fetchEntityEnrichment(esClient, logger, ['user:alice'], 'default', true);

    const esqlCallArgs = (esClient.asInternalUser.helpers.esql as unknown as jest.Mock).mock
      .calls[0];
    const callArg = esqlCallArgs[0];
    // Query should use parameter placeholders, not embedded IDs
    expect(callArg.query).toContain('?entityId0');
    expect(callArg.query).not.toContain('"user:alice"');
    // Params should carry the actual ID values
    expect(callArg.params).toEqual([{ entityId0: 'user:alice' }]);
  });
});
