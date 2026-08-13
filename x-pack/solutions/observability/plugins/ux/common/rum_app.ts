/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export interface RumPageRow {
  path: string;
  views: number;
  errorCount: number;
  p75Lcp: number | null;
  p75Inp: number | null;
  p75Cls: number | null;
  avgDurationMs: number | null;
  attribution: RumVitalAttribution;
  resources: RumResourceRow[];
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
}

export interface RumPagesResponse {
  pages: RumPageRow[];
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
  samplePage: string | null;
  sampleAction: string | null;
  sampleTraceId: string | null;
}

export interface RumErrorsResponse {
  groups: RumErrorGroup[];
  total: number;
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
  const good = nums[0];
  const upToNi = nums[1];
  return {
    good: Math.max(0, Math.min(100, good)),
    ni: Math.max(0, Math.min(100, upToNi - good)),
    poor: Math.max(0, Math.min(100, 100 - upToNi)),
  };
};
