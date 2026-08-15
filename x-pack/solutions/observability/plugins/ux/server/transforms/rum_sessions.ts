/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  emptyRumAnalyticsStatus,
  isValidEsTimeValue,
  RUM_NORMALIZE_PIPELINE_NAME,
  RUM_SESSIONS_INDEX,
  RUM_SESSIONS_PIPELINE_NAME,
  RUM_SESSIONS_SYNC_DELAY,
  RUM_SESSIONS_TEMPLATE_NAME,
  RUM_SESSIONS_TRANSFORM_ID,
  RUM_SESSIONS_VERSION,
  shouldMergeRawTail,
  shouldQuerySessionIndex,
  type RumAnalyticsStatus,
} from '../../common/rum_sessions';
import {
  RUM_PAGES_DAILY_TRANSFORM_ID,
  RUM_SERVICE_DAILY_TRANSFORM_ID,
} from '../../common/rum_daily';
import {
  emptyDailyStatuses,
  ensureRumDailyTransforms,
  getRumDailyStatuses,
  reconcileRumDailyTransforms,
} from './rum_daily';
import {
  buildRumSessionsTransformBody,
  rumNormalizePipeline,
  rumSessionsDestPipeline,
  rumSessionsIndexTemplate,
} from './rum_sessions_spec';
import {
  ensureDestIndex,
  installedSyncDelay,
  isEsNotFound,
  putOrReplaceTransform,
  removePreviousTransform,
  restartUnhealthyTransform,
  startTransformIgnoreRunning,
  toTransformState,
  updateTransformSyncDelay,
} from './rum_transform_utils';

const STATUS_TTL_MS = 30_000;

let configuredSyncDelay = RUM_SESSIONS_SYNC_DELAY;
let cachedStatus: { at: number; value: RumAnalyticsStatus } | null = null;
let inflightStatus: Promise<RumAnalyticsStatus> | null = null;

const clearStatusCache = (): void => {
  cachedStatus = null;
  inflightStatus = null;
};

export const configureRumSessionsTransform = ({ syncDelay }: { syncDelay: string }): void => {
  configuredSyncDelay = syncDelay;
  clearStatusCache();
};

export const getRumSessionsSyncDelay = (settingsDelay?: string): string =>
  isValidEsTimeValue(settingsDelay) ? settingsDelay : configuredSyncDelay;

export const extractEsErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error != null) {
    const esError = (
      error as {
        meta?: {
          body?: { error?: { reason?: string; caused_by?: { reason?: string } } };
        };
      }
    ).meta?.body?.error;
    if (esError?.reason && esError.caused_by?.reason) {
      return `${esError.reason}: ${esError.caused_by.reason}`;
    }
    if (esError?.reason) {
      return esError.reason;
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
  }
  return String(error);
};

const withDailyStatuses = async (
  client: ElasticsearchClient,
  value: RumAnalyticsStatus
): Promise<RumAnalyticsStatus> => {
  try {
    const daily = await getRumDailyStatuses(client);
    return { ...value, ...daily };
  } catch {
    return { ...value, ...emptyDailyStatuses() };
  }
};

const loadRumAnalyticsStatus = async (
  client: ElasticsearchClient,
  resolvedDelay: string
): Promise<RumAnalyticsStatus> => {
  try {
    const stats = await client.transform.getTransformStats({
      transform_id: RUM_SESSIONS_TRANSFORM_ID,
    });
    const row = stats.transforms[0];
    if (!row) {
      return withDailyStatuses(client, {
        ...emptyRumAnalyticsStatus(),
        syncDelay: resolvedDelay,
      });
    }
    const checkpoint = row.checkpointing?.last as
      | { time_upper_bound_millis?: number; timestamp_millis?: number }
      | undefined;
    const watermarkMs = checkpoint?.time_upper_bound_millis ?? checkpoint?.timestamp_millis;
    const watermark =
      typeof watermarkMs === 'number' && Number.isFinite(watermarkMs)
        ? new Date(watermarkMs).toISOString()
        : null;
    const lagSeconds =
      watermarkMs != null ? Math.max(0, Math.round((Date.now() - watermarkMs) / 1000)) : null;
    return withDailyStatuses(client, {
      installed: true,
      state: toTransformState(row.state),
      watermark,
      lagSeconds,
      transformId: RUM_SESSIONS_TRANSFORM_ID,
      index: RUM_SESSIONS_INDEX,
      syncDelay: resolvedDelay,
    });
  } catch (error) {
    if (isEsNotFound(error)) {
      return withDailyStatuses(client, {
        ...emptyRumAnalyticsStatus(),
        syncDelay: resolvedDelay,
      });
    }
    throw error;
  }
};

export const getRumAnalyticsStatus = async (
  client: ElasticsearchClient,
  { refresh = false, syncDelay }: { refresh?: boolean; syncDelay?: string } = {}
): Promise<RumAnalyticsStatus> => {
  const resolvedDelay = getRumSessionsSyncDelay(syncDelay);
  if (
    !refresh &&
    cachedStatus &&
    Date.now() - cachedStatus.at < STATUS_TTL_MS &&
    cachedStatus.value.syncDelay === resolvedDelay
  ) {
    return cachedStatus.value;
  }
  if (!refresh && inflightStatus) {
    return inflightStatus;
  }
  const pending = loadRumAnalyticsStatus(client, resolvedDelay)
    .then((value) => {
      cachedStatus = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      if (inflightStatus === pending) {
        inflightStatus = null;
      }
    });
  if (!refresh) {
    inflightStatus = pending;
  }
  return pending;
};

const attachDailyTransforms = async ({
  client,
  logger,
  syncDelay,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  syncDelay: string;
}): Promise<void> => {
  try {
    await ensureRumDailyTransforms({
      client,
      logger,
      syncDelay,
    });
  } catch (error) {
    logger?.error(`Failed to install daily RUM rollups: ${extractEsErrorMessage(error)}`);
  }
};

export const ensureRumSessionsTransform = async ({
  client,
  logger,
  syncDelay,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  syncDelay?: string;
}): Promise<RumAnalyticsStatus> => {
  await client.ingest.putPipeline({
    id: RUM_NORMALIZE_PIPELINE_NAME,
    ...rumNormalizePipeline,
  });
  await client.ingest.putPipeline({
    id: RUM_SESSIONS_PIPELINE_NAME,
    ...rumSessionsDestPipeline,
  });
  await client.indices.putIndexTemplate({
    name: RUM_SESSIONS_TEMPLATE_NAME,
    ...rumSessionsIndexTemplate,
  });
  await ensureDestIndex(client, RUM_SESSIONS_INDEX);

  if (RUM_SESSIONS_VERSION > 1) {
    await removePreviousTransform({
      client,
      logger,
      previousId: `ux-rum-sessions-${RUM_SESSIONS_VERSION - 1}`,
    });
  }

  const delay = getRumSessionsSyncDelay(syncDelay);
  await putOrReplaceTransform({
    client,
    logger,
    transformId: RUM_SESSIONS_TRANSFORM_ID,
    version: RUM_SESSIONS_VERSION,
    body: buildRumSessionsTransformBody(delay),
    onUnchanged: async (currentDelay) => {
      await updateTransformSyncDelay({
        client,
        logger,
        transformId: RUM_SESSIONS_TRANSFORM_ID,
        currentDelay,
        delay,
      });
    },
  });
  await startTransformIgnoreRunning(client, RUM_SESSIONS_TRANSFORM_ID);
  await attachDailyTransforms({ client, logger, syncDelay: delay });

  clearStatusCache();
  return getRumAnalyticsStatus(client, { refresh: true, syncDelay: delay });
};

export const resolveRumAnalytics = async (
  client: ElasticsearchClient,
  {
    analyticsMode,
    rangeTo,
  }: {
    analyticsMode?: string;
    rangeTo?: string;
  } = {}
): Promise<{
  status: RumAnalyticsStatus;
  useIndex: boolean;
  mergeRaw: boolean;
}> => {
  const status = await getRumAnalyticsStatus(client);
  const useIndex = shouldQuerySessionIndex({
    installed: status.installed,
    analyticsMode,
    watermark: status.watermark,
  });
  return {
    status,
    useIndex,
    mergeRaw: shouldMergeRawTail({ status, analyticsMode, rangeTo }),
  };
};

const applySyncDelayToInstalled = async ({
  client,
  logger,
  transformId,
  delay,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  transformId: string;
  delay: string;
}): Promise<void> => {
  try {
    const current = await client.transform.getTransform({ transform_id: transformId });
    await updateTransformSyncDelay({
      client,
      logger,
      transformId,
      currentDelay: installedSyncDelay(current),
      delay,
    });
  } catch {
    // missing or update not supported
  }
};

/** Push the current settings (sync delay) onto any installed session/daily transforms. */
export const applyRumAnalyticsSettings = async ({
  client,
  logger,
  syncDelay,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  syncDelay?: string;
}): Promise<RumAnalyticsStatus> => {
  const delay = getRumSessionsSyncDelay(syncDelay);
  const status = await getRumAnalyticsStatus(client, { refresh: true, syncDelay: delay });
  if (!status.installed) {
    return status;
  }
  await applySyncDelayToInstalled({
    client,
    logger,
    transformId: RUM_SESSIONS_TRANSFORM_ID,
    delay,
  });
  await applySyncDelayToInstalled({
    client,
    logger,
    transformId: RUM_PAGES_DAILY_TRANSFORM_ID,
    delay,
  });
  await applySyncDelayToInstalled({
    client,
    logger,
    transformId: RUM_SERVICE_DAILY_TRANSFORM_ID,
    delay,
  });
  clearStatusCache();
  return getRumAnalyticsStatus(client, { refresh: true, syncDelay: delay });
};

export const reconcileRumSessionsTransform = async ({
  client,
  logger,
  syncDelay,
}: {
  client: ElasticsearchClient;
  logger: Logger;
  syncDelay?: string;
}): Promise<void> => {
  const delay = getRumSessionsSyncDelay(syncDelay);
  const status = await getRumAnalyticsStatus(client, { refresh: true, syncDelay: delay });
  if (!status.installed) {
    return;
  }
  await applySyncDelayToInstalled({
    client,
    logger,
    transformId: RUM_SESSIONS_TRANSFORM_ID,
    delay,
  });
  await restartUnhealthyTransform({ client, logger, status });
  await attachDailyTransforms({ client, logger, syncDelay: delay });
  try {
    await reconcileRumDailyTransforms({
      client,
      logger,
      syncDelay: delay,
    });
  } catch (error) {
    logger.error(`Failed to reconcile daily RUM rollups: ${extractEsErrorMessage(error)}`);
  }
  clearStatusCache();
};
