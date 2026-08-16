/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupUrlPath } from './url_grouping';

export type RumFrustrationKind = 'rage' | 'error' | 'dead';

export interface RumFacetBucket {
  key: string;
  count: number;
}

export interface RumFiltersResponse {
  browsers: RumFacetBucket[];
  os: RumFacetBucket[];
  pages: RumFacetBucket[];
  breakpoints: RumFacetBucket[];
  connections: RumFacetBucket[];
  devices: RumFacetBucket[];
  countries: RumFacetBucket[];
}

export interface RumVitalRanks {
  good: number;
  ni: number;
  poor: number;
}

export interface RumVitalSummary {
  p75: number | null;
  ranks: RumVitalRanks | null;
  samples: number;
}

export interface RumOverviewKpis {
  sessions: number;
  pageViews: number;
  errorSessions: number;
  errorRate: number;
  p75LoadMs: number | null;
  p75Inp: number | null;
}

export interface RumTrendPoint {
  timestamp: string;
  sessions: number;
  pageViews: number;
  errors: number;
}

export type SessionTrendAlign = '1d' | '1h';

export const sessionTrendAlignKey = (timestamp: string, align: SessionTrendAlign): string => {
  const ms = Date.parse(timestamp);
  if (!Number.isFinite(ms)) {
    return timestamp;
  }
  const iso = new Date(ms).toISOString();
  return align === '1d' ? iso.slice(0, 10) : iso.slice(0, 13);
};

/** Session-dest started counts on an existing series. Keeps page views / errors. */
export const applySessionIndexTrendSessions = (
  trends: RumTrendPoint[],
  sessionTrends: RumTrendPoint[],
  align: SessionTrendAlign
): RumTrendPoint[] => {
  if (sessionTrends.length === 0) {
    return trends;
  }
  const sessionsByKey = new Map<string, number>();
  for (const point of sessionTrends) {
    sessionsByKey.set(sessionTrendAlignKey(point.timestamp, align), point.sessions);
  }
  return trends.map((point) => ({
    ...point,
    sessions: sessionsByKey.get(sessionTrendAlignKey(point.timestamp, align)) ?? 0,
  }));
};

export interface RumFrustrationCounts {
  rageSessions: number;
  errorSessions: number;
  deadClickSessions: number;
  rageClicks: number;
  deadClicks: number;
  errorClicks: number;
}

export interface RumVitalAttribution {
  lcpElement: string | null;
  lcpUrl: string | null;
  lcpTtfb: number | null;
  lcpResourceLoadDelay: number | null;
  lcpResourceLoadDuration: number | null;
  lcpElementRenderDelay: number | null;
  inpTarget: string | null;
  inpType: string | null;
  inpInputDelay: number | null;
  inpProcessing: number | null;
  inpPresentation: number | null;
  clsSource: string | null;
}

export interface RumResourceRow {
  url: string;
  count: number;
  avgDurationMs: number | null;
  renderBlocking: string | null;
  status: number | null;
  dnsMs: number | null;
  tcpMs: number | null;
  tlsMs: number | null;
  requestMs: number | null;
  responseMs: number | null;
  queueMs: number | null;
}

export const emptyVitalAttribution = (): RumVitalAttribution => ({
  lcpElement: null,
  lcpUrl: null,
  lcpTtfb: null,
  lcpResourceLoadDelay: null,
  lcpResourceLoadDuration: null,
  lcpElementRenderDelay: null,
  inpTarget: null,
  inpType: null,
  inpInputDelay: null,
  inpProcessing: null,
  inpPresentation: null,
  clsSource: null,
});

export type RumVitalRating = 'good' | 'ni' | 'poor';

export const CWV_THRESHOLDS = {
  lcp: { good: 2500, ni: 4000 },
  inp: { good: 200, ni: 500 },
  cls: { good: 0.1, ni: 0.25 },
} as const;

/** Same buckets as Overview `percentile_ranks` (includes FCP). */
export const VITAL_RANK_THRESHOLDS = {
  ...CWV_THRESHOLDS,
  fcp: { good: 1800, ni: 3000 },
} as const;

export const rateVital = (
  vital: keyof typeof CWV_THRESHOLDS,
  value: number | null
): RumVitalRating | null => {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  const threshold = CWV_THRESHOLDS[vital];
  if (value <= threshold.good) {
    return 'good';
  }
  if (value <= threshold.ni) {
    return 'ni';
  }
  return 'poor';
};

export const pagePassesCwv = (page: {
  p75Lcp: number | null;
  p75Inp: number | null;
  p75Cls: number | null;
}): boolean =>
  rateVital('lcp', page.p75Lcp) === 'good' &&
  rateVital('inp', page.p75Inp) === 'good' &&
  rateVital('cls', page.p75Cls) === 'good';

/** True when the group's earliest in-range event is after the start of the window (not present at range open). */
export const isNewInRange = (
  firstSeenMs: number,
  rangeFromMs: number,
  rangeToMs: number
): boolean => {
  if (
    !Number.isFinite(firstSeenMs) ||
    !Number.isFinite(rangeFromMs) ||
    !Number.isFinite(rangeToMs)
  ) {
    return false;
  }
  const span = Math.max(rangeToMs - rangeFromMs, 1);
  const slack = Math.min(span * 0.1, 60 * 60 * 1000);
  return firstSeenMs > rangeFromMs + slack;
};

export interface RumPageRow {
  path: string;
  views: number;
  errorCount: number;
  p75Lcp: number | null;
  p75Inp: number | null;
  p75Cls: number | null;
  avgDurationMs: number | null;
  sessionCount: number;
  rageClicks: number;
  deadClicks: number;
  trend: number[];
  attribution: RumVitalAttribution;
  resources: RumResourceRow[];
}

export const emptyPageImpact = (): Pick<
  RumPageRow,
  'sessionCount' | 'rageClicks' | 'deadClicks' | 'trend'
> => ({
  sessionCount: 0,
  rageClicks: 0,
  deadClicks: 0,
  trend: [],
});

export interface RumPagesKpis {
  views: number;
  sessions: number;
  passingCwvPct: number | null;
  poorLcpPages: number;
}

export const summarizePagesKpis = (
  pages: Array<Pick<RumPageRow, 'views' | 'p75Lcp' | 'p75Inp' | 'p75Cls'>>,
  totalSessions: number
): RumPagesKpis => {
  const views = pages.reduce((sum, page) => sum + page.views, 0);
  const passingViews = pages.reduce((sum, page) => sum + (pagePassesCwv(page) ? page.views : 0), 0);
  return {
    views,
    sessions: totalSessions,
    passingCwvPct: views > 0 ? passingViews / views : null,
    poorLcpPages: pages.filter((page) => rateVital('lcp', page.p75Lcp) === 'poor').length,
  };
};

/** Dest / terms key when the page path script resolves to empty. */
export const UNGROUPED_PAGE_PATH = '(ungrouped)';

export const pagePathFromKey = (key: string | number | null | undefined): string => {
  if (key == null) {
    return UNGROUPED_PAGE_PATH;
  }
  const path = String(key);
  return path.length > 0 ? path : UNGROUPED_PAGE_PATH;
};

/** Service daily page_views match Overview; path-row sums undercount missing grouped paths. */
export const pagesViewsKpi = ({
  pageUrl,
  useService,
  servicePageViews,
  rowViews,
  tailPageViews,
}: {
  pageUrl?: string;
  useService: boolean;
  servicePageViews: number;
  rowViews: number;
  tailPageViews: number;
}): number => {
  if (pageUrl || !useService) {
    return rowViews;
  }
  return servicePageViews + tailPageViews;
};

/** Collapse page rows with the current URL grouping settings. */
export const mergeRumPageRows = (
  pages: RumPageRow[],
  grouping: { depth?: number; rules?: string[] }
): RumPageRow[] => {
  const merged = new Map<string, RumPageRow>();
  for (const page of pages) {
    const path = groupUrlPath(page.path, grouping) || page.path;
    const existing = merged.get(path);
    if (!existing) {
      merged.set(path, { ...page, path });
      continue;
    }
    const views = existing.views + page.views;
    const trendLen = Math.max(existing.trend.length, page.trend.length);
    merged.set(path, {
      ...existing,
      views,
      errorCount: existing.errorCount + page.errorCount,
      sessionCount: existing.sessionCount + page.sessionCount,
      rageClicks: existing.rageClicks + page.rageClicks,
      deadClicks: existing.deadClicks + page.deadClicks,
      trend: Array.from(
        { length: trendLen },
        (_, index) => (existing.trend[index] ?? 0) + (page.trend[index] ?? 0)
      ),
      p75Lcp: existing.p75Lcp ?? page.p75Lcp,
      p75Inp: existing.p75Inp ?? page.p75Inp,
      p75Cls: existing.p75Cls ?? page.p75Cls,
      avgDurationMs: existing.avgDurationMs ?? page.avgDurationMs,
      attribution: existing.attribution.lcpElement ? existing.attribution : page.attribution,
      resources: [...existing.resources, ...page.resources]
        .sort((a, b) => (b.avgDurationMs ?? 0) - (a.avgDurationMs ?? 0))
        .slice(0, 8),
    });
  }
  return [...merged.values()].sort((a, b) => b.views - a.views);
};

/** Country rollup for the Overview visitors panel (ISO code joins EMS / filters). */
export interface RumCountryRow {
  isoCode: string;
  name: string;
  pageViews: number;
  sessions: number;
  errorCount: number;
  p75Lcp: number | null;
}

export interface RumOverviewResponse {
  kpis: RumOverviewKpis;
  vitals: {
    lcp: RumVitalSummary;
    inp: RumVitalSummary;
    cls: RumVitalSummary;
    fcp: RumVitalSummary;
  };
  trends: RumTrendPoint[];
  frustration: RumFrustrationCounts;
  topPages: RumPageRow[];
  browsers: RumFacetBucket[];
  os: RumFacetBucket[];
  countries: RumCountryRow[];
}

export interface RumPagesResponse {
  pages: RumPageRow[];
  kpis: RumPagesKpis;
}

export interface RumErrorAffectedPage {
  path: string;
  count: number;
}

export interface RumErrorTrendPoint {
  timestamp: string;
  count: number;
}

export interface RumErrorGroup {
  key: string;
  type: string;
  message: string;
  count: number;
  sessionCount: number;
  /** Distinct identified users (user.id / email / name) hitting this group. */
  userCount: number;
  sampleStack: string | null;
  groupingKey: string | null;
  trend: number[];
  trendPoints: RumErrorTrendPoint[];
  firstSeen: string | null;
  lastSeen: string | null;
  isNew: boolean;
  affectedPages: RumErrorAffectedPage[];
  samplePage: string | null;
  sampleAction: string | null;
  sampleTraceId: string | null;
}

export interface RumErrorsKpis {
  errorEvents: number;
  impactedSessions: number;
  totalSessions: number;
  impactedUsers: number;
  newGroups: number;
}

export const emptyErrorsKpis = (): RumErrorsKpis => ({
  errorEvents: 0,
  impactedSessions: 0,
  totalSessions: 0,
  impactedUsers: 0,
  newGroups: 0,
});

export const emptyPagesKpis = (): RumPagesKpis => ({
  views: 0,
  sessions: 0,
  passingCwvPct: null,
  poorLcpPages: 0,
});

export const emptyErrorImpact = (): Pick<
  RumErrorGroup,
  'trendPoints' | 'firstSeen' | 'lastSeen' | 'isNew' | 'affectedPages'
> => ({
  trendPoints: [],
  firstSeen: null,
  lastSeen: null,
  isNew: false,
  affectedPages: [],
});

export const OTHER_ERROR_TREND_ID = '__other__';

export interface RumErrorTrendSeries {
  id: string;
  name: string;
  points: RumErrorTrendPoint[];
}

/** Stack the top N groups; remaining counts roll into a single Other series. */
export const stackErrorTrends = (
  groups: Array<Pick<RumErrorGroup, 'key' | 'type' | 'count' | 'trendPoints'>>,
  topN = 5
): RumErrorTrendSeries[] => {
  const ranked = [...groups].sort((a, b) => b.count - a.count);
  const top = ranked.slice(0, topN);
  const rest = ranked.slice(topN);
  const timestamps = new Set<string>();
  for (const group of ranked) {
    for (const point of group.trendPoints) {
      timestamps.add(point.timestamp);
    }
  }
  const times = [...timestamps].sort();
  const countAt = (group: Pick<RumErrorGroup, 'trendPoints'>, timestamp: string): number =>
    group.trendPoints.find((point) => point.timestamp === timestamp)?.count ?? 0;

  const series: RumErrorTrendSeries[] = top.map((group) => ({
    id: group.key,
    name: group.type,
    points: times.map((timestamp) => ({ timestamp, count: countAt(group, timestamp) })),
  }));
  if (rest.length > 0) {
    series.push({
      id: OTHER_ERROR_TREND_ID,
      name: 'Other',
      points: times.map((timestamp) => ({
        timestamp,
        count: rest.reduce((sum, group) => sum + countAt(group, timestamp), 0),
      })),
    });
  }
  return series;
};

export interface RumErrorsResponse {
  groups: RumErrorGroup[];
  total: number;
  kpis: RumErrorsKpis;
}

/**
 * User-agent substrings treated as bot traffic. Deliberately conservative:
 * 'headless' is excluded so local Playwright-generated demo data stays visible.
 */
export const BOT_UA_TOKENS = [
  'bot',
  'spider',
  'crawl',
  'slurp',
  'lighthouse',
  'pingdom',
  'gtmetrix',
  'phantomjs',
  'curl',
  'wget',
  'python-requests',
  'go-http-client',
  'okhttp',
] as const;

export const isBotUserAgent = (ua: string | null | undefined): boolean => {
  if (!ua) {
    return false;
  }
  const lower = ua.toLowerCase();
  return BOT_UA_TOKENS.some((token) => lower.includes(token));
};

/** Stable group key from exception type + first line of message. */
export const makeErrorGroupKey = (type: string | null, message: string | null): string => {
  const kind = (type || 'Error').trim().slice(0, 80) || 'Error';
  const firstLine = (message || '').split('\n')[0].trim().slice(0, 120);
  return `${kind}|${firstLine}`;
};

/** Convert OTel duration (ns / µs / ms) to milliseconds. */
export const durationToMs = (value: number | null | undefined): number | null => {
  if (value == null || !Number.isFinite(value) || value < 0) {
    return null;
  }
  if (value > 1e7) {
    return value / 1e6;
  }
  if (value > 1e5) {
    return value / 1e3;
  }
  return value;
};

export const ranksFromPercentileRanks = (
  values?: Record<string, number | null>
): RumVitalRanks | null => {
  if (!values) {
    return null;
  }
  const nums = Object.values(values).filter((v): v is number => typeof v === 'number');
  if (nums.length < 2) {
    return null;
  }
  // Same rounding as classic getRanksPercentages — integers that sum to 100.
  const goodRounded = Number(nums[0].toFixed(0));
  const upToNiRounded = Number(nums[1].toFixed(0));
  return {
    good: Math.max(0, Math.min(100, goodRounded)),
    ni: Math.max(0, Math.min(100, upToNiRounded - goodRounded)),
    poor: Math.max(0, Math.min(100, 100 - upToNiRounded)),
  };
};

/** Weighted good / NI / poor percents from stored daily counts. */
export const ranksFromCounts = (good: number, ni: number, poor: number): RumVitalRanks | null => {
  const total = good + ni + poor;
  if (total <= 0) {
    return null;
  }
  return ranksFromPercentileRanks({
    good: (good / total) * 100,
    ni: ((good + ni) / total) * 100,
  });
};
