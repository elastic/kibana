/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  clampLookbackDays,
  isValidEsTimeValue,
  parseLookbackDays,
  RUM_NORMALIZE_PIPELINE_NAME,
  RUM_SESSIONS_INDEX,
  RUM_SESSIONS_LOOKBACK_DAYS,
  RUM_SESSIONS_PIPELINE_NAME,
  RUM_SESSIONS_SPEC,
  RUM_SESSIONS_SYNC_DELAY,
  RUM_SESSIONS_TEMPLATE_NAME,
  RUM_SESSIONS_TRANSFORM_ID,
  RUM_SESSIONS_VERSION,
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
import {
  buildRumSessionsTransformBody,
  rumNormalizePipeline,
  rumSessionsDestPipeline,
  rumSessionsIndexTemplate,
} from './rum_sessions_spec';
import {
  ensureOtelSessionSort,
  ensureSessionsDestSorted,
  resetSessionsTransformAfterDestRecreate,
} from './rum_index_sort';
import {
  installedSyncDelay,
  installedSourceLookbackGte,
  putOrReplaceTransform,
  readRollupStatus,
  removePreviousTransform,
  restartUnhealthyTransform,
  startTransformIgnoreRunning,
  transformNeedsUpgrade,
  updateTransformSourceWindow,
  updateTransformSyncDelay,
} from './rum_transform_utils';

const STATUS_TTL_MS = 30_000;

let configuredSyncDelay = RUM_SESSIONS_SYNC_DELAY;
let configuredLookbackDays = RUM_SESSIONS_LOOKBACK_DAYS;
let cachedStatus: { at: number; value: RumAnalyticsStatus } | null = null;
let inflightStatus: Promise<RumAnalyticsStatus> | null = null;

const clearStatusCache = (): void => {
  cachedStatus = null;
  inflightStatus = null;
};

export const configureRumSessionsTransform = ({
  syncDelay,
  sourceLookbackDays,
}: {
  syncDelay: string;
  sourceLookbackDays?: number;
}): void => {
  configuredSyncDelay = syncDelay;
  if (sourceLookbackDays != null) {
    configuredLookbackDays = clampLookbackDays(sourceLookbackDays);
  }
  clearStatusCache();
};

export const getRumSessionsSyncDelay = (settingsDelay?: string): string =>
  isValidEsTimeValue(settingsDelay) ? settingsDelay : configuredSyncDelay;

export const getRumSessionsLookbackDays = (settingsDays?: number): number =>
  settingsDays != null ? clampLookbackDays(settingsDays) : configuredLookbackDays;

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
  resolvedDelay: string,
  resolvedLookbackDays: number
): Promise<RumAnalyticsStatus> => {
  const [rollup, current] = await Promise.all([
    readRollupStatus(client, {
      transformId: RUM_SESSIONS_TRANSFORM_ID,
      index: RUM_SESSIONS_INDEX,
      syncDelay: resolvedDelay,
    }),
    client.transform.getTransform({ transform_id: RUM_SESSIONS_TRANSFORM_ID }).catch(() => null),
  ]);
  const watermarkMs = rollup.watermark != null ? Date.parse(rollup.watermark) : NaN;
  const lagSeconds = Number.isFinite(watermarkMs)
    ? Math.max(0, Math.round((Date.now() - watermarkMs) / 1000))
    : null;
  const installedDays = parseLookbackDays(installedSourceLookbackGte(current));
  return withDailyStatuses(client, {
    installed: rollup.installed,
    state: rollup.state,
    watermark: rollup.watermark,
    lagSeconds,
    transformId: RUM_SESSIONS_TRANSFORM_ID,
    index: RUM_SESSIONS_INDEX,
    syncDelay: resolvedDelay,
    sourceLookbackDays: installedDays ?? resolvedLookbackDays,
  });
};

/** Transform stats/get are cluster monitor APIs — pass `asInternalUser`. */
export const getRumAnalyticsStatus = async (
  client: ElasticsearchClient,
  {
    refresh = false,
    syncDelay,
    sourceLookbackDays,
  }: { refresh?: boolean; syncDelay?: string; sourceLookbackDays?: number } = {}
): Promise<RumAnalyticsStatus> => {
  const resolvedDelay = getRumSessionsSyncDelay(syncDelay);
  const resolvedLookbackDays = getRumSessionsLookbackDays(sourceLookbackDays);
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
  const pending = loadRumAnalyticsStatus(client, resolvedDelay, resolvedLookbackDays)
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
  sourceLookbackDays,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  syncDelay?: string;
  sourceLookbackDays?: number;
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
  const { destRecreated } = await ensureSessionsDestSorted({ client, logger });

  if (RUM_SESSIONS_VERSION > 1) {
    await removePreviousTransform({
      client,
      logger,
      previousId: `ux-rum-sessions-${RUM_SESSIONS_VERSION - 1}`,
    });
  }

  const delay = getRumSessionsSyncDelay(syncDelay);
  const lookbackDays = getRumSessionsLookbackDays(sourceLookbackDays);
  await putOrReplaceTransform({
    client,
    logger,
    transformId: RUM_SESSIONS_TRANSFORM_ID,
    version: RUM_SESSIONS_VERSION,
    deleteDestOnReplace: false,
    body: buildRumSessionsTransformBody(delay, lookbackDays),
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
  await resetSessionsTransformAfterDestRecreate({ client, logger, destRecreated });
  await updateTransformSourceWindow({
    client,
    logger,
    transformId: RUM_SESSIONS_TRANSFORM_ID,
    lookbackDays,
    resetIfIncreased: true,
  });
  await startTransformIgnoreRunning(client, RUM_SESSIONS_TRANSFORM_ID);
  try {
    await ensureOtelSessionSort({ client, logger });
  } catch (error) {
    logger?.error(`Failed to apply OTel session sort: ${extractEsErrorMessage(error)}`);
  }
  await attachDailyTransforms({ client, logger, syncDelay: delay });

  clearStatusCache();
  return getRumAnalyticsStatus(client, {
    refresh: true,
    syncDelay: delay,
    sourceLookbackDays: lookbackDays,
  });
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

/** Push the current settings (sync delay, session lookback) onto installed transforms. */
export const applyRumAnalyticsSettings = async ({
  client,
  logger,
  syncDelay,
  sourceLookbackDays,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  syncDelay?: string;
  sourceLookbackDays?: number;
}): Promise<RumAnalyticsStatus> => {
  const delay = getRumSessionsSyncDelay(syncDelay);
  const lookbackDays = getRumSessionsLookbackDays(sourceLookbackDays);
  configuredLookbackDays = lookbackDays;
  const status = await getRumAnalyticsStatus(client, {
    refresh: true,
    syncDelay: delay,
    sourceLookbackDays: lookbackDays,
  });
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
  await applySyncDelayToInstalled({
    client,
    logger,
    transformId: RUM_BROWSER_DAILY_TRANSFORM_ID,
    delay,
  });
  await updateTransformSourceWindow({
    client,
    logger,
    transformId: RUM_SESSIONS_TRANSFORM_ID,
    lookbackDays,
    resetIfIncreased: true,
  });
  clearStatusCache();
  return getRumAnalyticsStatus(client, {
    refresh: true,
    syncDelay: delay,
    sourceLookbackDays: lookbackDays,
  });
};

export const reconcileRumSessionsTransform = async ({
  client,
  logger,
  syncDelay,
  sourceLookbackDays,
}: {
  client: ElasticsearchClient;
  logger: Logger;
  syncDelay?: string;
  sourceLookbackDays?: number;
}): Promise<void> => {
  const delay = getRumSessionsSyncDelay(syncDelay);
  const lookbackDays = getRumSessionsLookbackDays(sourceLookbackDays);
  configuredLookbackDays = lookbackDays;
  const status = await getRumAnalyticsStatus(client, {
    refresh: true,
    syncDelay: delay,
    sourceLookbackDays: lookbackDays,
  });
  try {
    await client.indices.putIndexTemplate({
      name: RUM_SESSIONS_TEMPLATE_NAME,
      ...rumSessionsIndexTemplate,
    });
  } catch (error) {
    logger.error(`Failed to put ${RUM_SESSIONS_TEMPLATE_NAME}: ${extractEsErrorMessage(error)}`);
  }
  if (status.installed) {
    const needsUpgrade = await transformNeedsUpgrade({
      client,
      transformId: RUM_SESSIONS_TRANSFORM_ID,
      version: RUM_SESSIONS_VERSION,
      spec: RUM_SESSIONS_SPEC,
    });
    // A deploy that changes the transform body is otherwise invisible: the
    // installed transform keeps running the previous spec until reinstalled.
    if (needsUpgrade) {
      // PUT/start as asInternalUser stores elastic/kibana on the transform.
      // That user cannot read traces-*.otel-* / logs-*.otel-*, so the indexer
      // stays red at checkpoint 0 and the session list never gets a watermark.
      logger.warn(
        `${RUM_SESSIONS_TRANSFORM_ID} is behind version ${RUM_SESSIONS_VERSION} spec ${RUM_SESSIONS_SPEC}. Reinstall from UX Settings so the transform keeps the current user's index privileges.`
      );
    }
    const { destRecreated } = await ensureSessionsDestSorted({ client, logger });
    if (destRecreated) {
      await resetSessionsTransformAfterDestRecreate({ client, logger, destRecreated });
      await startTransformIgnoreRunning(client, RUM_SESSIONS_TRANSFORM_ID);
    }
    await applySyncDelayToInstalled({
      client,
      logger,
      transformId: RUM_SESSIONS_TRANSFORM_ID,
      delay,
    });
    await updateTransformSourceWindow({
      client,
      logger,
      transformId: RUM_SESSIONS_TRANSFORM_ID,
      lookbackDays,
      resetIfIncreased: false,
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
  }
  try {
    await ensureOtelSessionSort({ client, logger });
  } catch (error) {
    logger.error(`Failed to apply OTel session sort: ${extractEsErrorMessage(error)}`);
  }
  clearStatusCache();
};
