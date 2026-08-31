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
  /** Single-page sessions / sessions with ≥1 page view. Null when dest is not queried. */
  bounceRate: number | null;
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

/**
 * Session-dest started counts on an existing series. Keeps page views / errors.
 *
 * The two series come from independent histograms (raw `@timestamp` vs dest
 * `start_time`), so their bucket boundaries do not line up. Session counts are
 * folded into the bucket of `trends` that contains them rather than matched on
 * an equal timestamp.
 */
export const applySessionIndexTrendSessions = (
  trends: RumTrendPoint[],
  sessionTrends: RumTrendPoint[]
): RumTrendPoint[] => {
  if (sessionTrends.length === 0 || trends.length === 0) {
    return trends;
  }
  const startMs = trends.map((point) => Date.parse(point.timestamp));
  if (startMs.some((ms) => !Number.isFinite(ms))) {
    return trends;
  }
  const sessionsByBucket = new Array<number>(trends.length).fill(0);
  for (const point of sessionTrends) {
    const ms = Date.parse(point.timestamp);
    if (!Number.isFinite(ms)) {
      continue;
    }
    let bucket = 0;
    while (bucket + 1 < startMs.length && startMs[bucket + 1] <= ms) {
      bucket += 1;
    }
    sessionsByBucket[bucket] += point.sessions;
  }
  return trends.map((point, index) => ({ ...point, sessions: sessionsByBucket[index] }));
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

/** Same buckets as Overview `percentile_ranks` (includes FCP / TTFB). */
export const VITAL_RANK_THRESHOLDS = {
  ...CWV_THRESHOLDS,
  fcp: { good: 1800, ni: 3000 },
  ttfb: { good: 800, ni: 1800 },
} as const;

export const rateVital = (
  vital: keyof typeof VITAL_RANK_THRESHOLDS,
  value: number | null
): RumVitalRating | null => {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  const threshold = VITAL_RANK_THRESHOLDS[vital];
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

/** Raw client.geo keeps views/LCP; session-dest country_iso fills countries with no ingest geo. */
export const mergeRumCountries = (
  raw: RumCountryRow[],
  dest: Array<{ key: string; count: number }>
): RumCountryRow[] => {
  const byIso = new Map<string, RumCountryRow>();
  for (const row of raw) {
    const isoCode = row.isoCode.toUpperCase();
    if (!isoCode) {
      continue;
    }
    byIso.set(isoCode, { ...row, isoCode });
  }
  for (const facet of dest) {
    const isoCode = String(facet.key).toUpperCase();
    if (!isoCode) {
      continue;
    }
    const existing = byIso.get(isoCode);
    if (existing) {
      if (existing.sessions === 0) {
        existing.sessions = facet.count;
      }
      continue;
    }
    byIso.set(isoCode, {
      isoCode,
      name: isoCode,
      pageViews: 0,
      sessions: facet.count,
      errorCount: 0,
      p75Lcp: null,
    });
  }
  return [...byIso.values()].sort((a, b) => b.pageViews - a.pageViews || b.sessions - a.sessions);
};

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

export interface RumErrorAppCount {
  name: string;
  count: number;
}

export type RumErrorPattern = 'new' | 'regressed' | 'persistent' | 'improving';

export interface RumFailingApp {
  name: string;
  errorEvents: number;
  impactedSessions: number;
  totalSessions: number;
  errorRate: number;
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
  affectedApps: RumErrorAppCount[];
  previousCount: number;
  pattern: RumErrorPattern;
}

export interface RumErrorsKpis {
  errorEvents: number;
  impactedSessions: number;
  totalSessions: number;
  impactedUsers: number;
  newGroups: number;
  affectedApps: number;
  totalApps: number;
  sharedGroups: number;
  previousErrorEvents: number;
  previousImpactedSessions: number;
}

export const emptyErrorsKpis = (): RumErrorsKpis => ({
  errorEvents: 0,
  impactedSessions: 0,
  totalSessions: 0,
  impactedUsers: 0,
  newGroups: 0,
  affectedApps: 0,
  totalApps: 0,
  sharedGroups: 0,
  previousErrorEvents: 0,
  previousImpactedSessions: 0,
});

export const emptyPagesKpis = (): RumPagesKpis => ({
  views: 0,
  sessions: 0,
  passingCwvPct: null,
  poorLcpPages: 0,
});

export const emptyErrorImpact = (): Pick<
  RumErrorGroup,
  | 'trendPoints'
  | 'firstSeen'
  | 'lastSeen'
  | 'isNew'
  | 'affectedPages'
  | 'affectedApps'
  | 'previousCount'
  | 'pattern'
> => ({
  trendPoints: [],
  firstSeen: null,
  lastSeen: null,
  isNew: false,
  affectedPages: [],
  affectedApps: [],
  previousCount: 0,
  pattern: 'persistent',
});

/** Prefer OTel `service.name` buckets when the same app also appears on the classic field. */
export const mergePreferOtelByName = <T extends { name: string }>(otel: T[], classic: T[]): T[] => {
  const names = new Set(otel.map((row) => row.name));
  return [...otel, ...classic.filter((row) => !names.has(row.name))];
};

/** New = first seen in this window; regressed = returned after a quiet previous window. */
export const classifyErrorPattern = ({
  isNew,
  count,
  previousCount,
}: {
  isNew: boolean;
  count: number;
  previousCount: number;
}): RumErrorPattern => {
  if (previousCount <= 0) {
    return isNew ? 'new' : 'regressed';
  }
  if (count < previousCount * 0.8) {
    return 'improving';
  }
  return 'persistent';
};

export const rumFailingApps = (
  errorRows: Array<{ name: string; errorEvents: number; impactedSessions: number }>,
  sessionRows: Array<{ name: string; totalSessions: number }>
): RumFailingApp[] => {
  const sessionsByName = new Map(sessionRows.map((row) => [row.name, row.totalSessions]));
  return [...errorRows]
    .map((row) => {
      const totalSessions = sessionsByName.get(row.name) ?? 0;
      return {
        name: row.name,
        errorEvents: row.errorEvents,
        impactedSessions: row.impactedSessions,
        totalSessions,
        errorRate: totalSessions > 0 ? row.impactedSessions / totalSessions : 0,
      };
    })
    .sort((a, b) => {
      if (b.errorEvents !== a.errorEvents) {
        return b.errorEvents - a.errorEvents;
      }
      return a.name.localeCompare(b.name);
    });
};

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
  topFailingApps: RumFailingApp[];
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
  'synthetics',
] as const;

export const BOT_UA_TOKEN_CAP = 30;
export const BOT_UA_PARAM_MAX = 512;
const BOT_UA_TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,39}$/;

/** Parse a comma-separated UA keyword list. Returns null when nothing valid remains. */
export const tryParseBotUaTokens = (raw?: string): string[] | null => {
  if (!raw?.trim()) {
    return null;
  }
  const seen = new Set<string>();
  const values: string[] = [];
  for (const part of raw.split(',')) {
    const token = part.trim().toLowerCase();
    if (!BOT_UA_TOKEN_RE.test(token) || seen.has(token)) {
      continue;
    }
    seen.add(token);
    values.push(token);
    if (values.length >= BOT_UA_TOKEN_CAP) {
      break;
    }
  }
  return values.length > 0 ? values : null;
};

/** Parse a comma-separated UA keyword list. Empty / invalid input falls back to defaults. */
export const parseBotUaTokens = (raw?: string): string[] =>
  tryParseBotUaTokens(raw) ?? [...BOT_UA_TOKENS];

export const formatBotUaTokens = (tokens: readonly string[]): string => tokens.join(', ');

export const isDefaultBotUaTokens = (tokens: readonly string[]): boolean => {
  if (tokens.length !== BOT_UA_TOKENS.length) {
    return false;
  }
  const set = new Set(tokens);
  return BOT_UA_TOKENS.every((token) => set.has(token));
};

/** URL value for a token list. Empty means "use the defaults". */
export const botUaSearchValue = (tokens: readonly string[]): string =>
  isDefaultBotUaTokens(tokens) ? '' : tokens.join(',');

export const isBotUserAgent = (ua: string | null | undefined, botUa?: string): boolean => {
  if (!ua) {
    return false;
  }
  const lower = ua.toLowerCase();
  return parseBotUaTokens(botUa).some((token) => lower.includes(token));
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
