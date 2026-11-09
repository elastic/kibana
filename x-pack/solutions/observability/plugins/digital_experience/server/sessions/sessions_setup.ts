/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SecurityFieldSecurity,
  SecurityIndicesPrivileges,
  SecurityUserIndicesPrivileges,
  TransformGetTransformStatsTransformStats,
  TransformGetTransformTransformSummary,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, IScopedClusterClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { escapeRegExp } from 'lodash';
import { setTimeout as sleep } from 'timers/promises';
import {
  SESSIONS_DEFAULT_FREQUENCY,
  SESSIONS_INDEX,
  SESSIONS_INDEX_PATTERN,
  SESSIONS_MANAGED_BY,
  SESSIONS_SOURCE_INDICES,
  SESSIONS_TRANSFORM_PATTERN,
  SESSIONS_VERSION,
  sessionsLagThresholdSeconds,
  type SessionsSettings,
  type SessionsStatus,
  type SessionsTransformAuthorization,
  type SessionsTransformHealth,
  type SessionsTransformStatus,
} from '../../common/sessions';
import {
  buildSessionsTransform,
  sessionsDestPipeline,
  sessionsIndexTemplate,
} from './sessions_spec';
import { SessionsNewerVersionError } from './sessions_newer_version_error';
import { SessionsPrivilegesError } from './sessions_privileges_error';
import { SessionsRestrictedReadError } from './sessions_restricted_read_error';

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

export const getMissingSessionsPrivileges = async (
  client: ElasticsearchClient,
  { isServerless }: { isServerless: boolean }
): Promise<string[]> => {
  const response = await client.security.hasPrivileges({
    // On Serverless, checking the source read for document- and field-level security reads the
    // user's roles, which needs `read_security`.
    cluster: [...REQUIRED_CLUSTER_PRIVILEGES, ...(isServerless ? ['read_security'] : [])],
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

const READ_PRIVILEGES = new Set(['read', 'all']);
/** Index privileges known not to read documents. Any other, such as an action pattern, may. */
const NON_READ_PRIVILEGES = new Set([
  'view_index_metadata',
  'read_view_metadata',
  'monitor',
  'manage',
  'maintenance',
  'auto_configure',
  'create_index',
  'delete_index',
  'create',
  'create_doc',
  'index',
  'delete',
  'write',
]);

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * Whether an index pattern from a role covers `pattern`: only the role's `*` may absorb the
 * pattern's own `*`, read literally, as `?` and plain characters match one character of a name.
 * Regular expression names (`/.../`) never count.
 */
export const indexPatternCovers = (rolePattern: string, pattern: string): boolean => {
  if (rolePattern.startsWith('/')) {
    return false;
  }
  const regex = rolePattern
    .split('')
    .map((char) => (char === '*' ? '.*' : char === '?' ? '[^*]' : escapeRegExp(char)))
    .join('');
  return new RegExp(`^${regex}$`).test(pattern);
};

/**
 * Whether some index name could match both an index pattern from a role and `pattern`. Regular
 * expression names (`/.../`) always could, as proving otherwise isn't practical.
 */
export const indexPatternsOverlap = (rolePattern: string, pattern: string): boolean => {
  if (rolePattern.startsWith('/')) {
    return true;
  }
  const memo = new Map<number, boolean>();
  const overlap = (i: number, j: number): boolean => {
    const key = i * (pattern.length + 1) + j;
    const cached = memo.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const result = overlapFrom(i, j);
    memo.set(key, result);
    return result;
  };
  // A `*` matches nothing, or one more character of the other pattern (which may be its `*`).
  const overlapFrom = (i: number, j: number): boolean => {
    if (rolePattern[i] === '*') {
      return overlap(i + 1, j) || (j < pattern.length && overlap(i, j + 1));
    }
    if (pattern[j] === '*') {
      return overlap(i, j + 1) || (i < rolePattern.length && overlap(i + 1, j));
    }
    if (i === rolePattern.length || j === pattern.length) {
      return i === rolePattern.length && j === pattern.length;
    }
    const [roleChar, char] = [rolePattern[i], pattern[j]];
    return (roleChar === char || roleChar === '?' || char === '?') && overlap(i + 1, j + 1);
  };
  return overlap(0, 0);
};

/** Index privileges as the user privileges API reports them, or as a role defines them. */
type IndexPrivileges = SecurityUserIndicesPrivileges | SecurityIndicesPrivileges;

const grantsAllFields = (
  fieldSecurity: SecurityFieldSecurity | SecurityFieldSecurity[] | undefined
): boolean => {
  const grants = asArray(fieldSecurity);
  return (
    grants.length === 0 ||
    grants.some(({ grant, except }) => asArray(grant).includes('*') && asArray(except).length === 0)
  );
};

const grantsRead = (entry: IndexPrivileges): boolean =>
  entry.privileges.some((privilege) => READ_PRIVILEGES.has(privilege));

const isFiltered = (entry: IndexPrivileges): boolean =>
  asArray(entry.query).length > 0 || !grantsAllFields(entry.field_security);

const isUnrestrictedReadOf = (entry: IndexPrivileges, pattern: string): boolean =>
  grantsRead(entry) &&
  !isFiltered(entry) &&
  asArray(entry.names).some((name) => indexPatternCovers(name, pattern));

const mayGrantRead = (entry: IndexPrivileges): boolean =>
  entry.privileges.some((privilege) => !NON_READ_PRIVILEGES.has(privilege));

const mayFilterReadOf = (entry: IndexPrivileges, pattern: string): boolean =>
  mayGrantRead(entry) &&
  isFiltered(entry) &&
  asArray(entry.names).some((name) => indexPatternsOverlap(name, pattern));

/**
 * Index privileges of the user's roles, or `undefined` for an API key, whose own role descriptors
 * no role holds. Uses the Query Role API, which unlike the Get Role API also returns predefined
 * roles on Serverless. Needs `read_security`, which enabling checks first on Serverless.
 */
const getRoleIndexPrivileges = async (
  client: ElasticsearchClient
): Promise<IndexPrivileges[] | undefined> => {
  const { roles, authentication_type: authenticationType } = await client.security.authenticate();
  if (authenticationType === 'api_key') {
    return undefined;
  }
  if (roles.length === 0) {
    return [];
  }
  const { roles: descriptors } = await client.security.queryRole({
    query: { terms: { name: roles } },
    size: roles.length,
  });
  return descriptors.flatMap(({ indices }) => indices ?? []);
};

/** The user's index privileges, or `undefined` when Elasticsearch can't report them. */
const getIndexPrivileges = async (
  client: ElasticsearchClient
): Promise<IndexPrivileges[] | undefined> => {
  try {
    const { indices } = await client.security.getUserPrivileges();
    return indices;
  } catch (error) {
    // API keys with their own role descriptors: Elasticsearch answers 400 instead of privileges.
    if (isResponseError(error) && error.statusCode === 400) {
      return undefined;
    }
    // Serverless only lets operator users call it (410), so read the user's roles instead.
    if (isResponseError(error) && error.statusCode === 410) {
      return getRoleIndexPrivileges(client);
    }
    throw error;
  }
};

/**
 * Source index patterns the user may not read in full: some role's read that could apply there is
 * filtered by document- or field-level security, and no role provably reads all of it.
 * Elasticsearch merges the user's roles per index pattern, so one role with unrestricted read on a
 * pattern lifts another role's filter there. `has_privileges` checks the read itself, which also
 * covers regular expression names; those can't prove unrestricted read here.
 */
export const getRestrictedSourceIndices = async (
  client: ElasticsearchClient
): Promise<{ indices: string[]; reason: 'filtered' | 'unverifiable' }> => {
  const entries = await getIndexPrivileges(client);
  if (entries === undefined) {
    return { indices: [...SESSIONS_SOURCE_INDICES], reason: 'unverifiable' };
  }
  return {
    indices: SESSIONS_SOURCE_INDICES.filter(
      (pattern) =>
        entries.some((entry) => mayFilterReadOf(entry, pattern)) &&
        !entries.some((entry) => isUnrestrictedReadOf(entry, pattern))
    ),
    reason: 'filtered',
  };
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

const newestVersionOf = (transforms: TransformGetTransformTransformSummary[]): number | null => {
  const versions = transforms.map(versionOf).filter((v): v is number => v != null);
  return versions.length > 0 ? Math.max(...versions) : null;
};

/** One transform per configured partition, all writing to the same dest index. */
export const buildSessionsTransforms = ({ frequency, partitions }: SessionsSettings) =>
  Array.from({ length: partitions }, (_, index) =>
    buildSessionsTransform({ frequency, partition: { index, count: partitions } })
  );

/**
 * Throws unless the user can set sessions up: the privileges the setup and the transforms need,
 * and unrestricted reads of the source data. Runs as the user, as an API key with role
 * descriptors can't answer the read check.
 */
export const checkSessionsPrivileges = async (
  client: ElasticsearchClient,
  { isServerless }: { isServerless: boolean }
): Promise<void> => {
  const missingPrivileges = await getMissingSessionsPrivileges(client, { isServerless });
  if (missingPrivileges.length > 0) {
    throw new SessionsPrivilegesError(missingPrivileges);
  }
  // `has_privileges` doesn't see document- or field-level security, so check it separately.
  const restricted = await getRestrictedSourceIndices(client);
  if (restricted.indices.length > 0) {
    throw new SessionsRestrictedReadError(restricted.indices, restricted.reason);
  }
};

/** Who enabled sessions, as recorded on the transforms. */
export interface SessionsEnabledMeta {
  enabledBy: string | null;
  enabledAt: string;
}

/**
 * Installs or refreshes the sessions transforms, their dest pipeline, and the dest index
 * template, with `esClient`'s credentials as the transforms' secondary authorization: they only
 * read what those credentials can read. Doesn't check privileges; see `checkSessionsPrivileges`.
 * Safe to call repeatedly; also applies a changed frequency or partition count.
 */
export const installSessions = async ({
  esClient,
  logger,
  settings,
  enabled,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  settings: SessionsSettings;
  enabled: SessionsEnabledMeta;
}): Promise<void> => {
  const client = esClient.asSecondaryAuthUser;
  const installed = await managedTransforms(client);
  // Never downgrade: that would delete the newer transforms and their summaries.
  const newestVersion = newestVersionOf(installed);
  if (newestVersion != null && newestVersion > SESSIONS_VERSION) {
    throw new SessionsNewerVersionError(newestVersion, SESSIONS_VERSION);
  }

  await client.ingest.putPipeline(sessionsDestPipeline);
  await client.indices.putIndexTemplate(sessionsIndexTemplate);

  const enabledMeta = { enabled_by: enabled.enabledBy, enabled_at: enabled.enabledAt };
  const desired = buildSessionsTransforms(settings).map((transform) => ({
    ...transform,
    _meta: { ...transform._meta, ...enabledMeta },
  }));
  const desiredIds = new Set(desired.map(({ transform_id: id }) => id));

  for (const transform of desired) {
    const transformId = transform.transform_id;
    if (!installed.some(({ id }) => id === transformId)) {
      await client.transform.putTransform(transform);
      continue;
    }
    // Sends everything `_update` accepts (all but the pivot, which a version bump replaces), so
    // spec changes reach existing installs. Updating also replaces the transform's stored
    // credentials with the secondary ones.
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

  // Removed only once their replacements exist, so a failure before this point leaves the old
  // transforms running and the update pending, for the next attempt. Same-version transforms
  // share the dest index and write the same document ids, so a repartition keeps the index; an
  // older version's dest index is dropped once.
  const droppedDestIndices = new Set<string>();
  for (const stale of installed.filter(({ id }) => !desiredIds.has(id))) {
    const destIndex = stale.dest.index;
    const dropDest =
      (versionOf(stale) ?? 0) < SESSIONS_VERSION &&
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

  // Created here rather than by the transform once it starts, so the index exists when enabling
  // returns and the list can read it; the index template gives it its mappings. With the same
  // credentials as the transforms, which have `create_index`, but as the primary ones:
  // Elasticsearch ignores secondary authorization here. Created without checking first, as
  // `indices.exists` needs `view_index_metadata`.
  const user = esClient.asCurrentUser;
  await createUnlessExists(user, SESSIONS_INDEX);

  await Promise.all(
    desired.map(({ transform_id: transformId }) =>
      client.transform.startTransform({ transform_id: transformId }, { ignore: [409] })
    )
  );

  await waitUntilSearchable(user);
};

/**
 * Checks the user's privileges, then installs or refreshes the sessions transforms with the
 * user's own credentials, so the transforms only read what that user can read.
 */
export const enableSessions = async ({
  esClient,
  logger,
  settings,
  enabledBy,
  isServerless,
  now = new Date(),
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  settings: SessionsSettings;
  /** Username recorded on the transforms, so status can show whose access they run with. */
  enabledBy: string | null;
  isServerless: boolean;
  now?: Date;
}): Promise<void> => {
  await checkSessionsPrivileges(esClient.asCurrentUser, { isServerless });
  await installSessions({
    esClient,
    logger,
    settings,
    enabled: { enabledBy, enabledAt: now.toISOString() },
  });
};

const createUnlessExists = async (client: ElasticsearchClient, index: string): Promise<void> => {
  try {
    await client.indices.create({ index });
  } catch (error) {
    const exists =
      isResponseError(error) && error.body?.error?.type === 'resource_already_exists_exception';
    if (!exists) {
      throw error;
    }
  }
};

/** How long, and how often, enabling checks that the sessions dest index accepts searches. */
const SEARCHABLE_TIMEOUT_MS = 30_000;
const SEARCHABLE_RETRY_MS = 250;

/**
 * The UI lists sessions as soon as enabling returns, but a just-created dest index answers
 * searches with a 503 (no shard available) for a moment, even once its health is yellow. Waits
 * until a count stops answering 503, or gives up after the timeout, as the first list read can
 * still be retried.
 */
const waitUntilSearchable = async (client: ElasticsearchClient): Promise<void> => {
  const deadline = Date.now() + SEARCHABLE_TIMEOUT_MS;
  while (true) {
    try {
      await client.count({ index: SESSIONS_INDEX, ignore_unavailable: true });
      return;
    } catch (error) {
      const unavailable = isResponseError(error) && error.statusCode === 503;
      if (!unavailable || Date.now() >= deadline) {
        return;
      }
    }
    await sleep(SEARCHABLE_RETRY_MS);
  }
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

const stringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const authorizationOf = ({
  authorization,
}: TransformGetTransformTransformSummary): SessionsTransformAuthorization | null =>
  authorization
    ? {
        roles: authorization.roles ?? null,
        apiKeyId: authorization.api_key?.id ?? null,
        apiKeyName: authorization.api_key?.name ?? null,
        serviceAccount: authorization.service_account ?? null,
      }
    : null;

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
  } else if ((version ?? 0) < SESSIONS_VERSION) {
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
    enabledBy: stringOrNull(transform._meta?.enabled_by),
    enabledAt: stringOrNull(transform._meta?.enabled_at),
    authorization: authorizationOf(transform),
  };
};

const latestEnabled = (
  statuses: SessionsTransformStatus[]
): Pick<SessionsStatus, 'enabledBy' | 'enabledAt' | 'authorization'> => {
  const [latest] = [...statuses].sort((a, b) =>
    (b.enabledAt ?? '').localeCompare(a.enabledAt ?? '')
  );
  return {
    enabledBy: latest?.enabledBy ?? null,
    enabledAt: latest?.enabledAt ?? null,
    authorization: latest?.authorization ?? null,
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
      autoUpdate: false,
      apiKeyInvalid: false,
      rebuilding: false,
      reason: null,
      lagSeconds: null,
      installedPartitions: 0,
      enabledBy: null,
      enabledAt: null,
      authorization: null,
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
  const installedVersion = newestVersionOf(installed);
  // Set up by a newer Kibana (rollback, rolling upgrade): this one can't update it, only report.
  const newer = installedVersion != null && installedVersion > SESSIONS_VERSION;
  const lags = statuses
    .map(({ lagSeconds }) => lagSeconds)
    .filter((lag): lag is number => lag != null);

  const completedCheckpoint = (id: string) =>
    (allStats.find((stats) => stats.id === id)?.checkpointing?.last?.checkpoint ?? 0) > 0;
  const rebuilding = current.length > 0 && !current.some(({ id }) => completedCheckpoint(id));

  const outdated = current.length !== statuses.length;
  const configDrift =
    current.length !== settings.partitions ||
    current.some(({ frequency }) => frequency !== settings.frequency);
  const needsUpdate = !newer && (outdated || configDrift);
  const updateReason = newer
    ? `Sessions transforms are from version ${installedVersion}, newer than this Kibana supports (version ${SESSIONS_VERSION}); upgrade Kibana to manage them.`
    : outdated
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
    autoUpdate: false,
    apiKeyInvalid: false,
    rebuilding,
    reason:
      worst.health === 'degraded' || worst.health === 'lagging'
        ? worst.reason
        : updateReason ?? worst.reason,
    lagSeconds: lags.length > 0 ? Math.max(...lags) : null,
    installedPartitions: current.length,
    // Enabling stamps every partition together; the most recent stamp is the one in effect.
    ...latestEnabled(statuses),
    transforms: statuses,
  };
};
