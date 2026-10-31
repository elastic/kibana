/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  isValidEsTimeValue,
  RUM_SESSIONS_INDEX,
  RUM_SESSIONS_LOOKBACK_DAYS,
  RUM_SESSIONS_SYNC_DELAY,
  RUM_SESSIONS_TRANSFORM_PATTERN,
  RUM_SESSIONS_TRANSFORM_SYNC_DELAY,
  shouldMergeRawTail,
  shouldQuerySessionIndex,
  type RumAnalyticsStatus,
} from '../../common/rum_sessions';
import {
  RUM_BROWSER_DAILY_TRANSFORM_ID,
  RUM_PAGES_DAILY_TRANSFORM_ID,
  RUM_SERVICE_DAILY_TRANSFORM_ID,
} from '../../common/rum_daily';
import {
  emptyDailyStatuses,
  ensureRumDailyTransforms,
  getRumDailyStatuses,
  reconcileRumDailyTransforms,
} from './rum_daily';
import { ensureOtelSessionSort } from './rum_index_sort';
import {
  installedSyncDelay,
  readTransformsRollupStatus,
  updateTransformSyncDelay,
} from './rum_transform_utils';

const STATUS_TTL_MS = 30_000;

/** Sync delay of the daily rollups. The sessions transforms belong to digitalExperience. */
let configuredSyncDelay = RUM_SESSIONS_SYNC_DELAY;
let cachedStatus: { at: number; value: RumAnalyticsStatus } | null = null;
let inflightStatus: Promise<RumAnalyticsStatus> | null = null;

const clearStatusCache = (): void => {
  cachedStatus = null;
  inflightStatus = null;
};

export const configureRumAnalytics = ({ syncDelay }: { syncDelay: string }): void => {
  configuredSyncDelay = syncDelay;
  clearStatusCache();
};

export const getRumRollupSyncDelay = (settingsDelay?: string): string =>
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

/**
 * Status of the sessions transforms, which the digitalExperience plugin installs and keeps
 * healthy, plus the daily rollups ux owns.
 */
const loadRumAnalyticsStatus = async (client: ElasticsearchClient): Promise<RumAnalyticsStatus> => {
  const rollup = await readTransformsRollupStatus(client, {
    transformId: RUM_SESSIONS_TRANSFORM_PATTERN,
    index: RUM_SESSIONS_INDEX,
    syncDelay: RUM_SESSIONS_TRANSFORM_SYNC_DELAY,
  });
  const watermarkMs = rollup.watermark != null ? Date.parse(rollup.watermark) : NaN;
  const lagSeconds = Number.isFinite(watermarkMs)
    ? Math.max(0, Math.round((Date.now() - watermarkMs) / 1000))
    : null;
  return withDailyStatuses(client, {
    installed: rollup.installed,
    state: rollup.state,
    watermark: rollup.watermark,
    lagSeconds,
    transformId: rollup.transformId,
    index: rollup.index,
    syncDelay: RUM_SESSIONS_TRANSFORM_SYNC_DELAY,
    sourceLookbackDays: RUM_SESSIONS_LOOKBACK_DAYS,
  });
};

/** Transform stats/get are cluster monitor APIs — pass `asInternalUser`. */
export const getRumAnalyticsStatus = async (
  client: ElasticsearchClient,
  { refresh = false }: { refresh?: boolean } = {}
): Promise<RumAnalyticsStatus> => {
  if (!refresh && cachedStatus && Date.now() - cachedStatus.at < STATUS_TTL_MS) {
    return cachedStatus.value;
  }
  if (!refresh && inflightStatus) {
    return inflightStatus;
  }
  const pending = loadRumAnalyticsStatus(client)
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

/**
 * Installs what ux owns: the OTel session sort and the daily rollups. The sessions transforms are
 * enabled from Digital Experience.
 */
export const ensureRumRollups = async ({
  client,
  logger,
  syncDelay,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  syncDelay?: string;
}): Promise<RumAnalyticsStatus> => {
  const delay = getRumRollupSyncDelay(syncDelay);
  try {
    await ensureOtelSessionSort({ client, logger });
  } catch (error) {
    logger?.error(`Failed to apply OTel session sort: ${extractEsErrorMessage(error)}`);
  }
  await attachDailyTransforms({ client, logger, syncDelay: delay });
  clearStatusCache();
  return getRumAnalyticsStatus(client, { refresh: true });
};

/** Transform stats/get are cluster monitor APIs — pass `asInternalUser`. */
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

/** Push the current sync delay onto the installed daily rollups. */
export const applyRumAnalyticsSettings = async ({
  client,
  logger,
  syncDelay,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  syncDelay?: string;
}): Promise<RumAnalyticsStatus> => {
  const delay = getRumRollupSyncDelay(syncDelay);
  try {
    await ensureOtelSessionSort({ client, logger });
  } catch (error) {
    logger?.error(`Failed to apply OTel session sort: ${extractEsErrorMessage(error)}`);
  }
  for (const transformId of [
    RUM_PAGES_DAILY_TRANSFORM_ID,
    RUM_SERVICE_DAILY_TRANSFORM_ID,
    RUM_BROWSER_DAILY_TRANSFORM_ID,
  ]) {
    await applySyncDelayToInstalled({ client, logger, transformId, delay });
  }
  clearStatusCache();
  return getRumAnalyticsStatus(client, { refresh: true });
};

/** Keeps the daily rollups installed and running once sessions are enabled. */
export const reconcileRumRollups = async ({
  client,
  logger,
  syncDelay,
}: {
  client: ElasticsearchClient;
  logger: Logger;
  syncDelay?: string;
}): Promise<void> => {
  const delay = getRumRollupSyncDelay(syncDelay);
  const status = await getRumAnalyticsStatus(client, { refresh: true });
  if (status.installed) {
    await attachDailyTransforms({ client, logger, syncDelay: delay });
    try {
      await reconcileRumDailyTransforms({ client, logger, syncDelay: delay });
    } catch (error) {
      logger.error(`Failed to reconcile daily RUM rollups: ${extractEsErrorMessage(error)}`);
    }
  }
  try {
    await ensureOtelSessionSort({ client, logger });
  } catch (error) {
    logger.error(`Failed to apply OTel session sort: ${extractEsErrorMessage(error)}`);
  }
  clearStatusCache();
};
