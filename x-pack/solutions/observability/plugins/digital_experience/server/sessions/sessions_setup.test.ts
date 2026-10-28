/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  SESSIONS_INDEX,
  SESSIONS_MANAGED_BY,
  SESSIONS_PIPELINE_NAME,
  SESSIONS_TRANSFORM_ID,
  SESSIONS_VERSION,
  sessionsTransformId,
  type SessionsSettings,
} from '../../common/sessions';
import {
  SessionsPrivilegesError,
  enableSessions,
  getMissingSessionsPrivileges,
  getSessionsStatus,
  lagSecondsOf,
} from './sessions_setup';
import { buildSessionsTransform } from './sessions_spec';

type ScopedClient = ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
type Client = ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

const NOW = Date.parse('2026-10-27T12:00:00.000Z');
const oneTransform: SessionsSettings = { frequency: '1m', partitions: 1 };

const managedTransform = (
  id: string,
  {
    version = SESSIONS_VERSION,
    frequency = '1m',
    partition = 0,
    destIndex = SESSIONS_INDEX,
  }: { version?: number; frequency?: string; partition?: number; destIndex?: string } = {}
) => ({
  id,
  frequency,
  dest: { index: destIndex },
  _meta: { managed_by: SESSIONS_MANAGED_BY, version, partition },
});

const mockTransforms = (client: Client, transforms: Array<ReturnType<typeof managedTransform>>) =>
  client.transform.getTransform.mockResolvedValue({
    count: transforms.length,
    transforms,
  } as unknown as Awaited<ReturnType<Client['transform']['getTransform']>>);

const mockStats = (client: Client, stats: Array<Record<string, unknown>>) =>
  client.transform.getTransformStats.mockResolvedValue({
    count: stats.length,
    transforms: stats,
  } as unknown as Awaited<ReturnType<Client['transform']['getTransformStats']>>);

/** Idle, green transform that last checked for changes `secondsAgo` seconds before NOW. */
const idleStats = (id: string, secondsAgo = 30, extra: Record<string, unknown> = {}) => ({
  id,
  state: 'started',
  health: { status: 'green' },
  checkpointing: { last: { checkpoint: 3 }, last_search_time: NOW - secondsAgo * 1000 },
  ...extra,
});

const grantAll = (client: Client) =>
  client.security.hasPrivileges.mockResolvedValue({
    has_all_requested: true,
    cluster: {},
    index: {},
    application: {},
    username: 'setup-user',
  });

describe('sessions setup', () => {
  let esClient: ScopedClient;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient();
  });

  describe('getMissingSessionsPrivileges', () => {
    it('lists every missing cluster and index privilege', async () => {
      esClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: false,
        cluster: { manage_transform: false, manage_ingest_pipelines: true },
        index: { 'traces-*.otel-*': { read: false, view_index_metadata: true } },
        application: {},
        username: 'reader',
      });

      expect(await getMissingSessionsPrivileges(esClient.asCurrentUser)).toEqual([
        'cluster:manage_transform',
        'index:traces-*.otel-*:read',
      ]);
    });
  });

  describe('enableSessions', () => {
    it('fails before writing anything when the user lacks privileges', async () => {
      esClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: false,
        cluster: { manage_transform: false },
        index: {},
        application: {},
        username: 'reader',
      });

      await expect(
        enableSessions({ esClient, logger, settings: oneTransform })
      ).rejects.toBeInstanceOf(SessionsPrivilegesError);
      expect(esClient.asSecondaryAuthUser.ingest.putPipeline).not.toHaveBeenCalled();
      expect(esClient.asSecondaryAuthUser.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(esClient.asSecondaryAuthUser.transform.putTransform).not.toHaveBeenCalled();
    });

    it('installs pipeline, template and transform as the requesting user', async () => {
      grantAll(esClient.asCurrentUser);
      mockTransforms(esClient.asSecondaryAuthUser, []);

      await enableSessions({ esClient, logger, settings: oneTransform });

      const client = esClient.asSecondaryAuthUser;
      expect(client.ingest.putPipeline).toHaveBeenCalledWith(
        expect.objectContaining({ id: SESSIONS_PIPELINE_NAME })
      );
      expect(client.indices.putIndexTemplate).toHaveBeenCalled();
      expect(client.transform.putTransform).toHaveBeenCalledWith(
        expect.objectContaining({ transform_id: SESSIONS_TRANSFORM_ID, frequency: '1m' })
      );
      expect(client.transform.startTransform).toHaveBeenCalledWith(
        { transform_id: SESSIONS_TRANSFORM_ID },
        { ignore: [409] }
      );
      expect(esClient.asInternalUser.transform.putTransform).not.toHaveBeenCalled();
    });

    it('installs one transform per partition', async () => {
      grantAll(esClient.asCurrentUser);
      mockTransforms(esClient.asSecondaryAuthUser, []);

      await enableSessions({ esClient, logger, settings: { frequency: '1m', partitions: 4 } });

      const client = esClient.asSecondaryAuthUser;
      const ids = client.transform.putTransform.mock.calls.map(([request]) => request.transform_id);
      expect(ids).toEqual([0, 1, 2, 3].map((partition) => sessionsTransformId(partition, 4)));
      expect(client.transform.startTransform).toHaveBeenCalledTimes(4);
    });

    it('is idempotent: refreshes installed transforms and applies a new frequency', async () => {
      grantAll(esClient.asCurrentUser);
      mockTransforms(esClient.asSecondaryAuthUser, [managedTransform(SESSIONS_TRANSFORM_ID)]);
      mockStats(esClient.asSecondaryAuthUser, [idleStats(SESSIONS_TRANSFORM_ID)]);

      await enableSessions({ esClient, logger, settings: { frequency: '5m', partitions: 1 } });

      const client = esClient.asSecondaryAuthUser;
      expect(client.transform.putTransform).not.toHaveBeenCalled();
      // Everything `_update` accepts, so spec changes reach existing installs; never the pivot.
      const { pivot, ...updatable } = buildSessionsTransform({ frequency: '5m' });
      expect(client.transform.updateTransform).toHaveBeenCalledWith(updatable);
      expect(updatable).toEqual(
        expect.objectContaining({
          source: expect.any(Object),
          dest: expect.any(Object),
          sync: expect.any(Object),
          settings: expect.any(Object),
          retention_policy: expect.any(Object),
          frequency: '5m',
        })
      );
      expect(client.transform.stopTransform).not.toHaveBeenCalled();
      expect(client.transform.startTransform).toHaveBeenCalled();
    });

    it('stops a failed transform before restarting it', async () => {
      grantAll(esClient.asCurrentUser);
      mockTransforms(esClient.asSecondaryAuthUser, [managedTransform(SESSIONS_TRANSFORM_ID)]);
      mockStats(esClient.asSecondaryAuthUser, [{ id: SESSIONS_TRANSFORM_ID, state: 'failed' }]);

      await enableSessions({ esClient, logger, settings: oneTransform });

      expect(esClient.asSecondaryAuthUser.transform.stopTransform).toHaveBeenCalledWith({
        transform_id: SESSIONS_TRANSFORM_ID,
        force: true,
        wait_for_completion: true,
      });
    });

    it('repartitions in place: replaces transforms but keeps the shared dest index', async () => {
      grantAll(esClient.asCurrentUser);
      mockTransforms(esClient.asSecondaryAuthUser, [managedTransform(SESSIONS_TRANSFORM_ID)]);

      await enableSessions({ esClient, logger, settings: { frequency: '1m', partitions: 2 } });

      const client = esClient.asSecondaryAuthUser;
      expect(client.transform.deleteTransform).toHaveBeenCalledWith({
        transform_id: SESSIONS_TRANSFORM_ID,
        force: true,
        delete_dest_index: false,
      });
      expect(client.transform.putTransform).toHaveBeenCalledTimes(2);
    });

    it('replaces a previous version and drops its dest index once', async () => {
      grantAll(esClient.asCurrentUser);
      mockTransforms(esClient.asSecondaryAuthUser, [
        managedTransform('digital-experience-sessions-0-p0of2', {
          version: 0,
          destIndex: 'digital-experience-sessions-0',
        }),
        managedTransform('digital-experience-sessions-0-p1of2', {
          version: 0,
          partition: 1,
          destIndex: 'digital-experience-sessions-0',
        }),
      ]);

      await enableSessions({ esClient, logger, settings: oneTransform });

      expect(
        esClient.asSecondaryAuthUser.transform.deleteTransform.mock.calls.map(
          ([request]) => request.delete_dest_index
        )
      ).toEqual([true, false]);
      expect(esClient.asSecondaryAuthUser.transform.putTransform).toHaveBeenCalled();
    });
  });

  describe('lagSecondsOf', () => {
    it('uses the last completed checkpoint while a checkpoint is running', () => {
      expect(
        lagSecondsOf(
          {
            checkpointing: {
              last: { checkpoint: 4, time_upper_bound_millis: NOW - 600_000 },
              next: { checkpoint: 5 },
              last_search_time: NOW - 5_000,
            },
          } as never,
          NOW
        )
      ).toBe(600);
    });

    it('uses the last check for changes while idle', () => {
      expect(lagSecondsOf(idleStats('x', 45) as never, NOW)).toBe(45);
    });

    it('is unknown before the first checkpoint', () => {
      expect(lagSecondsOf({ checkpointing: { next: { checkpoint: 1 } } } as never, NOW)).toBeNull();
    });
  });

  describe('getSessionsStatus', () => {
    let client: Client;

    beforeEach(() => {
      client = elasticsearchServiceMock.createElasticsearchClient();
    });

    it('reports missing when no managed transform exists', async () => {
      mockTransforms(client, []);

      expect(await getSessionsStatus(client, { settings: oneTransform, now: NOW })).toEqual(
        expect.objectContaining({
          installed: false,
          health: 'missing',
          needsUpdate: false,
          transforms: [],
        })
      );
    });

    it('reports healthy for green, started, fresh transforms that match the settings', async () => {
      mockTransforms(client, [managedTransform(SESSIONS_TRANSFORM_ID)]);
      mockStats(client, [idleStats(SESSIONS_TRANSFORM_ID)]);

      expect(await getSessionsStatus(client, { settings: oneTransform, now: NOW })).toEqual(
        expect.objectContaining({
          installed: true,
          health: 'healthy',
          needsUpdate: false,
          lagSeconds: 30,
          installedPartitions: 1,
        })
      );
    });

    it('reports lagging when a partition falls behind', async () => {
      const ids = [sessionsTransformId(0, 2), sessionsTransformId(1, 2)];
      mockTransforms(client, [
        managedTransform(ids[0]),
        managedTransform(ids[1], { partition: 1 }),
      ]);
      mockStats(client, [
        idleStats(ids[0]),
        {
          ...idleStats(ids[1]),
          checkpointing: {
            last: { checkpoint: 9, time_upper_bound_millis: NOW - 15 * 60_000 },
            next: { checkpoint: 10 },
          },
        },
      ]);

      const status = await getSessionsStatus(client, {
        settings: { frequency: '1m', partitions: 2 },
        now: NOW,
      });

      expect(status).toEqual(
        expect.objectContaining({ health: 'lagging', lagSeconds: 900, needsUpdate: false })
      );
      expect(status.reason).toMatch(/15 minutes behind/);
      expect(status.transforms.map(({ health }) => health)).toEqual(['healthy', 'lagging']);
    });

    it('flags an outdated transform as needing an update', async () => {
      mockTransforms(client, [managedTransform('digital-experience-sessions-0', { version: 0 })]);
      mockStats(client, [idleStats('digital-experience-sessions-0')]);

      expect(await getSessionsStatus(client, { settings: oneTransform, now: NOW })).toEqual(
        expect.objectContaining({
          installed: true,
          health: 'outdated',
          needsUpdate: true,
          installedVersion: 0,
        })
      );
    });

    it('flags changed partition or frequency settings as needing an update', async () => {
      mockTransforms(client, [managedTransform(SESSIONS_TRANSFORM_ID)]);
      mockStats(client, [idleStats(SESSIONS_TRANSFORM_ID)]);

      const status = await getSessionsStatus(client, {
        settings: { frequency: '5m', partitions: 4 },
        now: NOW,
      });

      expect(status).toEqual(
        expect.objectContaining({ health: 'outdated', needsUpdate: true, installedPartitions: 1 })
      );
      expect(status.reason).toMatch(/Configured 4 partition\(s\) at 5m, installed 1/);
    });

    it('reports degraded with the failure reason', async () => {
      mockTransforms(client, [managedTransform(SESSIONS_TRANSFORM_ID)]);
      mockStats(client, [
        {
          id: SESSIONS_TRANSFORM_ID,
          state: 'failed',
          reason: 'no such index',
          health: { status: 'red' },
        },
      ]);

      expect(await getSessionsStatus(client, { settings: oneTransform, now: NOW })).toEqual(
        expect.objectContaining({ health: 'degraded', reason: 'no such index' })
      );
    });

    it('never writes', async () => {
      mockTransforms(client, [managedTransform(SESSIONS_TRANSFORM_ID)]);
      mockStats(client, [idleStats(SESSIONS_TRANSFORM_ID)]);

      await getSessionsStatus(client, { settings: oneTransform, now: NOW });

      expect(client.transform.putTransform).not.toHaveBeenCalled();
      expect(client.transform.updateTransform).not.toHaveBeenCalled();
      expect(client.transform.startTransform).not.toHaveBeenCalled();
      expect(client.transform.deleteTransform).not.toHaveBeenCalled();
    });
  });
});
