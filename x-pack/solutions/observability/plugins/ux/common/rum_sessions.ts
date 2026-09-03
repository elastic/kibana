/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RUM_SESSIONS_VERSION = 3;
/** Pivot / dest-pipeline revision. Replace transform when this changes; dest stays. */
export const RUM_SESSIONS_SPEC = 10;
/**
 * Last-seen / identity `top_metrics` stay size 1 so dest ingest still gets a
 * flattened metrics map (ES #156876 keeps that shape).
 */
export const RUM_LAST_SEEN_TOP_SIZE = 1;
/**
 * First-N page/click path on the session dest. ES #156876 writes `token.top[]`
 * for size > 1. Cap is the cluster default `index.top_metrics_max_size` (10).
 */
export const RUM_SEQUENCE_TOP_SIZE = 10;
export const RUM_CLICK_TARGET_FIELD = 'attributes.browser.css_selector';
export const RUM_SESSIONS_TRANSFORM_ID = `ux-rum-sessions-${RUM_SESSIONS_VERSION}`;
export const RUM_SESSIONS_INDEX = `ux-rum-sessions-${RUM_SESSIONS_VERSION}`;
export const RUM_SESSIONS_INDEX_PATTERN = 'ux-rum-sessions-*';
export const RUM_SESSIONS_TEMPLATE_NAME = 'ux-rum-sessions';
export const RUM_SESSIONS_PIPELINE_NAME = 'ux-rum-sessions-dest';
export const RUM_NORMALIZE_PIPELINE_NAME = 'ux-rum-normalize';
export const RUM_CANONICAL_SESSION_ID_FIELD = 'resource.attributes.session.id';
/**
 * Pivot / list grouping. Resource `session.id` is frozen at SDK start; the
 * processors re-stamp the rotated id on `attributes.session.id`.
 */
export const RUM_SESSION_GROUP_FIELD = 'attributes.session.id';
/** Dest list default is start_time desc. Sort is create-time only. */
export const RUM_SESSIONS_INDEX_SORT_FIELD = ['start_time', 'session.id'] as const;
export const RUM_SESSIONS_INDEX_SORT_ORDER = ['desc', 'asc'] as const;
/**
 * OTel logsdb source sort. session.id alone drops in-session time locality;
 * Elasticsearch wants @timestamp last (desc) on a custom logsdb sort.
 */
export const RUM_OTEL_INDEX_SORT_FIELD = [RUM_CANONICAL_SESSION_ID_FIELD, '@timestamp'] as const;
export const RUM_OTEL_INDEX_SORT_ORDER = ['asc', 'desc'] as const;
export const RUM_OTEL_TRACES_CUSTOM_TEMPLATE = 'traces-otel@custom';
export const RUM_OTEL_LOGS_CUSTOM_TEMPLATE = 'logs-otel@custom';
export const RUM_OTEL_DATA_STREAM_PATTERN = 'traces-*.otel-*,logs-*.otel-*';
export const RUM_REPLAY_DATA_STREAM_PREFIX = 'logs-rum.replay-';
export const RUM_OTEL_CUSTOM_PURPOSE = 'otel-session-id-index-sort';
export const RUM_OTEL_SESSION_ID_KEYWORD = {
  type: 'keyword',
  ignore_above: 1024,
  time_series_dimension: true,
} as const;
export const RUM_OTEL_CUSTOM_COMPONENTS = [
  {
    name: RUM_OTEL_TRACES_CUSTOM_TEMPLATE,
    simulateIndex: 'traces-generic.otel-default',
  },
  {
    name: RUM_OTEL_LOGS_CUSTOM_TEMPLATE,
    simulateIndex: 'logs-generic.otel-default',
  },
] as const;
export const RUM_CANONICAL_SERVICE_NAME_FIELD = 'resource.attributes.service.name';
export const RUM_CANONICAL_URL_PATH_GROUPED_FIELD = 'attributes.url.path.grouped';
export const RUM_CANONICAL_BROWSER_NAME_FIELD = 'attributes.browser.name';
export const RUM_CANONICAL_ERROR_GROUP_FIELD = 'attributes.error.group';
export const RUM_HAS_REPLAY_FIELD = 'attributes.rum.has_replay';
export const RUM_SESSIONS_MANAGED_BY = 'ux';
export const RUM_SESSIONS_SYNC_DELAY = '5m';
export const RUM_SESSIONS_LAG_SLACK_SECONDS = 15 * 60;
export const RUM_SESSIONS_PARTITION_COUNT = 16;
export const RUM_SESSIONS_LOOKBACK_DAYS = 90;
export const RUM_SESSIONS_LOOKBACK_DAYS_MIN = 1;
export const RUM_SESSIONS_LOOKBACK_DAYS_MAX = 400;
export const RUM_SESSIONS_RETENTION_SLACK_DAYS = 3;

const ES_TIME_VALUE = /^([1-9]\d*)([smh])$/;

export const isValidEsTimeValue = (value?: string): value is string =>
  Boolean(value && value.length <= 8 && ES_TIME_VALUE.test(value));

export const parseEsTimeValueSeconds = (value: string): number => {
  const match = ES_TIME_VALUE.exec(value);
  if (!match) {
    return 5 * 60;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === 's') {
    return amount;
  }
  if (unit === 'm') {
    return amount * 60;
  }
  return amount * 3600;
};

/** Watermark used when transform stats are unreadable (read-only / no monitor). */
export const approximateCheckpointWatermark = (
  syncDelay: string,
  nowMs = Date.now()
): { watermark: string; lagSeconds: number } => {
  const lagSeconds = parseEsTimeValueSeconds(syncDelay);
  return {
    watermark: new Date(nowMs - lagSeconds * 1000).toISOString(),
    lagSeconds,
  };
};

export const rumSessionsLagWarnSeconds = (syncDelay = RUM_SESSIONS_SYNC_DELAY): number =>
  parseEsTimeValueSeconds(syncDelay) + RUM_SESSIONS_LAG_SLACK_SECONDS;

export const clampLookbackDays = (value: unknown): number => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) {
    return RUM_SESSIONS_LOOKBACK_DAYS;
  }
  return Math.min(RUM_SESSIONS_LOOKBACK_DAYS_MAX, Math.max(RUM_SESSIONS_LOOKBACK_DAYS_MIN, n));
};

export const isValidLookbackDays = (value: unknown): value is number => {
  const n = Number(value);
  return (
    Number.isInteger(n) &&
    n >= RUM_SESSIONS_LOOKBACK_DAYS_MIN &&
    n <= RUM_SESSIONS_LOOKBACK_DAYS_MAX
  );
};

/** Calendar-day rounding so the range is cacheable (transforms-at-scale). */
export const sessionsSourceLookback = (days = RUM_SESSIONS_LOOKBACK_DAYS): string =>
  `now-${clampLookbackDays(days)}d/d`;

export const sessionsRetentionMaxAge = (days = RUM_SESSIONS_LOOKBACK_DAYS): string =>
  `${clampLookbackDays(days) + RUM_SESSIONS_RETENTION_SLACK_DAYS}d`;

export const sessionsIndexWindowMs = (days = RUM_SESSIONS_LOOKBACK_DAYS): number =>
  (clampLookbackDays(days) + RUM_SESSIONS_RETENTION_SLACK_DAYS) * 24 * 60 * 60 * 1000;

const LOOKBACK_GTE = /^now-(\d+)([dMy])(?:\/d)?$/;

export const parseLookbackDays = (gte?: string): number | undefined => {
  const match = gte ? LOOKBACK_GTE.exec(gte) : undefined;
  if (!match) {
    return undefined;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === 'y') {
    return amount * 365;
  }
  if (unit === 'M') {
    return amount * 30;
  }
  return amount;
};

export const RUM_SESSIONS_LAG_WARN_SECONDS = rumSessionsLagWarnSeconds();

export type RumAnalyticsMode = 'index' | 'raw';

export type RumSessionsTransformState =
  | 'started'
  | 'indexing'
  | 'stopping'
  | 'stopped'
  | 'failed'
  | 'aborting'
  | 'unknown';

export interface RumRollupStatus {
  installed: boolean;
  state: RumSessionsTransformState;
  watermark: string | null;
  transformId: string;
  index: string;
}

export const emptyRumRollupStatus = (transformId: string, index: string): RumRollupStatus => ({
  installed: false,
  state: 'unknown',
  watermark: null,
  transformId,
  index,
});

export interface RumAnalyticsStatus {
  installed: boolean;
  state: RumSessionsTransformState;
  watermark: string | null;
  lagSeconds: number | null;
  transformId: string;
  index: string;
  syncDelay: string;
  sourceLookbackDays: number;
  pagesDaily?: RumRollupStatus;
  serviceDaily?: RumRollupStatus;
  browserDaily?: RumRollupStatus;
}

export const emptyRumAnalyticsStatus = (): RumAnalyticsStatus => ({
  installed: false,
  state: 'unknown',
  watermark: null,
  lagSeconds: null,
  transformId: RUM_SESSIONS_TRANSFORM_ID,
  index: RUM_SESSIONS_INDEX,
  syncDelay: RUM_SESSIONS_SYNC_DELAY,
  sourceLookbackDays: RUM_SESSIONS_LOOKBACK_DAYS,
});

export const isRumAnalyticsMode = (value: string | undefined): value is RumAnalyticsMode =>
  value === 'index' || value === 'raw';

/** Token used in event_sequence / page_sequence / click_sequence. */
export const normalizeSequenceToken = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/^[#/]+/, '')
    .replace(/\s+/g, '_')
    .slice(0, 80);

export const eventSequenceToken = (type: 'page' | 'activity', value: string): string =>
  `${type === 'page' ? 'p' : 'a'}:${normalizeSequenceToken(value)}`;

export const shouldQuerySessionIndex = ({
  installed,
  analyticsMode,
  watermark,
}: {
  installed: boolean;
  analyticsMode?: string;
  watermark?: string | null;
}): boolean => installed && analyticsMode !== 'raw' && Boolean(watermark);

/** Session-shaped reads (trends, filters, session KPIs) within the 90d index window. */
export const canUseSessionIndex = ({
  installed,
  analyticsMode,
  rangeMs,
  kuery,
  lookbackDays,
}: {
  installed: boolean;
  analyticsMode?: string;
  rangeMs?: number | null;
  kuery?: string;
  lookbackDays?: number;
}): boolean =>
  installed &&
  analyticsMode !== 'raw' &&
  rangeMs != null &&
  rangeMs <= sessionsIndexWindowMs(lookbackDays) &&
  !kuery;

export const parseIncludeRaw = (value: string | boolean | undefined): boolean =>
  value === true || value === 'true';

/** Tail session IDs that are not already in the session index. */
export const newSessionIds = (
  tailIds: readonly string[],
  indexedIds: ReadonlySet<string>
): string[] => tailIds.filter((id) => id.length > 0 && !indexedIds.has(id));

/** True when the selected range still includes time after the transform watermark. */
export const rangeIncludesOpenTail = (rangeTo: string | undefined, watermark: string): boolean => {
  if (rangeTo == null || rangeTo === '' || rangeTo === 'now') {
    return true;
  }
  if (rangeTo.startsWith('now-') || rangeTo.startsWith('now+')) {
    return false;
  }
  if (rangeTo.startsWith('now')) {
    return true;
  }
  const endMs = Date.parse(rangeTo);
  const waterMs = Date.parse(watermark);
  if (!Number.isFinite(endMs) || !Number.isFinite(waterMs)) {
    return false;
  }
  return endMs > waterMs;
};

export type RumAnalyticsHealth = 'missing' | 'healthy' | 'recovering';

export const rumAnalyticsHealth = (status: RumAnalyticsStatus): RumAnalyticsHealth => {
  if (!status.installed) {
    return 'missing';
  }
  if (!status.watermark) {
    return 'recovering';
  }
  if (status.state === 'failed' || status.state === 'stopped' || status.state === 'aborting') {
    return 'recovering';
  }
  if (
    status.lagSeconds != null &&
    status.lagSeconds > rumSessionsLagWarnSeconds(status.syncDelay)
  ) {
    return 'recovering';
  }
  return 'healthy';
};

/** Auto-merge the raw tail only when the transform is healthy and the range includes now. */
export const shouldMergeRawTail = ({
  status,
  analyticsMode,
  rangeTo,
}: {
  status: RumAnalyticsStatus;
  analyticsMode?: string;
  rangeTo?: string;
}): boolean => {
  if (
    !shouldQuerySessionIndex({
      installed: status.installed,
      analyticsMode,
      watermark: status.watermark,
    })
  ) {
    return false;
  }
  if (rumAnalyticsHealth(status) !== 'healthy' || !status.watermark) {
    return false;
  }
  return rangeIncludesOpenTail(rangeTo, status.watermark);
};
