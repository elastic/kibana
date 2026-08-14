/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import type {
  RumCountryRow,
  RumErrorGroup,
  RumFacetBucket,
  RumFrustrationCounts,
  RumOverviewResponse,
  RumPageRow,
} from './rum_app';
import type { FunnelStepDef, FunnelStepStats } from './session_funnel';
import { DEFAULT_FUNNEL_STEPS, FUNNEL_MAX_STEPS, FUNNEL_MIN_STEPS } from './session_funnel';
import type { FrictionPattern } from './session_patterns';
import type { SessionUser } from './session_replay';

export const RUM_REPORT_TEMPLATE_IDS = [
  'scorecard',
  'pages',
  'errors',
  'frustration',
  'funnel',
  'clients',
  'users',
] as const;

export type RumReportTemplateId = (typeof RUM_REPORT_TEMPLATE_IDS)[number];

export const isRumReportTemplateId = (value: string): value is RumReportTemplateId =>
  (RUM_REPORT_TEMPLATE_IDS as readonly string[]).includes(value);

export const CSV_ROW_CAP = 10_000;

export const CWV_LCP_POOR_MS = 4000;

export type RumReportCompareMode = 'previous' | 'none';

export interface RumReportDelta {
  current: number | null;
  previous: number | null;
  abs: number | null;
  pct: number | null;
}

export interface RumReportSessionChip {
  sessionId: string;
  startTime: string | null;
  durationMs: number;
  errorCount: number;
  rageClickCount: number;
  hasReplay: boolean;
  displayUser: string | null;
  browser: string | null;
}

export interface RumReportPageRow extends RumPageRow {
  viewsDelta: RumReportDelta;
  p75LcpDelta: RumReportDelta;
}

export interface RumReportCountryRow extends RumCountryRow {
  pageViewsDelta: RumReportDelta;
  sessionsDelta: RumReportDelta;
  errorCountDelta: RumReportDelta;
}

export interface RumReportErrorRow extends RumErrorGroup {
  countDelta: RumReportDelta;
}

export interface RumReportUserRow {
  key: string;
  displayUser: string;
  email: string | null;
  sessionCount: number;
  errorSessions: number;
  rageSessions: number;
  lastSeen: string | null;
}

export interface RumReportClientCell {
  browser: string;
  os: string;
  sessions: number;
  errorSessions: number;
}

export interface RumReportMeta {
  templateId: RumReportTemplateId;
  title: string;
  serviceName: string | null;
  rangeFrom: string;
  rangeTo: string;
  compareFrom: string | null;
  compareTo: string | null;
  generatedAt: string;
  noPreviousPeriod: boolean;
}

export interface RumScorecardReport extends RumReportMeta {
  templateId: 'scorecard';
  kpis: {
    sessions: RumReportDelta;
    pageViews: RumReportDelta;
    errorRate: RumReportDelta;
    p75LoadMs: RumReportDelta;
    p75Inp: RumReportDelta;
  };
  vitals: RumOverviewResponse['vitals'];
  vitalsPrevious: RumOverviewResponse['vitals'] | null;
  trends: RumOverviewResponse['trends'];
  frustration: RumFrustrationCounts;
  frustrationPrevious: RumFrustrationCounts | null;
  topPages: RumReportPageRow[];
  errorGroups: RumReportErrorRow[];
  sampleSessions: RumReportSessionChip[];
  browsers: RumFacetBucket[];
  os: RumFacetBucket[];
  countries: RumReportCountryRow[];
}

export interface RumPagesReport extends RumReportMeta {
  templateId: 'pages';
  kpis: {
    pageViews: RumReportDelta;
    distinctPaths: RumReportDelta;
    poorLcpPct: RumReportDelta;
  };
  mostViewed: RumReportPageRow[];
  slowest: RumReportPageRow[];
  sampleSessions: RumReportSessionChip[];
  worstPath: string | null;
}

export interface RumErrorsReport extends RumReportMeta {
  templateId: 'errors';
  kpis: {
    errorSessions: RumReportDelta;
    errorRate: RumReportDelta;
    distinctGroups: RumReportDelta;
    identifiedUsers: RumReportDelta;
  };
  groups: RumReportErrorRow[];
  sampleSessions: RumReportSessionChip[];
  topGroupKey: string | null;
}

export interface RumFrustrationReport extends RumReportMeta {
  templateId: 'frustration';
  kpis: {
    rageSessions: RumReportDelta;
    deadClickSessions: RumReportDelta;
    errorSessions: RumReportDelta;
  };
  friction: FrictionPattern[];
  sampleSessions: RumReportSessionChip[];
}

export interface RumFunnelReport extends RumReportMeta {
  templateId: 'funnel';
  kpis: {
    conversion: RumReportDelta;
    sessionsConsidered: RumReportDelta;
  };
  steps: FunnelStepStats[];
  stepsPrevious: FunnelStepStats[] | null;
  sampleSessions: RumReportSessionChip[];
}

export interface RumClientsReport extends RumReportMeta {
  templateId: 'clients';
  browsers: RumFacetBucket[];
  os: RumFacetBucket[];
  countries: RumCountryRow[];
  nested: RumReportClientCell[];
  mobileSessions: number;
  desktopSessions: number;
  sampleSessions: RumReportSessionChip[];
}

export interface RumUsersReport extends RumReportMeta {
  templateId: 'users';
  users: RumReportUserRow[];
  identifiedCount: number;
  sampleSessions: RumReportSessionChip[];
}

export type RumReportResponse =
  | RumScorecardReport
  | RumPagesReport
  | RumErrorsReport
  | RumFrustrationReport
  | RumFunnelReport
  | RumClientsReport
  | RumUsersReport;

export const rumReportTitle = (templateId: RumReportTemplateId): string => {
  switch (templateId) {
    case 'scorecard':
      return i18n.translate('xpack.ux.reports.scorecard.title', {
        defaultMessage: 'Weekly UX scorecard',
      });
    case 'pages':
      return i18n.translate('xpack.ux.reports.pages.title', {
        defaultMessage: 'Page performance',
      });
    case 'errors':
      return i18n.translate('xpack.ux.reports.errors.title', {
        defaultMessage: 'Error impact',
      });
    case 'frustration':
      return i18n.translate('xpack.ux.reports.frustration.title', {
        defaultMessage: 'Frustration / rage-click',
      });
    case 'funnel':
      return i18n.translate('xpack.ux.reports.funnel.title', {
        defaultMessage: 'Journey conversion',
      });
    case 'clients':
      return i18n.translate('xpack.ux.reports.clients.title', {
        defaultMessage: 'Browser / OS / device mix',
      });
    case 'users':
      return i18n.translate('xpack.ux.reports.users.title', {
        defaultMessage: 'Named-user experience',
      });
  }
};

/** Equal-length window immediately before `rangeFrom`. */
export const previousEqualPeriod = (
  rangeFrom: string,
  rangeTo: string
): { currentFrom: string; currentTo: string; compareFrom: string; compareTo: string } | null => {
  const from = dateMath.parse(rangeFrom);
  const to = dateMath.parse(rangeTo, { roundUp: true });
  if (!from?.isValid() || !to?.isValid()) {
    return null;
  }
  const fromMs = from.valueOf();
  const toMs = to.valueOf();
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) {
    return null;
  }
  const durationMs = toMs - fromMs;
  return {
    currentFrom: new Date(fromMs).toISOString(),
    currentTo: new Date(toMs).toISOString(),
    compareFrom: new Date(fromMs - durationMs).toISOString(),
    compareTo: new Date(fromMs).toISOString(),
  };
};

/** Previous complete Mon 00:00 → Mon 00:00 in the local timezone. */
export const previousCompleteCalendarWeek = (
  now: Date = new Date()
): { rangeFrom: string; rangeTo: string } => {
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  const daysSinceMonday = (cursor.getDay() + 6) % 7;
  const thisMonday = new Date(cursor);
  thisMonday.setDate(cursor.getDate() - daysSinceMonday);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  return {
    rangeFrom: lastMonday.toISOString(),
    rangeTo: thisMonday.toISOString(),
  };
};

export const isLiveRelativeRange = (rangeFrom?: string, rangeTo?: string): boolean => {
  const from = rangeFrom ?? '';
  const to = rangeTo ?? '';
  return from.startsWith('now') || to.startsWith('now') || from.length === 0 || to.length === 0;
};

export const computeDelta = (current: number | null, previous: number | null): RumReportDelta => {
  if (current == null) {
    return { current: null, previous, abs: null, pct: null };
  }
  if (previous == null) {
    return { current, previous: null, abs: null, pct: null };
  }
  const abs = current - previous;
  const pct = previous === 0 ? (current === 0 ? 0 : null) : abs / previous;
  return { current, previous, abs, pct };
};

export const maskDisplayUser = (user: SessionUser, includePii: boolean): string | null => {
  if (includePii) {
    return user.name || user.email || user.id;
  }
  if (user.name) {
    return user.name;
  }
  if (user.id) {
    return user.id;
  }
  if (user.email) {
    return i18n.translate('xpack.ux.reports.identifiedUserLabel', {
      defaultMessage: 'Identified user',
    });
  }
  return null;
};

export const userGroupKey = (user: SessionUser): string | null =>
  user.id || user.email || user.name;

const csvEscape = (cell: string | number | null | undefined): string => {
  const value = cell == null ? '' : String(cell);
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const toCsv = (
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): string => {
  const sliced = rows.slice(0, CSV_ROW_CAP);
  return [
    headers.map(csvEscape).join(','),
    ...sliced.map((row) => row.map(csvEscape).join(',')),
  ].join('\n');
};

export const csvFilename = (templateId: string, rangeFrom: string, rangeTo: string): string => {
  const safe = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 32) || 'range';
  return `ux-${templateId}-${safe(rangeFrom)}-${safe(rangeTo)}.csv`;
};

export const parseFunnelStepsParam = (raw?: string): FunnelStepDef[] => {
  if (!raw) {
    return DEFAULT_FUNNEL_STEPS;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return DEFAULT_FUNNEL_STEPS;
    }
    const steps: FunnelStepDef[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const type = (item as { type?: unknown }).type;
      const value = (item as { value?: unknown }).value;
      const label = (item as { label?: unknown }).label;
      if ((type !== 'page' && type !== 'activity') || typeof value !== 'string' || !value.trim()) {
        continue;
      }
      steps.push({
        type,
        value: value.trim().slice(0, 200),
        ...(typeof label === 'string' && label.trim() ? { label: label.trim().slice(0, 80) } : {}),
      });
    }
    return steps.length >= FUNNEL_MIN_STEPS
      ? steps.slice(0, FUNNEL_MAX_STEPS)
      : DEFAULT_FUNNEL_STEPS;
  } catch {
    return DEFAULT_FUNNEL_STEPS;
  }
};

export const joinPageRows = (
  current: RumPageRow[],
  previous: RumPageRow[] | null
): RumReportPageRow[] => {
  const prev = new Map((previous ?? []).map((page) => [page.path, page]));
  return current.map((page) => ({
    ...page,
    viewsDelta: computeDelta(page.views, prev.get(page.path)?.views ?? null),
    p75LcpDelta: computeDelta(page.p75Lcp, prev.get(page.path)?.p75Lcp ?? null),
  }));
};

export const joinCountryRows = (
  current: RumCountryRow[],
  previous: RumCountryRow[] | null
): RumReportCountryRow[] => {
  const prev = new Map((previous ?? []).map((row) => [row.isoCode, row]));
  return current.map((row) => ({
    ...row,
    pageViewsDelta: computeDelta(row.pageViews, prev.get(row.isoCode)?.pageViews ?? null),
    sessionsDelta: computeDelta(row.sessions, prev.get(row.isoCode)?.sessions ?? null),
    errorCountDelta: computeDelta(row.errorCount, prev.get(row.isoCode)?.errorCount ?? null),
  }));
};

export const joinErrorGroups = (
  current: RumErrorGroup[],
  previous: RumErrorGroup[] | null
): RumReportErrorRow[] => {
  const prev = new Map((previous ?? []).map((group) => [group.key, group]));
  return current.map((group) => ({
    ...group,
    countDelta: computeDelta(group.count, prev.get(group.key)?.count ?? null),
  }));
};

export const poorLcpShare = (pages: RumPageRow[]): number | null => {
  const measured = pages.filter((page) => page.p75Lcp != null);
  if (measured.length === 0) {
    return null;
  }
  const poor = measured.filter((page) => (page.p75Lcp ?? 0) >= CWV_LCP_POOR_MS).length;
  return poor / measured.length;
};

export const overviewIsEmpty = (overview: RumOverviewResponse): boolean =>
  overview.kpis.sessions === 0 && overview.kpis.pageViews === 0;

const formatSignedPct = (pct: number | null): string => {
  if (pct == null || !Number.isFinite(pct)) {
    return 'n/a';
  }
  const rounded = Math.round(pct * 1000) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
};

const kpiLine = (
  label: string,
  delta: RumReportDelta,
  format: (value: number) => string
): string => {
  const current = delta.current == null ? '—' : format(delta.current);
  return `• ${label}: ${current} (${formatSignedPct(delta.pct)} vs previous)`;
};

export const scorecardMarkdown = (report: RumScorecardReport, shareUrl: string): string => {
  const formatCount = (value: number) => String(Math.round(value));
  const formatMs = (value: number) =>
    value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
  const formatRate = (value: number) => `${Math.round(value * 1000) / 10}%`;

  const poorPages = [...report.topPages]
    .filter((page) => page.p75Lcp != null && page.p75Lcp >= CWV_LCP_POOR_MS)
    .sort((a, b) => (b.p75Lcp ?? 0) - (a.p75Lcp ?? 0))
    .slice(0, 3);
  const topErrors = report.errorGroups.slice(0, 3);

  const pageLines =
    poorPages.length === 0
      ? ['• None with poor LCP in the top pages']
      : poorPages.map((page) => `• ${page.path} (LCP p75 ${formatMs(page.p75Lcp ?? 0)})`);
  const errorLines =
    topErrors.length === 0
      ? ['• None']
      : topErrors.map((group) => `• ${group.type}: ${group.message} (${group.count})`);
  const countryLines =
    report.countries.length === 0
      ? ['• None']
      : report.countries
          .slice(0, 8)
          .map(
            (row) =>
              `• ${row.name} (${row.isoCode}): ${row.pageViews} views, ${row.sessions} sessions, ${row.errorCount} errors`
          );

  return [
    `# ${report.title}`,
    report.serviceName ? `Service: ${report.serviceName}` : 'Service: all',
    `Period: ${report.rangeFrom} → ${report.rangeTo}`,
    report.compareFrom && report.compareTo
      ? `Compared to: ${report.compareFrom} → ${report.compareTo}`
      : 'Compared to: none',
    '',
    kpiLine('Sessions', report.kpis.sessions, formatCount),
    kpiLine('Page views', report.kpis.pageViews, formatCount),
    kpiLine('Error rate', report.kpis.errorRate, formatRate),
    kpiLine('p75 load', report.kpis.p75LoadMs, formatMs),
    kpiLine('p75 INP', report.kpis.p75Inp, formatMs),
    '',
    'Top poor pages:',
    ...pageLines,
    '',
    'Top errors:',
    ...errorLines,
    '',
    'Top countries:',
    ...countryLines,
    '',
    `Share: ${shareUrl}`,
  ].join('\n');
};

export const reportPrimaryCsv = (report: RumReportResponse): string => {
  switch (report.templateId) {
    case 'scorecard':
    case 'pages': {
      const rows = report.templateId === 'pages' ? report.mostViewed : report.topPages;
      return toCsv(
        ['path', 'views', 'p75Lcp', 'p75Inp', 'p75Cls', 'errors'],
        rows.map((page) => [
          page.path,
          page.views,
          page.p75Lcp,
          page.p75Inp,
          page.p75Cls,
          page.errorCount,
        ])
      );
    }
    case 'errors':
      return toCsv(
        ['type', 'message', 'count', 'sessions', 'users'],
        report.groups.map((group) => [
          group.type,
          group.message,
          group.count,
          group.sessionCount,
          group.userCount,
        ])
      );
    case 'frustration':
      return toCsv(
        ['kind', 'step', 'sessions', 'share'],
        report.friction.map((row) => [row.kind, row.step, row.sessionCount, row.share])
      );
    case 'funnel':
      return toCsv(
        ['step', 'count', 'conversionFromStart', 'dropOff'],
        report.steps.map((step) => [
          step.label,
          step.count,
          step.conversionFromStart,
          step.dropOffCount,
        ])
      );
    case 'clients':
      return toCsv(
        ['browser', 'os', 'sessions', 'errorSessions'],
        report.nested.map((row) => [row.browser, row.os, row.sessions, row.errorSessions])
      );
    case 'users': {
      const withEmail = report.users.some((row) => row.email);
      return toCsv(
        withEmail
          ? ['user', 'email', 'sessions', 'errorSessions', 'rageSessions', 'lastSeen']
          : ['user', 'sessions', 'errorSessions', 'rageSessions', 'lastSeen'],
        report.users.map((row) =>
          withEmail
            ? [
                row.displayUser,
                row.email,
                row.sessionCount,
                row.errorSessions,
                row.rageSessions,
                row.lastSeen,
              ]
            : [row.displayUser, row.sessionCount, row.errorSessions, row.rageSessions, row.lastSeen]
        )
      );
    }
  }
};
