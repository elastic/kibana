/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  approximateCheckpointWatermark,
  emptyRumRollupStatus,
  parseLookbackDays,
  RUM_SESSION_GROUP_FIELD,
  RUM_SESSIONS_SYNC_DELAY,
  sessionsRetentionMaxAge,
  sessionsSourceLookback,
  type RumRollupStatus,
  type RumSessionsTransformState,
} from '../../common/rum_sessions';

export const esStatusCode = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error == null) {
    return undefined;
  }
  const withStatus = error as { statusCode?: number; meta?: { statusCode?: number } };
  return withStatus.statusCode ?? withStatus.meta?.statusCode;
};

export const isEsNotFound = (error: unknown): boolean => esStatusCode(error) === 404;

const esErrorType = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error == null) {
    return undefined;
  }
  const withBody = error as {
    body?: { error?: { type?: string } };
    meta?: { body?: { error?: { type?: string } } };
  };
  return withBody.body?.error?.type ?? withBody.meta?.body?.error?.type;
};

/** Transform PUT reports an existing id as 400 resource_already_exists_exception, not 409. */
export const isEsResourceExists = (error: unknown): boolean =>
  esStatusCode(error) === 409 || esErrorType(error) === 'resource_already_exists_exception';

export const isEsAuthzDenied = (error: unknown): boolean => {
  const status = esStatusCode(error);
  return status === 401 || status === 403;
};

export const toTransformState = (raw: string | undefined): RumSessionsTransformState => {
  if (
    raw === 'started' ||
    raw === 'indexing' ||
    raw === 'stopping' ||
    raw === 'stopped' ||
    raw === 'failed' ||
    raw === 'aborting'
  ) {
    return raw;
  }
  return 'unknown';
};

export type PutTransformBody = Omit<
  Parameters<ElasticsearchClient['transform']['putTransform']>[0],
  'transform_id' | 'defer_validation'
>;

export const installedSyncDelay = (current: unknown): string | undefined => {
  const delay = (
    current as {
      transforms?: Array<{ sync?: { time?: { delay?: string | number } } }>;
    }
  ).transforms?.[0]?.sync?.time?.delay;
  return delay == null ? undefined : String(delay);
};

export const installedSourceIndex = (current: unknown): string | string[] | undefined =>
  (
    current as {
      transforms?: Array<{ source?: { index?: string | string[] } }>;
    }
  ).transforms?.[0]?.source?.index;

export const installedSourceLookbackGte = (current: unknown): string | undefined => {
  if (typeof current !== 'object' || current == null) {
    return undefined;
  }
  const filters = (
    current as {
      transforms?: Array<{
        source?: { query?: { bool?: { filter?: unknown[] } } };
      }>;
    }
  ).transforms?.[0]?.source?.query?.bool?.filter;
  if (!Array.isArray(filters)) {
    return undefined;
  }
  for (const filter of filters) {
    const gte = (filter as { range?: { '@timestamp'?: { gte?: string } } }).range?.['@timestamp']
      ?.gte;
    if (typeof gte === 'string') {
      return gte;
    }
  }
  return undefined;
};

export const installedRetentionMaxAge = (current: unknown): string | undefined =>
  (
    current as {
      transforms?: Array<{ retention_policy?: { time?: { max_age?: string } } }>;
    }
  ).transforms?.[0]?.retention_policy?.time?.max_age;

export const transformSourceWindowUpdate = ({
  index,
  lookbackGte,
  retentionMaxAge,
}: {
  index: string | string[];
  lookbackGte: string;
  retentionMaxAge: string;
}) => ({
  source: {
    index,
    query: {
      bool: {
        filter: [
          { range: { '@timestamp': { gte: lookbackGte } } },
          { exists: { field: RUM_SESSION_GROUP_FIELD } },
        ],
      },
    },
  },
  retention_policy: {
    time: {
      field: 'end_time',
      max_age: retentionMaxAge,
    },
  },
});

const destIndexIsReadable = async (
  client: ElasticsearchClient,
  index: string
): Promise<boolean> => {
  try {
    await client.search({
      index,
      size: 0,
      terminate_after: 1,
      track_total_hits: false,
    });
    return true;
  } catch {
    return false;
  }
};

/** Infer install from dest search when transform monitor APIs are missing or forbidden. */
export const readRollupStatusFromDest = async (
  client: ElasticsearchClient,
  {
    transformId,
    index,
    syncDelay = RUM_SESSIONS_SYNC_DELAY,
  }: { transformId: string; index: string; syncDelay?: string }
): Promise<RumRollupStatus> => {
  if (!(await destIndexIsReadable(client, index))) {
    return emptyRumRollupStatus(transformId, index);
  }
  const { watermark } = approximateCheckpointWatermark(syncDelay);
  return {
    installed: true,
    state: 'unknown',
    watermark,
    transformId,
    index,
  };
};

export const readRollupStatus = async (
  client: ElasticsearchClient,
  {
    transformId,
    index,
    syncDelay = RUM_SESSIONS_SYNC_DELAY,
  }: { transformId: string; index: string; syncDelay?: string }
): Promise<RumRollupStatus> => {
  try {
    const stats = await client.transform.getTransformStats({ transform_id: transformId });
    const row = stats.transforms[0];
    if (!row) {
      return readRollupStatusFromDest(client, { transformId, index, syncDelay });
    }
    const checkpoint = row.checkpointing?.last as
      | { time_upper_bound_millis?: number; timestamp_millis?: number }
      | undefined;
    const watermarkMs = checkpoint?.time_upper_bound_millis ?? checkpoint?.timestamp_millis;
    const watermark =
      typeof watermarkMs === 'number' && Number.isFinite(watermarkMs)
        ? new Date(watermarkMs).toISOString()
        : null;
    return {
      installed: true,
      state: toTransformState(row.state),
      watermark,
      transformId,
      index,
    };
  } catch (error) {
    if (isEsNotFound(error) || isEsAuthzDenied(error)) {
      return readRollupStatusFromDest(client, { transformId, index, syncDelay });
    }
    throw error;
  }
};

export const ensureDestIndex = async (
  client: ElasticsearchClient,
  index: string
): Promise<void> => {
  const exists = await client.indices.exists({ index });
  if (!exists) {
    await client.indices.create({ index });
  }
};

export const removePreviousTransform = async ({
  client,
  logger,
  previousId,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  previousId: string;
}): Promise<void> => {
  try {
    await client.transform.stopTransform({
      transform_id: previousId,
      force: true,
      wait_for_completion: true,
    });
  } catch {
    // missing or already stopped
  }
  try {
    await client.transform.deleteTransform({
      transform_id: previousId,
      delete_dest_index: false,
    });
    logger?.info(`Removed previous ${previousId}; dest index kept`);
  } catch {
    // missing
  }
};

/** True when the installed transform carries an older version/spec than the code. */
export const transformNeedsUpgrade = async ({
  client,
  transformId,
  version,
  spec,
}: {
  client: ElasticsearchClient;
  transformId: string;
  version: number;
  spec?: number;
}): Promise<boolean> => {
  try {
    const current = await client.transform.getTransform({ transform_id: transformId });
    const meta = current.transforms[0]?._meta as { version?: number; spec?: number } | undefined;
    if (meta == null) {
      return false;
    }
    return meta.version !== version || (spec != null && meta.spec !== spec);
  } catch {
    return false;
  }
};

export const putOrReplaceTransform = async ({
  client,
  logger,
  transformId,
  version,
  body,
  onUnchanged,
  deleteDestOnReplace = false,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  transformId: string;
  version: number;
  body: PutTransformBody;
  onUnchanged?: (currentDelay?: string) => Promise<void>;
  deleteDestOnReplace?: boolean;
}): Promise<void> => {
  try {
    await client.transform.putTransform({
      transform_id: transformId,
      defer_validation: true,
      ...body,
    });
  } catch (error) {
    if (!isEsResourceExists(error)) {
      throw error;
    }
    const current = await client.transform.getTransform({ transform_id: transformId });
    const meta = current.transforms[0]?._meta as { version?: number; spec?: number } | undefined;
    const nextSpec = (body._meta as { spec?: number } | undefined)?.spec;
    if (meta?.version !== version || (nextSpec != null && meta?.spec !== nextSpec)) {
      logger?.info(
        `Replacing ${transformId} after version/spec change${
          deleteDestOnReplace ? ' (dest wiped)' : ''
        }`
      );
      await client.transform.stopTransform({
        transform_id: transformId,
        force: true,
        wait_for_completion: true,
      });
      await client.transform.deleteTransform({
        transform_id: transformId,
        delete_dest_index: deleteDestOnReplace,
      });
      await client.transform.putTransform({
        transform_id: transformId,
        defer_validation: true,
        ...body,
      });
      return;
    }
    await onUnchanged?.(installedSyncDelay(current));
  }
};

export const startTransformIgnoreRunning = async (
  client: ElasticsearchClient,
  transformId: string
): Promise<void> => {
  try {
    await client.transform.startTransform({ transform_id: transformId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already started|cannot start/i.test(message)) {
      throw error;
    }
  }
};

export const updateTransformSyncDelay = async ({
  client,
  logger,
  transformId,
  currentDelay,
  delay,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  transformId: string;
  currentDelay?: string;
  delay: string;
}): Promise<void> => {
  if (currentDelay === delay) {
    return;
  }
  logger?.info(`Updating ${transformId} sync delay from ${currentDelay ?? 'unset'} to ${delay}`);
  await client.transform.updateTransform({
    transform_id: transformId,
    sync: {
      time: {
        field: '@timestamp',
        delay,
      },
    },
  });
};

export const updateTransformSourceWindow = async ({
  client,
  logger,
  transformId,
  lookbackDays,
  resetIfIncreased,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  transformId: string;
  lookbackDays: number;
  resetIfIncreased: boolean;
}): Promise<void> => {
  const current = await client.transform.getTransform({ transform_id: transformId });
  const index = installedSourceIndex(current);
  if (index == null) {
    return;
  }
  const lookbackGte = sessionsSourceLookback(lookbackDays);
  const retentionMaxAge = sessionsRetentionMaxAge(lookbackDays);
  const currentGte = installedSourceLookbackGte(current);
  const currentRetention = installedRetentionMaxAge(current);
  if (currentGte === lookbackGte && currentRetention === retentionMaxAge) {
    return;
  }
  const currentDays = parseLookbackDays(currentGte);
  logger?.info(`Updating ${transformId} lookback from ${currentGte ?? 'unset'} to ${lookbackGte}`);
  await client.transform.stopTransform({
    transform_id: transformId,
    force: true,
    wait_for_completion: true,
  });
  await client.transform.updateTransform({
    transform_id: transformId,
    ...transformSourceWindowUpdate({ index, lookbackGte, retentionMaxAge }),
  });
  if (resetIfIncreased && (currentDays == null || lookbackDays > currentDays)) {
    logger?.info(`Resetting ${transformId} to backfill ${lookbackDays}d`);
    await client.transform.resetTransform({ transform_id: transformId });
  }
  await startTransformIgnoreRunning(client, transformId);
};

export const restartUnhealthyTransform = async ({
  client,
  logger,
  status,
}: {
  client: ElasticsearchClient;
  logger: Logger;
  status: RumRollupStatus;
}): Promise<void> => {
  if (status.state !== 'stopped' && status.state !== 'failed') {
    return;
  }
  logger.info(`${status.transformId} is ${status.state}; restarting`);
  try {
    await client.transform.stopTransform({
      transform_id: status.transformId,
      force: true,
      wait_for_completion: true,
    });
  } catch {
    // already stopped
  }
  await client.transform.startTransform({ transform_id: status.transformId });
};
