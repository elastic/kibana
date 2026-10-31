/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { i18n } from '@kbn/i18n';
import type {
  RumErrorsResponse,
  RumOverviewResponse,
  RumPagesResponse,
} from '../../../common/rum_app';
import {
  computeDelta,
  isRumReportTemplateId,
  joinCountryRows,
  joinErrorGroups,
  joinPageRows,
  maskDisplayUser,
  overviewIsEmpty,
  parseFunnelStepsParam,
  poorLcpShare,
  previousEqualPeriod,
  rumReportTitle,
  userGroupKey,
  type RumReportClientCell,
  type RumReportResponse,
  type RumReportSessionChip,
  type RumReportTemplateId,
  type RumReportUserRow,
} from '../../../common/rum_report';
import type { SessionFunnelResponse } from '../../../common/session_funnel';
import type { SessionPatternsResponse } from '../../../common/session_patterns';
import type { RumSessionSummary, SessionListResponse } from '../../../common/session_replay';
import { createUxServerRoute } from '../create_ux_server_route';
import { getSessionFunnelRoute } from '../session_replay/funnel';
import { listSessionReplaySessionsRoute } from '../session_replay/list_sessions';
import { getSessionPatternsRoute } from '../session_replay/patterns';
import type { UxRouteHandlerResources } from '../types';
import { getRumErrorsRoute } from './errors';
import { isRumEsTimeout, withRumEsRetry } from './es_retry';
import { getRumOverviewRoute } from './overview';
import { getRumPagesRoute } from './pages';
import { boundedString, rumListQueryCodec } from './query';

const templateIdCodec = t.keyof({
  scorecard: null,
  pages: null,
  errors: null,
  frustration: null,
  funnel: null,
  clients: null,
  users: null,
});

const rumReportQueryCodec = t.intersection([
  rumListQueryCodec,
  t.partial({
    compare: boundedString(16),
    includePii: boundedString(8),
    funnelSteps: boundedString(4096),
  }),
]);

type RumListQuery = t.TypeOf<typeof rumListQueryCodec>;
export type RumReportQuery = t.TypeOf<typeof rumReportQueryCodec>;
type ReportQuery = RumReportQuery;

const callRoute = async <T>(
  route: Record<string, unknown>,
  resources: UxRouteHandlerResources,
  params: unknown
): Promise<T> => {
  const def = Object.values(route)[0] as {
    handler: (routeResources: unknown) => Promise<T>;
  };
  return def.handler({ ...resources, params });
};

const withRange = (query: RumListQuery, rangeFrom: string, rangeTo: string): RumListQuery => ({
  ...query,
  rangeFrom,
  rangeTo,
});

export const fetchOverview = (
  resources: UxRouteHandlerResources,
  query: RumListQuery
): Promise<RumOverviewResponse> => callRoute(getRumOverviewRoute, resources, { query });

export const fetchPages = (
  resources: UxRouteHandlerResources,
  query: RumListQuery
): Promise<RumPagesResponse> => callRoute(getRumPagesRoute, resources, { query });

export const fetchErrors = (
  resources: UxRouteHandlerResources,
  query: RumListQuery
): Promise<RumErrorsResponse> => callRoute(getRumErrorsRoute, resources, { query });

export const fetchSessions = (
  resources: UxRouteHandlerResources,
  query: RumListQuery & {
    sortField?: string;
    sortDirection?: string;
    perPage?: string;
    page?: string;
    hasErrors?: string;
    hasRage?: string;
    hasDead?: string;
    hasBounced?: string;
    errorGroup?: string;
    sessionIds?: string;
    pageUrl?: string;
    frustration?: string;
    minDurationMs?: string;
  }
): Promise<SessionListResponse> => callRoute(listSessionReplaySessionsRoute, resources, { query });

const fetchFunnel = (
  resources: UxRouteHandlerResources,
  body: {
    rangeFrom: string;
    rangeTo: string;
    serviceName?: string;
    kuery?: string;
    steps: ReturnType<typeof parseFunnelStepsParam>;
  }
): Promise<SessionFunnelResponse> => callRoute(getSessionFunnelRoute, resources, { body });

const fetchPatterns = (
  resources: UxRouteHandlerResources,
  query: RumListQuery
): Promise<SessionPatternsResponse> => callRoute(getSessionPatternsRoute, resources, { query });

const toChips = (
  sessions: RumSessionSummary[],
  includePii: boolean,
  limit = 8
): RumReportSessionChip[] =>
  sessions.slice(0, limit).map((session) => ({
    sessionId: session.sessionId,
    startTime: session.startTime,
    durationMs: session.durationMs,
    errorCount: session.errorCount,
    rageClickCount: session.rageClickCount,
    hasReplay: session.hasReplay,
    displayUser: maskDisplayUser(session.user, includePii),
    browser: session.client.browser,
  }));

const pickWorstSessions = (sessions: RumSessionSummary[]): RumSessionSummary[] => {
  const ranked = [...sessions].sort(
    (a, b) => b.rageClickCount + b.errorCount - (a.rageClickCount + a.errorCount)
  );
  const flagged = ranked.filter((session) => session.rageClickCount > 0 || session.errorCount > 0);
  return (flagged.length > 0 ? flagged : ranked).slice(0, 8);
};

const resolveWindows = (query: ReportQuery) => {
  const rangeFrom = query.rangeFrom || 'now-24h';
  const rangeTo = query.rangeTo || 'now';
  const compareMode = query.compare === 'none' ? 'none' : 'previous';
  const includePii = query.includePii === 'true';
  const period = compareMode === 'previous' ? previousEqualPeriod(rangeFrom, rangeTo) : null;
  return {
    rangeFrom,
    rangeTo,
    includePii,
    compareMode,
    period,
    listQuery: withRange(query, rangeFrom, rangeTo),
    previousQuery: period ? withRange(query, period.compareFrom, period.compareTo) : null,
  };
};

const meta = (
  templateId: RumReportTemplateId,
  query: ReportQuery,
  rangeFrom: string,
  rangeTo: string,
  period: ReturnType<typeof previousEqualPeriod>,
  noPreviousPeriod: boolean,
  includeCompare = true
) => ({
  templateId,
  title: rumReportTitle(templateId),
  serviceName: query.serviceName ?? null,
  rangeFrom: period?.currentFrom ?? rangeFrom,
  rangeTo: period?.currentTo ?? rangeTo,
  compareFrom: includeCompare && !noPreviousPeriod ? period?.compareFrom ?? null : null,
  compareTo: includeCompare && !noPreviousPeriod ? period?.compareTo ?? null : null,
  generatedAt: new Date().toISOString(),
  noPreviousPeriod: includeCompare && noPreviousPeriod,
});

const buildScorecard = async (
  resources: UxRouteHandlerResources,
  query: ReportQuery
): Promise<RumReportResponse> => {
  const { rangeFrom, rangeTo, includePii, period, listQuery, previousQuery } =
    resolveWindows(query);
  const [current, errors, sessions] = await Promise.all([
    withRumEsRetry(() => fetchOverview(resources, listQuery)),
    withRumEsRetry(() => fetchErrors(resources, listQuery)),
    withRumEsRetry(() =>
      fetchSessions(resources, {
        ...listQuery,
        sortField: 'rageClickCount',
        sortDirection: 'desc',
        perPage: '50',
      })
    ),
  ]);
  const [previous, errorsPrevious] = previousQuery
    ? await Promise.all([
        withRumEsRetry(() => fetchOverview(resources, previousQuery)),
        withRumEsRetry(() => fetchErrors(resources, previousQuery)),
      ])
    : [null, null];
  const noPreviousPeriod = !previous || overviewIsEmpty(previous);
  const prev = noPreviousPeriod ? null : previous;
  return {
    ...meta('scorecard', query, rangeFrom, rangeTo, period, noPreviousPeriod),
    templateId: 'scorecard',
    kpis: {
      sessions: computeDelta(current.kpis.sessions, prev?.kpis.sessions ?? null),
      pageViews: computeDelta(current.kpis.pageViews, prev?.kpis.pageViews ?? null),
      errorRate: computeDelta(current.kpis.errorRate, prev?.kpis.errorRate ?? null),
      bounceRate: computeDelta(current.kpis.bounceRate, prev?.kpis.bounceRate ?? null),
      p75LoadMs: computeDelta(current.kpis.p75LoadMs, prev?.kpis.p75LoadMs ?? null),
      p75Inp: computeDelta(current.kpis.p75Inp, prev?.kpis.p75Inp ?? null),
    },
    vitals: current.vitals,
    vitalsPrevious: prev?.vitals ?? null,
    trends: current.trends,
    frustration: current.frustration,
    frustrationPrevious: prev?.frustration ?? null,
    topPages: joinPageRows(current.topPages, prev?.topPages ?? null).slice(0, 5),
    errorGroups: joinErrorGroups(errors.groups, errorsPrevious?.groups ?? null).slice(0, 5),
    sampleSessions: toChips(pickWorstSessions(sessions.sessions), includePii),
    browsers: current.browsers,
    os: current.os,
    countries: joinCountryRows(current.countries, prev?.countries ?? null).slice(0, 12),
  };
};

const buildPages = async (
  resources: UxRouteHandlerResources,
  query: ReportQuery
): Promise<RumReportResponse> => {
  const { rangeFrom, rangeTo, includePii, period, listQuery, previousQuery } =
    resolveWindows(query);
  const [current, previous] = await Promise.all([
    fetchPages(resources, listQuery),
    previousQuery ? fetchPages(resources, previousQuery) : Promise.resolve(null),
  ]);
  const noPreviousPeriod = !previous || previous.pages.length === 0;
  const rows = joinPageRows(current.pages, noPreviousPeriod ? null : previous?.pages ?? null);
  const mostViewed = [...rows].sort((a, b) => b.views - a.views).slice(0, 8);
  const slowest = [...rows]
    .filter((page) => page.p75Lcp != null)
    .sort((a, b) => (b.p75Lcp ?? 0) - (a.p75Lcp ?? 0))
    .slice(0, 8);
  const worstPath = slowest[0]?.path ?? mostViewed[0]?.path ?? null;
  const sessions = worstPath
    ? await fetchSessions(resources, {
        ...listQuery,
        pageUrl: worstPath,
        sortField: 'durationMs',
        sortDirection: 'desc',
        perPage: '6',
      })
    : { sessions: [] };
  const currentViews = current.pages.reduce((sum, page) => sum + page.views, 0);
  const previousViews = previous?.pages.reduce((sum, page) => sum + page.views, 0) ?? null;
  return {
    ...meta('pages', query, rangeFrom, rangeTo, period, noPreviousPeriod),
    templateId: 'pages',
    kpis: {
      pageViews: computeDelta(currentViews, noPreviousPeriod ? null : previousViews),
      distinctPaths: computeDelta(
        current.pages.length,
        noPreviousPeriod ? null : previous?.pages.length ?? null
      ),
      poorLcpPct: computeDelta(
        poorLcpShare(current.pages),
        noPreviousPeriod ? null : poorLcpShare(previous?.pages ?? [])
      ),
    },
    mostViewed,
    slowest,
    sampleSessions: toChips(sessions.sessions, includePii, 6),
    worstPath,
  };
};

const buildErrors = async (
  resources: UxRouteHandlerResources,
  query: ReportQuery
): Promise<RumReportResponse> => {
  const { rangeFrom, rangeTo, includePii, period, listQuery, previousQuery } =
    resolveWindows(query);
  const [current, previous, overview, overviewPrevious] = await Promise.all([
    fetchErrors(resources, listQuery),
    previousQuery ? fetchErrors(resources, previousQuery) : Promise.resolve(null),
    fetchOverview(resources, listQuery),
    previousQuery ? fetchOverview(resources, previousQuery) : Promise.resolve(null),
  ]);
  const noPreviousPeriod = !previous || (previous.groups.length === 0 && previous.total === 0);
  const groups = joinErrorGroups(
    current.groups,
    noPreviousPeriod ? null : previous?.groups ?? null
  );
  const topGroupKey = groups[0]?.key ?? null;
  const sessions = topGroupKey
    ? await fetchSessions(resources, {
        ...listQuery,
        errorGroup: topGroupKey,
        sortField: 'errorCount',
        sortDirection: 'desc',
        perPage: '8',
      })
    : { sessions: [] };
  const identified = (list: SessionListResponse | { sessions: RumSessionSummary[] }) =>
    new Set(
      list.sessions
        .map((session) => userGroupKey(session.user))
        .filter((key): key is string => Boolean(key))
    ).size;
  const errorSessions = await fetchSessions(resources, {
    ...listQuery,
    hasErrors: 'true',
    perPage: '100',
  });
  const previousErrorSessions = previousQuery
    ? await fetchSessions(resources, { ...previousQuery, hasErrors: 'true', perPage: '100' })
    : null;
  return {
    ...meta('errors', query, rangeFrom, rangeTo, period, noPreviousPeriod),
    templateId: 'errors',
    kpis: {
      errorSessions: computeDelta(
        overview.kpis.errorSessions,
        noPreviousPeriod ? null : overviewPrevious?.kpis.errorSessions ?? null
      ),
      errorRate: computeDelta(
        overview.kpis.errorRate,
        noPreviousPeriod ? null : overviewPrevious?.kpis.errorRate ?? null
      ),
      distinctGroups: computeDelta(
        current.groups.length,
        noPreviousPeriod ? null : previous?.groups.length ?? null
      ),
      identifiedUsers: computeDelta(
        identified(errorSessions),
        noPreviousPeriod || !previousErrorSessions ? null : identified(previousErrorSessions)
      ),
    },
    groups: groups.slice(0, 12),
    sampleSessions: toChips(sessions.sessions, includePii),
    topGroupKey,
  };
};

const buildFrustration = async (
  resources: UxRouteHandlerResources,
  query: ReportQuery
): Promise<RumReportResponse> => {
  const { rangeFrom, rangeTo, includePii, period, listQuery, previousQuery } =
    resolveWindows(query);
  const [current, previous, patterns, sessions] = await Promise.all([
    fetchOverview(resources, listQuery),
    previousQuery ? fetchOverview(resources, previousQuery) : Promise.resolve(null),
    fetchPatterns(resources, listQuery),
    fetchSessions(resources, {
      ...listQuery,
      hasRage: 'true',
      sortField: 'rageClickCount',
      sortDirection: 'desc',
      perPage: '8',
    }),
  ]);
  const noPreviousPeriod = !previous || overviewIsEmpty(previous);
  const prev = noPreviousPeriod ? null : previous;
  return {
    ...meta('frustration', query, rangeFrom, rangeTo, period, noPreviousPeriod),
    templateId: 'frustration',
    kpis: {
      rageSessions: computeDelta(
        current.frustration.rageSessions,
        prev?.frustration.rageSessions ?? null
      ),
      deadClickSessions: computeDelta(
        current.frustration.deadClickSessions,
        prev?.frustration.deadClickSessions ?? null
      ),
      errorSessions: computeDelta(
        current.frustration.errorSessions,
        prev?.frustration.errorSessions ?? null
      ),
    },
    friction: patterns.friction,
    sampleSessions: toChips(sessions.sessions, includePii),
  };
};

const buildFunnel = async (
  resources: UxRouteHandlerResources,
  query: ReportQuery
): Promise<RumReportResponse> => {
  const { rangeFrom, rangeTo, includePii, period, previousQuery } = resolveWindows(query);
  const steps = parseFunnelStepsParam(query.funnelSteps);
  const body = {
    rangeFrom,
    rangeTo,
    serviceName: query.serviceName,
    kuery: query.kuery,
    steps,
  };
  const [current, previous] = await Promise.all([
    fetchFunnel(resources, body),
    previousQuery
      ? fetchFunnel(resources, {
          ...body,
          rangeFrom: previousQuery.rangeFrom ?? rangeFrom,
          rangeTo: previousQuery.rangeTo ?? rangeTo,
        })
      : Promise.resolve(null),
  ]);
  const noPreviousPeriod = !previous || previous.sessionsConsidered === 0;
  const last = current.steps[current.steps.length - 1];
  const lastPrev = previous?.steps[previous.steps.length - 1];
  const dropStep = [...current.steps].sort((a, b) => b.dropOffCount - a.dropOffCount)[0];
  const sampleIds = dropStep?.sampleDroppedSessionIds ?? [];
  const sessions =
    sampleIds.length > 0
      ? await fetchSessions(resources, {
          ...withRange(query, rangeFrom, rangeTo),
          sessionIds: sampleIds.join(','),
          perPage: '8',
        })
      : { sessions: [] };
  return {
    ...meta('funnel', query, rangeFrom, rangeTo, period, noPreviousPeriod),
    templateId: 'funnel',
    kpis: {
      conversion: computeDelta(
        last?.conversionFromStart ?? 0,
        noPreviousPeriod ? null : lastPrev?.conversionFromStart ?? null
      ),
      sessionsConsidered: computeDelta(
        current.sessionsConsidered,
        noPreviousPeriod ? null : previous?.sessionsConsidered ?? null
      ),
    },
    steps: current.steps,
    stepsPrevious: noPreviousPeriod ? null : previous?.steps ?? null,
    sampleSessions: toChips(sessions.sessions, includePii),
  };
};

const buildClients = async (
  resources: UxRouteHandlerResources,
  query: ReportQuery
): Promise<RumReportResponse> => {
  const { rangeFrom, rangeTo, includePii, period, listQuery } = resolveWindows(query);
  const [overview, sessions] = await Promise.all([
    fetchOverview(resources, listQuery),
    fetchSessions(resources, {
      ...listQuery,
      sortField: 'errorCount',
      sortDirection: 'desc',
      perPage: '100',
    }),
  ]);
  const nestedMap = new Map<string, RumReportClientCell>();
  let mobileSessions = 0;
  let desktopSessions = 0;
  for (const session of sessions.sessions) {
    const browser = session.client.browser || 'Unknown';
    const os = session.client.os || 'Unknown';
    const key = `${browser}\u0000${os}`;
    const existing = nestedMap.get(key) ?? {
      browser,
      os,
      sessions: 0,
      errorSessions: 0,
    };
    existing.sessions += 1;
    if (session.errorCount > 0) {
      existing.errorSessions += 1;
    }
    nestedMap.set(key, existing);
    if (session.client.mobile) {
      mobileSessions += 1;
    } else {
      desktopSessions += 1;
    }
  }
  return {
    ...meta('clients', query, rangeFrom, rangeTo, period, false, false),
    templateId: 'clients',
    browsers: overview.browsers,
    os: overview.os,
    countries: overview.countries.slice(0, 12),
    nested: [...nestedMap.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 20),
    mobileSessions,
    desktopSessions,
    sampleSessions: toChips(pickWorstSessions(sessions.sessions), includePii),
  };
};

const buildUsers = async (
  resources: UxRouteHandlerResources,
  query: ReportQuery
): Promise<RumReportResponse> => {
  const { rangeFrom, rangeTo, includePii, period, listQuery } = resolveWindows(query);
  const sessions = await fetchSessions(resources, {
    ...listQuery,
    sortField: 'startTime',
    sortDirection: 'desc',
    perPage: '100',
  });
  const grouped = new Map<string, RumReportUserRow & { samples: RumSessionSummary[] }>();
  for (const session of sessions.sessions) {
    const key = userGroupKey(session.user);
    if (!key) {
      continue;
    }
    const existing = grouped.get(key) ?? {
      key,
      displayUser: maskDisplayUser(session.user, includePii) ?? key,
      email: includePii ? session.user.email : null,
      sessionCount: 0,
      errorSessions: 0,
      rageSessions: 0,
      lastSeen: null,
      samples: [],
    };
    existing.sessionCount += 1;
    if (session.errorCount > 0) {
      existing.errorSessions += 1;
    }
    if (session.rageClickCount > 0) {
      existing.rageSessions += 1;
    }
    if (
      session.startTime &&
      (!existing.lastSeen || Date.parse(session.startTime) > Date.parse(existing.lastSeen))
    ) {
      existing.lastSeen = session.startTime;
    }
    existing.samples.push(session);
    grouped.set(key, existing);
  }
  const users = [...grouped.values()].sort(
    (a, b) => b.errorSessions + b.rageSessions - (a.errorSessions + a.rageSessions)
  );
  const topSamples = users[0]?.samples ?? [];
  return {
    ...meta('users', query, rangeFrom, rangeTo, period, false, false),
    templateId: 'users',
    users: users.map(({ samples: _samples, ...row }) => row).slice(0, 25),
    identifiedCount: users.length,
    sampleSessions: toChips(pickWorstSessions(topSamples), includePii),
  };
};

const builders: Record<
  RumReportTemplateId,
  (resources: UxRouteHandlerResources, query: ReportQuery) => Promise<RumReportResponse>
> = {
  scorecard: buildScorecard,
  pages: buildPages,
  errors: buildErrors,
  frustration: buildFrustration,
  funnel: buildFunnel,
  clients: buildClients,
  users: buildUsers,
};

export const buildRumReport = (
  templateId: RumReportTemplateId,
  resources: UxRouteHandlerResources,
  query: ReportQuery
): Promise<RumReportResponse> => builders[templateId](resources, query);

export const getRumReportRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/reports/{templateId}',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    path: t.type({ templateId: templateIdCodec }),
    query: rumReportQueryCodec,
  }),
  handler: async (resources): Promise<RumReportResponse> => {
    const templateId = resources.params.path.templateId;
    if (!isRumReportTemplateId(templateId)) {
      throw new Error(`Unknown report template: ${templateId}`);
    }
    try {
      return await withRumEsRetry(() =>
        buildRumReport(templateId, resources, resources.params.query)
      );
    } catch (error) {
      if (isRumEsTimeout(error)) {
        throw new Error(
          i18n.translate('xpack.ux.reports.queryTimeoutErrorMessage', {
            defaultMessage:
              'The report query timed out. Click Retry — a second load is usually faster.',
          })
        );
      }
      throw error;
    }
  },
});
