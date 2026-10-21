/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  SESSIONS_MANAGED_BY,
  SESSIONS_PIPELINE_NAME,
  SESSIONS_TRANSFORM_ID,
  SESSIONS_VERSION,
} from '../../common/sessions';
import {
  SessionsPrivilegesError,
  enableSessions,
  getMissingSessionsPrivileges,
  getSessionsStatus,
} from './sessions_setup';

type ScopedClient = ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
type Client = ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

const managedTransform = (id: string, version: number) => ({
  id,
  _meta: { managed_by: SESSIONS_MANAGED_BY, version },
});

const mockTransforms = (client: Client, transforms: Array<ReturnType<typeof managedTransform>>) =>
  client.transform.getTransform.mockResolvedValue({
    count: transforms.length,
    transforms,
  } as unknown as Awaited<ReturnType<Client['transform']['getTransform']>>);

const mockStats = (client: Client, stats: Record<string, unknown>) =>
  client.transform.getTransformStats.mockResolvedValue({
    count: 1,
    transforms: [stats],
  } as unknown as Awaited<ReturnType<Client['transform']['getTransformStats']>>);

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

      await expect(enableSessions({ esClient, logger })).rejects.toBeInstanceOf(
        SessionsPrivilegesError
      );
      expect(esClient.asSecondaryAuthUser.ingest.putPipeline).not.toHaveBeenCalled();
      expect(esClient.asSecondaryAuthUser.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(esClient.asSecondaryAuthUser.transform.putTransform).not.toHaveBeenCalled();
    });

    it('installs pipeline, template and transform as the requesting user', async () => {
      grantAll(esClient.asCurrentUser);
      mockTransforms(esClient.asSecondaryAuthUser, []);

      await enableSessions({ esClient, logger });

      const client = esClient.asSecondaryAuthUser;
      expect(client.ingest.putPipeline).toHaveBeenCalledWith(
        expect.objectContaining({ id: SESSIONS_PIPELINE_NAME })
      );
      expect(client.indices.putIndexTemplate).toHaveBeenCalled();
      expect(client.transform.putTransform).toHaveBeenCalledWith(
        expect.objectContaining({ transform_id: SESSIONS_TRANSFORM_ID })
      );
      expect(client.transform.startTransform).toHaveBeenCalledWith(
        { transform_id: SESSIONS_TRANSFORM_ID },
        { ignore: [409] }
      );
      expect(esClient.asInternalUser.transform.putTransform).not.toHaveBeenCalled();
    });

    it('is idempotent: refreshes an installed transform instead of recreating it', async () => {
      grantAll(esClient.asCurrentUser);
      mockTransforms(esClient.asSecondaryAuthUser, [
        managedTransform(SESSIONS_TRANSFORM_ID, SESSIONS_VERSION),
      ]);
      mockStats(esClient.asSecondaryAuthUser, { state: 'started' });

      await enableSessions({ esClient, logger });

      const client = esClient.asSecondaryAuthUser;
      expect(client.transform.putTransform).not.toHaveBeenCalled();
      expect(client.transform.updateTransform).toHaveBeenCalledWith(
        expect.objectContaining({ transform_id: SESSIONS_TRANSFORM_ID })
      );
      expect(client.transform.stopTransform).not.toHaveBeenCalled();
      expect(client.transform.startTransform).toHaveBeenCalled();
    });

    it('stops a failed transform before restarting it', async () => {
      grantAll(esClient.asCurrentUser);
      mockTransforms(esClient.asSecondaryAuthUser, [
        managedTransform(SESSIONS_TRANSFORM_ID, SESSIONS_VERSION),
      ]);
      mockStats(esClient.asSecondaryAuthUser, { state: 'failed' });

      await enableSessions({ esClient, logger });

      expect(esClient.asSecondaryAuthUser.transform.stopTransform).toHaveBeenCalledWith({
        transform_id: SESSIONS_TRANSFORM_ID,
        force: true,
      });
    });

    it('replaces a transform from a previous version', async () => {
      grantAll(esClient.asCurrentUser);
      mockTransforms(esClient.asSecondaryAuthUser, [
        managedTransform('digital-experience-sessions-0', 0),
      ]);

      await enableSessions({ esClient, logger });

      const client = esClient.asSecondaryAuthUser;
      expect(client.transform.deleteTransform).toHaveBeenCalledWith({
        transform_id: 'digital-experience-sessions-0',
        force: true,
        delete_dest_index: true,
      });
      expect(client.transform.putTransform).toHaveBeenCalled();
    });
  });

  describe('getSessionsStatus', () => {
    let client: Client;

    beforeEach(() => {
      client = elasticsearchServiceMock.createElasticsearchClient();
    });

    it('reports missing when no managed transform exists', async () => {
      mockTransforms(client, []);

      expect(await getSessionsStatus(client)).toEqual(
        expect.objectContaining({ installed: false, health: 'missing', needsUpdate: false })
      );
    });

    it('reports healthy for a green, started transform at the current version', async () => {
      mockTransforms(client, [managedTransform(SESSIONS_TRANSFORM_ID, SESSIONS_VERSION)]);
      mockStats(client, { state: 'started', health: { status: 'green' } });

      expect(await getSessionsStatus(client)).toEqual(
        expect.objectContaining({ installed: true, health: 'healthy', needsUpdate: false })
      );
    });

    it('flags an outdated transform as needing an update', async () => {
      mockTransforms(client, [managedTransform('digital-experience-sessions-0', 0)]);
      mockStats(client, { state: 'started', health: { status: 'green' } });

      expect(await getSessionsStatus(client)).toEqual(
        expect.objectContaining({ health: 'outdated', needsUpdate: true, installedVersion: 0 })
      );
    });

    it('reports degraded with the failure reason', async () => {
      mockTransforms(client, [managedTransform(SESSIONS_TRANSFORM_ID, SESSIONS_VERSION)]);
      mockStats(client, { state: 'failed', reason: 'no such index', health: { status: 'red' } });

      expect(await getSessionsStatus(client)).toEqual(
        expect.objectContaining({ health: 'degraded', reason: 'no such index' })
      );
    });

    it('never writes', async () => {
      mockTransforms(client, [managedTransform(SESSIONS_TRANSFORM_ID, SESSIONS_VERSION)]);
      mockStats(client, { state: 'started' });

      await getSessionsStatus(client);

      expect(client.transform.putTransform).not.toHaveBeenCalled();
      expect(client.transform.updateTransform).not.toHaveBeenCalled();
      expect(client.transform.startTransform).not.toHaveBeenCalled();
    });
  });
});
