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

const createPrivilegedEntity = (type: string, name: string): LeadEntity => ({
  record: {
    entity: { id: `euid-${name}`, name, type, attributes: { privileged: true } },
  } as never,
  type,
  name,
  id: `euid-${name}`,
});

const createNonPrivilegedEntity = (type: string, name: string): LeadEntity => ({
  record: {
    entity: { id: `euid-${name}`, name, type, attributes: { privileged: false } },
  } as never,
  type,
  name,
  id: `euid-${name}`,
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
                  entity: { id: b.key, attributes: { privileged: b.wasPrivileged } },
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

  it('detects privilege escalation when entity was not privileged historically', async () => {
    const entity = createPrivilegedEntity('user', 'alice');
    esClient.search.mockResolvedValue(
      mockSnapshotResponse([{ key: 'euid-alice', wasPrivileged: false }]) as never
    );

    const module = createTemporalStateModule({ esClient, logger, spaceId });
    const observations = await module.collect([entity]);

    expect(observations).toHaveLength(1);
    expect(observations[0].type).toBe('privilege_escalation');
    expect(observations[0].severity).toBe('high');
    expect(observations[0].entityId).toBe('user:euid-alice');
  });

  it('queries entity.id (EUID) rather than entity.name or entity.type', async () => {
    const entity = createPrivilegedEntity('user', 'alice');
    esClient.search.mockResolvedValue(
      mockSnapshotResponse([{ key: 'euid-alice', wasPrivileged: false }]) as never
    );

    const module = createTemporalStateModule({ esClient, logger, spaceId });
    await module.collect([entity]);

    const searchCall = esClient.search.mock.calls[0][0] as Record<string, unknown>;
    const query = searchCall.query as { bool: { filter: Array<Record<string, unknown>> } };
    expect(query.bool.filter).toEqual([{ terms: { 'entity.id': ['euid-alice'] } }]);
  });

  it('does not produce observation when entity was already privileged', async () => {
    const entity = createPrivilegedEntity('user', 'always-admin');
    esClient.search.mockResolvedValue(
      mockSnapshotResponse([{ key: 'euid-always-admin', wasPrivileged: true }]) as never
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

  it('handles multiple entity types in a single query', async () => {
    const userEntity = createPrivilegedEntity('user', 'alice');
    const hostEntity = createPrivilegedEntity('host', 'server-01');

    esClient.search.mockResolvedValueOnce(
      mockSnapshotResponse([
        { key: 'euid-alice', wasPrivileged: false },
        { key: 'euid-server-01', wasPrivileged: false },
      ]) as never
    );

    const module = createTemporalStateModule({ esClient, logger, spaceId });
    const observations = await module.collect([userEntity, hostEntity]);

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(observations).toHaveLength(2);
    expect(observations[0].entityId).toBe('user:euid-alice');
    expect(observations[1].entityId).toBe('host:euid-server-01');
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
