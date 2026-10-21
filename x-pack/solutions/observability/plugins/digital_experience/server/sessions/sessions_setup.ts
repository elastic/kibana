/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformGetTransformTransformSummary } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, IScopedClusterClient, Logger } from '@kbn/core/server';
import {
  SESSIONS_INDEX_PATTERN,
  SESSIONS_MANAGED_BY,
  SESSIONS_SOURCE_INDICES,
  SESSIONS_TRANSFORM_ID,
  SESSIONS_VERSION,
  type SessionsStatus,
} from '../../common/sessions';
import {
  buildSessionsTransform,
  sessionsDestPipeline,
  sessionsIndexTemplate,
} from './sessions_spec';

const SESSIONS_TRANSFORM_PATTERN = 'digital-experience-sessions-*';

export const REQUIRED_CLUSTER_PRIVILEGES = [
  'manage_transform',
  'manage_ingest_pipelines',
  'manage_index_templates',
] as const;
export const REQUIRED_SOURCE_INDEX_PRIVILEGES = ['read', 'view_index_metadata'] as const;
export const REQUIRED_DEST_INDEX_PRIVILEGES = [
  'read',
  'index',
  'create_index',
  'delete',
  'delete_index',
] as const;

/** Thrown before any setup write when the enabling user lacks a required privilege. */
export class SessionsPrivilegesError extends Error {
  constructor(public readonly missingPrivileges: string[]) {
    super(
      `Enabling sessions requires these Elasticsearch privileges: ${missingPrivileges.join(', ')}`
    );
    this.name = 'SessionsPrivilegesError';
  }
}

export const getMissingSessionsPrivileges = async (
  client: ElasticsearchClient
): Promise<string[]> => {
  const response = await client.security.hasPrivileges({
    cluster: [...REQUIRED_CLUSTER_PRIVILEGES],
    index: [
      { names: [...SESSIONS_SOURCE_INDICES], privileges: [...REQUIRED_SOURCE_INDEX_PRIVILEGES] },
      { names: [SESSIONS_INDEX_PATTERN], privileges: [...REQUIRED_DEST_INDEX_PRIVILEGES] },
    ],
  });
  if (response.has_all_requested) {
    return [];
  }
  const missingCluster = Object.entries(response.cluster)
    .filter(([, granted]) => !granted)
    .map(([privilege]) => `cluster:${privilege}`);
  const missingIndex = Object.entries(response.index).flatMap(([index, privileges]) =>
    Object.entries(privileges)
      .filter(([, granted]) => !granted)
      .map(([privilege]) => `index:${index}:${privilege}`)
  );
  return [...missingCluster, ...missingIndex];
};

const managedTransforms = async (
  client: ElasticsearchClient,
  signal?: AbortSignal
): Promise<TransformGetTransformTransformSummary[]> => {
  const { transforms } = await client.transform.getTransform(
    { transform_id: SESSIONS_TRANSFORM_PATTERN, allow_no_match: true, size: 100 },
    { signal }
  );
  return transforms.filter((transform) => transform._meta?.managed_by === SESSIONS_MANAGED_BY);
};

const versionOf = (transform: TransformGetTransformTransformSummary): number | null => {
  const version = Number(transform._meta?.version);
  return Number.isFinite(version) ? version : null;
};

/**
 * Installs or refreshes the sessions transform, its dest pipeline, and the dest index
 * template as the requesting user (secondary auth), so the transform only reads what
 * that user can read. Safe to call repeatedly.
 */
export const enableSessions = async ({
  esClient,
  logger,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
}): Promise<void> => {
  const missingPrivileges = await getMissingSessionsPrivileges(esClient.asCurrentUser);
  if (missingPrivileges.length > 0) {
    throw new SessionsPrivilegesError(missingPrivileges);
  }

  const client = esClient.asSecondaryAuthUser;
  await client.ingest.putPipeline(sessionsDestPipeline);
  await client.indices.putIndexTemplate(sessionsIndexTemplate);

  const installed = await managedTransforms(client);
  for (const previous of installed.filter(({ id }) => id !== SESSIONS_TRANSFORM_ID)) {
    logger.info(`Removing previous sessions transform [${previous.id}]`);
    await client.transform.deleteTransform({
      transform_id: previous.id,
      force: true,
      delete_dest_index: true,
    });
  }

  const current = installed.find(({ id }) => id === SESSIONS_TRANSFORM_ID);
  if (current) {
    // Re-enabling refreshes the stored credentials to the enabling user.
    const { description, _meta } = buildSessionsTransform();
    await client.transform.updateTransform({
      transform_id: SESSIONS_TRANSFORM_ID,
      description,
      _meta,
    });
    const { transforms } = await client.transform.getTransformStats({
      transform_id: SESSIONS_TRANSFORM_ID,
    });
    if (transforms[0]?.state === 'failed') {
      await client.transform.stopTransform({ transform_id: SESSIONS_TRANSFORM_ID, force: true });
    }
  } else {
    await client.transform.putTransform(buildSessionsTransform());
  }

  await client.transform.startTransform({ transform_id: SESSIONS_TRANSFORM_ID }, { ignore: [409] });
};

/**
 * Reads transform state and version only. Never creates or updates the transform, so it
 * is safe to call with the internal user (status route, background health task).
 */
export const getSessionsStatus = async (
  client: ElasticsearchClient,
  { signal }: { signal?: AbortSignal } = {}
): Promise<SessionsStatus> => {
  const installed = await managedTransforms(client, signal);
  const latest = installed
    .map((transform) => ({ transform, version: versionOf(transform) }))
    .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];

  if (!latest) {
    return {
      installed: false,
      health: 'missing',
      state: null,
      installedVersion: null,
      currentVersion: SESSIONS_VERSION,
      needsUpdate: false,
      reason: null,
    };
  }

  const { transforms } = await client.transform.getTransformStats(
    { transform_id: latest.transform.id },
    { signal }
  );
  const stats = transforms[0];
  const state = stats?.state ?? null;
  const needsUpdate = latest.version !== SESSIONS_VERSION;
  const healthStatus = stats?.health?.status?.toLowerCase();
  const issue = stats?.health?.issues?.[0];
  const degraded =
    state === 'failed' || state === 'stopped' || (healthStatus != null && healthStatus !== 'green');

  return {
    installed: true,
    health: needsUpdate ? 'outdated' : degraded ? 'degraded' : 'healthy',
    state,
    installedVersion: latest.version,
    currentVersion: SESSIONS_VERSION,
    needsUpdate,
    reason: stats?.reason ?? issue?.issue ?? null,
  };
};
