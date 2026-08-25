/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import {
  emptyRumRollupStatus,
  rangeIncludesOpenTail,
  RUM_SESSIONS_MANAGED_BY,
  RUM_SESSIONS_SYNC_DELAY,
  RUM_SESSIONS_VERSION,
  sessionsSourceLookback,
  type RumRollupStatus,
} from './rum_sessions';

export type { RumRollupStatus };
export { emptyRumRollupStatus };

export const RUM_DAILY_VERSION = RUM_SESSIONS_VERSION;
/** Dest-pipeline / pivot revision. Replace + wipe dest when this changes. */
export const RUM_DAILY_SPEC = 7;
/** Pages-only pivot revision. Bump independently so service/browser dests are not wiped. */
export const RUM_PAGES_DAILY_SPEC = 8;
export const RUM_PAGES_DAILY_TRANSFORM_ID = `ux-rum-pages-daily-${RUM_DAILY_VERSION}`;
export const RUM_PAGES_DAILY_INDEX = `ux-rum-pages-daily-${RUM_DAILY_VERSION}`;
export const RUM_PAGES_DAILY_INDEX_PATTERN = 'ux-rum-pages-daily-*';
export const RUM_PAGES_DAILY_TEMPLATE_NAME = 'ux-rum-pages-daily';
export const RUM_PAGES_DAILY_PIPELINE_NAME = 'ux-rum-pages-daily-dest';
export const RUM_SERVICE_DAILY_TRANSFORM_ID = `ux-rum-service-daily-${RUM_DAILY_VERSION}`;
export const RUM_SERVICE_DAILY_INDEX = `ux-rum-service-daily-${RUM_DAILY_VERSION}`;
export const RUM_SERVICE_DAILY_INDEX_PATTERN = 'ux-rum-service-daily-*';
export const RUM_SERVICE_DAILY_TEMPLATE_NAME = 'ux-rum-service-daily';
export const RUM_SERVICE_DAILY_PIPELINE_NAME = 'ux-rum-service-daily-dest';
export const RUM_BROWSER_DAILY_TRANSFORM_ID = `ux-rum-browser-daily-${RUM_DAILY_VERSION}`;
export const RUM_BROWSER_DAILY_INDEX = `ux-rum-browser-daily-${RUM_DAILY_VERSION}`;
export const RUM_BROWSER_DAILY_INDEX_PATTERN = 'ux-rum-browser-daily-*';
export const RUM_BROWSER_DAILY_TEMPLATE_NAME = 'ux-rum-browser-daily';
export const RUM_BROWSER_DAILY_PIPELINE_NAME = 'ux-rum-browser-daily-dest';
export const RUM_DAILY_MANAGED_BY = RUM_SESSIONS_MANAGED_BY;
export const RUM_DAILY_SYNC_DELAY = RUM_SESSIONS_SYNC_DELAY;
export const RUM_DAILY_RETENTION = '400d';
export const RUM_DAILY_SOURCE_LOOKBACK = 'now-400d';
export const RUM_SESSIONS_SOURCE_LOOKBACK = sessionsSourceLookback();
/** Daily + open-day tail once the window is longer than 7×24h (`now-7d/d` included). */
export const RUM_DAILY_LONG_RANGE_MS = 7 * 24 * 60 * 60 * 1000;

export const emptyPagesDailyStatus = (): RumRollupStatus =>
  emptyRumRollupStatus(RUM_PAGES_DAILY_TRANSFORM_ID, RUM_PAGES_DAILY_INDEX);

export const emptyServiceDailyStatus = (): RumRollupStatus =>
  emptyRumRollupStatus(RUM_SERVICE_DAILY_TRANSFORM_ID, RUM_SERVICE_DAILY_INDEX);

export const emptyBrowserDailyStatus = (): RumRollupStatus =>
  emptyRumRollupStatus(RUM_BROWSER_DAILY_TRANSFORM_ID, RUM_BROWSER_DAILY_INDEX);

/** Floor a range start to UTC midnight so calendar-day rollup buckets are not dropped. */
export const dailyRangeGte = (rangeFrom: string, now?: Date): string => {
  const from = dateMath.parse(rangeFrom, now ? { forceNow: now } : undefined);
  if (!from?.isValid()) {
    return rangeFrom;
  }
  return from.clone().utc().startOf('day').toISOString();
};

/** Complete UTC days on the daily index. The open current day is filled from raw. */
export const dailyIndexTimeRange = ({
  rangeFrom,
  rangeTo,
  watermark,
  now,
}: {
  rangeFrom: string;
  rangeTo: string;
  watermark?: string | null;
  now?: Date;
}): { gte: string; lte?: string; lt?: string } => {
  const gte = dailyRangeGte(rangeFrom, now);
  if (rangeIncludesOpenTail(rangeTo, watermark || rangeTo)) {
    return {
      gte,
      lt: dailyRangeGte(rangeTo === 'now' || !rangeTo ? 'now' : rangeTo, now),
    };
  }
  const lte = watermark && watermark < rangeTo ? watermark : rangeTo;
  return { gte, lte };
};

export const rangeSpanMs = (rangeFrom?: string, rangeTo?: string): number | null => {
  const from = dateMath.parse(rangeFrom || 'now-24h');
  const to = dateMath.parse(rangeTo || 'now', { roundUp: true });
  if (!from?.isValid() || !to?.isValid()) {
    return null;
  }
  const span = to.valueOf() - from.valueOf();
  return Number.isFinite(span) && span > 0 ? span : null;
};

export const shouldQueryDailyIndex = ({
  installed,
  watermark,
  analyticsMode,
  rangeFrom,
  rangeTo,
}: {
  installed: boolean;
  watermark?: string | null;
  analyticsMode?: string;
  rangeFrom?: string;
  rangeTo?: string;
}): boolean => {
  if (!installed || analyticsMode === 'raw' || !watermark) {
    return false;
  }
  const span = rangeSpanMs(rangeFrom, rangeTo);
  // Inclusive `now` rounding can add a few ms; keep Last 7 days (`now-7d`) off daily.
  return span != null && span - RUM_DAILY_LONG_RANGE_MS > 60_000;
};

/** Daily rollups: service + date + optional page, or browser-daily when only browser is set. */
export const canUseDailyRollup = (params: {
  browser?: string;
  os?: string;
  location?: string;
  user?: string;
  kuery?: string;
  frustration?: string;
  breakpoint?: string;
  connection?: string;
  device?: string;
  errorGroup?: string;
  pageUrl?: string;
}): boolean => {
  if (
    params.os ||
    params.location ||
    params.user ||
    params.kuery ||
    params.frustration ||
    params.breakpoint ||
    params.connection ||
    params.device ||
    params.errorGroup
  ) {
    return false;
  }
  if (params.browser && params.pageUrl) {
    return false;
  }
  return true;
};
