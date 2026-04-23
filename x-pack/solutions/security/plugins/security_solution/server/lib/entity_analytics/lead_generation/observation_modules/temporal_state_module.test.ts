/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createTemporalStateModule } from './temporal_state_module';
import type { LeadEntity } from '../types';
import { PRIVILEGED_USER_WATCHLIST_ID } from './utils';

const createPrivilegedEntity = (type: string, name: string): LeadEntity => ({
  record: {
    entity: {
      id: `${type}:${name}`,
      name,
      type,
      attributes: { watchlists: [PRIVILEGED_USER_WATCHLIST_ID] },
    },
  } as never,
  type,
  name,
});

const createNonPrivilegedEntity = (type: string, name: string): LeadEntity => ({
  record: {
    entity: { id: `${type}:${name}`, name, type, attributes: { watchlists: [] } },
  } as never,
  type,
  name,
});

const mockSnapshotResponse = (buckets: Array<{ key: string; wasPrivileged: boolean }>) => ({
  hits: { hits: [] },
  aggregations: {
    by_entity: {
      buckets: buckets.map((b) => ({
        key: b.key,
        oldest_snapshot: {
          hits: {
            hits: [
              {
                _source: {
                  entity: {
                    id: b.key,
                    attributes: {
                      watchlists: b.wasPrivileged ? [PRIVILEGED_USER_WATCHLIST_ID] : [],
                    },
                  },
                },
              },
            ],
          },
        },
      })),
    },
  },
});

describe('TemporalStateModule', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  const spaceId = 'default';

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.search.mockResolvedValue({ hits: { hits: [] }, aggregations: {} } as never);
  });

  it('is always enabled', () => {
    const module = createTemporalStateModule({ esClient, logger, spaceId });
    expect(module.isEnabled()).toBe(true);
  });

  it('exposes module weight for weighted scoring', () => {
    const module = createTemporalStateModule({ esClient, logger, spaceId });
    expect(module.config.weight).toBe(0.25);
  });

  it('detects privilege escalation when entity was not privileged historically', async () => {
    const entity = createPrivilegedEntity('user', 'alice');
    esClient.search.mockResolvedValue(
      mockSnapshotResponse([{ key: 'alice', wasPrivileged: false }]) as never
    );

    const module = createTemporalStateModule({ esClient, logger, spaceId });
    const observations = await module.collect([entity]);

    expect(observations).toHaveLength(1);
    expect(observations[0].type).toBe('privilege_escalation');
    expect(observations[0].severity).toBe('high');
    expect(observations[0].entityId).toBe('user:alice');
  });

  it('queries by entity type name field (e.g. user.name)', async () => {
    const entity = createPrivilegedEntity('user', 'alice');
    esClient.search.mockResolvedValue(
      mockSnapshotResponse([{ key: 'alice', wasPrivileged: false }]) as never
    );

    const module = createTemporalStateModule({ esClient, logger, spaceId });
    await module.collect([entity]);

    const searchCall = esClient.search.mock.calls[0][0] as Record<string, unknown>;
    const query = searchCall.query as { bool: { filter: Array<Record<string, unknown>> } };
    expect(query.bool.filter).toEqual([{ terms: { 'user.name': ['alice'] } }]);
  });

  it('does not produce observation when entity was already privileged', async () => {
    const entity = createPrivilegedEntity('user', 'always-admin');
    esClient.search.mockResolvedValue(
      mockSnapshotResponse([{ key: 'always-admin', wasPrivileged: true }]) as never
    );

    const module = createTemporalStateModule({ esClient, logger, spaceId });
    const observations = await module.collect([entity]);

    expect(observations).toHaveLength(0);
  });

  it('skips non-privileged entities entirely', async () => {
    const entity = createNonPrivilegedEntity('user', 'regular');

    const module = createTemporalStateModule({ esClient, logger, spaceId });
    const observations = await module.collect([entity]);

    expect(observations).toHaveLength(0);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('handles multiple entity types with one query per type', async () => {
    const userEntity = createPrivilegedEntity('user', 'alice');
    const hostEntity = createPrivilegedEntity('host', 'server-01');

    esClient.search
      .mockResolvedValueOnce(
        mockSnapshotResponse([{ key: 'alice', wasPrivileged: false }]) as never
      )
      .mockResolvedValueOnce(
        mockSnapshotResponse([{ key: 'server-01', wasPrivileged: false }]) as never
      );

    const module = createTemporalStateModule({ esClient, logger, spaceId });
    const observations = await module.collect([userEntity, hostEntity]);

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(observations).toHaveLength(2);
    expect(observations[0].entityId).toBe('user:alice');
    expect(observations[1].entityId).toBe('host:server-01');
  });

  it('logs warning and returns empty when ES query fails', async () => {
    const entity = createPrivilegedEntity('user', 'alice');
    esClient.search.mockRejectedValue(new Error('snapshot index missing'));

    const module = createTemporalStateModule({ esClient, logger, spaceId });
    const observations = await module.collect([entity]);

    expect(observations).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to query privilege history')
    );
  });
});
