/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TransformGetTransformStatsTransformStats,
  TransformGetTransformTransformSummary,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, IScopedClusterClient, Logger } from '@kbn/core/server';
import {
  SESSIONS_DEFAULT_FREQUENCY,
  SESSIONS_INDEX_PATTERN,
  SESSIONS_MANAGED_BY,
  SESSIONS_SOURCE_INDICES,
  SESSIONS_TRANSFORM_PATTERN,
  SESSIONS_VERSION,
  sessionsLagThresholdSeconds,
  type SessionsSettings,
  type SessionsStatus,
  type SessionsTransformHealth,
  type SessionsTransformStatus,
} from '../../common/sessions';
import {
  buildSessionsTransform,
  sessionsDestPipeline,
  sessionsIndexTemplate,
} from './sessions_spec';

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

/** One transform per configured partition, all writing to the same dest index. */
export const buildSessionsTransforms = ({ frequency, partitions }: SessionsSettings) =>
  Array.from({ length: partitions }, (_, index) =>
    buildSessionsTransform({ frequency, partition: { index, count: partitions } })
  );

/**
 * Installs or refreshes the sessions transforms, their dest pipeline, and the dest index
 * template as the requesting user (secondary auth), so the transforms only read what that
 * user can read. Safe to call repeatedly; also applies a changed frequency or partition count.
 */
export const enableSessions = async ({
  esClient,
  logger,
  settings,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  settings: SessionsSettings;
}): Promise<void> => {
  const missingPrivileges = await getMissingSessionsPrivileges(esClient.asCurrentUser);
  if (missingPrivileges.length > 0) {
    throw new SessionsPrivilegesError(missingPrivileges);
  }

  const client = esClient.asSecondaryAuthUser;
  await client.ingest.putPipeline(sessionsDestPipeline);
  await client.indices.putIndexTemplate(sessionsIndexTemplate);

  const desired = buildSessionsTransforms(settings);
  const desiredIds = new Set(desired.map(({ transform_id: id }) => id));
  const installed = await managedTransforms(client);

  // Same-version transforms share the dest index and write the same document ids, so a
  // repartition keeps the index; a previous version's dest index is dropped once.
  const droppedDestIndices = new Set<string>();
  for (const stale of installed.filter(({ id }) => !desiredIds.has(id))) {
    const destIndex = stale.dest.index;
    const dropDest =
      versionOf(stale) !== SESSIONS_VERSION &&
      destIndex != null &&
      !droppedDestIndices.has(destIndex);
    logger.info(
      `Removing sessions transform [${stale.id}]${dropDest ? ' and its dest index' : ''}`
    );
    await client.transform.deleteTransform({
      transform_id: stale.id,
      force: true,
      delete_dest_index: dropDest,
    });
    if (dropDest && destIndex != null) {
      droppedDestIndices.add(destIndex);
    }
  }

  for (const transform of desired) {
    const transformId = transform.transform_id;
    if (!installed.some(({ id }) => id === transformId)) {
      await client.transform.putTransform(transform);
      continue;
    }
    // Sends everything `_update` accepts (all but the pivot, which a version bump replaces), so
    // spec changes reach existing installs. Updating also refreshes the stored credentials to the
    // enabling user.
    const { pivot, defer_validation: deferValidation, ...updatable } = transform;
    await client.transform.updateTransform(updatable);
    const { transforms } = await client.transform.getTransformStats({ transform_id: transformId });
    if (transforms[0]?.state === 'failed') {
      // Wait, or the start below can hit the stopping task and its 409 would be ignored.
      await client.transform.stopTransform({
        transform_id: transformId,
        force: true,
        wait_for_completion: true,
      });
    }
  }

  await Promise.all(
    desired.map(({ transform_id: transformId }) =>
      client.transform.startTransform({ transform_id: transformId }, { ignore: [409] })
    )
  );
};

const HEALTH_RANK: Record<SessionsTransformHealth, number> = {
  healthy: 0,
  outdated: 1,
  lagging: 2,
  degraded: 3,
  missing: 4,
};

/**
 * How stale the sessions index is for one transform, in seconds. While a checkpoint runs, the
 * index is as fresh as the last completed checkpoint; while idle, as fresh as the last check
 * for changes.
 */
export const lagSecondsOf = (
  stats: TransformGetTransformStatsTransformStats | undefined,
  now: number
): number | null => {
  const checkpointing = stats?.checkpointing;
  const reference = checkpointing?.next
    ? checkpointing.last?.time_upper_bound_millis
    : checkpointing?.last_search_time;
  return typeof reference === 'number' ? Math.max(0, Math.round((now - reference) / 1000)) : null;
};

const transformStatus = (
  transform: TransformGetTransformTransformSummary,
  stats: TransformGetTransformStatsTransformStats | undefined,
  now: number
): SessionsTransformStatus => {
  const version = versionOf(transform);
  // `frequency` is a Duration (a time string, or -1 / 0); anything else means the default.
  const frequency =
    typeof transform.frequency === 'string' ? transform.frequency : SESSIONS_DEFAULT_FREQUENCY;
  const state = stats?.state ?? null;
  const lagSeconds = lagSecondsOf(stats, now);
  const healthStatus = stats?.health?.status?.toLowerCase();
  const degraded =
    state === 'failed' || state === 'stopped' || (healthStatus != null && healthStatus !== 'green');
  const lagging = lagSeconds != null && lagSeconds > sessionsLagThresholdSeconds(frequency);
  const partition = Number(transform._meta?.partition);

  let health: SessionsTransformHealth = 'healthy';
  let reason = stats?.reason ?? stats?.health?.issues?.[0]?.issue ?? null;
  if (degraded) {
    health = 'degraded';
  } else if (lagging) {
    health = 'lagging';
    reason = `${Math.round(
      (lagSeconds ?? 0) / 60
    )} minutes behind; the transform can't keep up with session traffic`;
  } else if (version !== SESSIONS_VERSION) {
    health = 'outdated';
  }

  return {
    id: transform.id,
    partition: Number.isInteger(partition) ? partition : null,
    version,
    frequency,
    state,
    health,
    lagSeconds,
    reason,
  };
};

/**
 * Reads transform state, version and lag only. Never creates or updates a transform, so it is
 * safe to call with the internal user (status route, background health task).
 */
export const getSessionsStatus = async (
  client: ElasticsearchClient,
  {
    settings,
    signal,
    now = Date.now(),
  }: { settings: SessionsSettings; signal?: AbortSignal; now?: number }
): Promise<SessionsStatus> => {
  const installed = await managedTransforms(client, signal);
  const base = { currentVersion: SESSIONS_VERSION, configured: settings };

  if (installed.length === 0) {
    return {
      ...base,
      installed: false,
      health: 'missing',
      state: null,
      installedVersion: null,
      needsUpdate: false,
      reason: null,
      lagSeconds: null,
      installedPartitions: 0,
      transforms: [],
    };
  }

  const { transforms: allStats } = await client.transform.getTransformStats(
    { transform_id: installed.map(({ id }) => id).join(','), allow_no_match: true },
    { signal }
  );
  const statuses = installed
    .map((transform) =>
      transformStatus(
        transform,
        allStats.find(({ id }) => id === transform.id),
        now
      )
    )
    .sort((a, b) => (a.partition ?? 0) - (b.partition ?? 0));
  const current = statuses.filter(({ version }) => version === SESSIONS_VERSION);
  const worst = statuses.reduce((a, b) => (HEALTH_RANK[b.health] > HEALTH_RANK[a.health] ? b : a));
  const versions = statuses.map(({ version }) => version).filter((v): v is number => v != null);
  const installedVersion = versions.length > 0 ? Math.max(...versions) : null;
  const lags = statuses
    .map(({ lagSeconds }) => lagSeconds)
    .filter((lag): lag is number => lag != null);

  const outdated = current.length !== statuses.length;
  const configDrift =
    current.length !== settings.partitions ||
    current.some(({ frequency }) => frequency !== settings.frequency);
  const needsUpdate = outdated || configDrift;
  const updateReason = outdated
    ? `Sessions transforms are from version ${installedVersion}; enable sessions again to update them to version ${SESSIONS_VERSION}.`
    : configDrift
    ? `Configured ${settings.partitions} partition(s) at ${settings.frequency}, installed ${current.length}; enable sessions again to apply.`
    : null;

  return {
    ...base,
    installed: true,
    health: worst.health === 'healthy' && needsUpdate ? 'outdated' : worst.health,
    state: worst.state,
    installedVersion,
    needsUpdate,
    reason:
      worst.health === 'degraded' || worst.health === 'lagging'
        ? worst.reason
        : updateReason ?? worst.reason,
    lagSeconds: lags.length > 0 ? Math.max(...lags) : null,
    installedPartitions: current.length,
    transforms: statuses,
  };
};
