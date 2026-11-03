/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CWV_LCP_POOR_MS, scorecardMarkdown, type RumReportResponse } from './rum_report';

export const RUM_LLM_SYSTEM_PROMPT = `You are a RUM (Real User Monitoring) analyst writing for engineering and product stakeholders.

Rules:
- Use only numbers and facts from the provided data. Never invent metrics, session IDs, or users.
- Write clear markdown: short headline, 3–6 bullet findings, then recommended next steps.
- Call out regressions vs the previous period when deltas are present.
- Name concrete pages, countries, error groups, and session IDs so the reader can drill in.
- Do not include emails or other PII unless it already appears in the data.
- If the data is empty or too sparse, say so and suggest widening the range or dropping filters.`;

export interface RumLlmScope {
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  browser?: string;
  os?: string;
  location?: string;
  pageUrl?: string;
  user?: string;
  kuery?: string;
}

export const RUM_INVESTIGATION_IDS = [
  'slow_users',
  'slow_pages',
  'errors',
  'frustration',
  'compare',
] as const;

export type RumInvestigationId = (typeof RUM_INVESTIGATION_IDS)[number];

const formatMs = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
};

const formatPct = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) {
    return 'n/a';
  }
  return `${Math.round(value * 1000) / 10}%`;
};

const formatDelta = (pct: number | null | undefined): string => {
  if (pct == null || !Number.isFinite(pct)) {
    return 'n/a';
  }
  const rounded = Math.round(pct * 1000) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
};

const cap = <T>(rows: T[], limit: number): T[] => rows.slice(0, limit);

const scopeLines = (report: RumReportResponse): string[] => [
  `# ${report.title}`,
  `Service: ${report.serviceName ?? 'all'}`,
  `Period: ${report.rangeFrom} → ${report.rangeTo}`,
  report.compareFrom && report.compareTo
    ? `Compared to: ${report.compareFrom} → ${report.compareTo}`
    : 'Compared to: none',
];

const sessionLines = (
  report: Extract<RumReportResponse, { sampleSessions: unknown }>
): string[] => {
  if (report.sampleSessions.length === 0) {
    return ['Sample sessions:', '• None'];
  }
  return [
    'Sample sessions:',
    ...cap(report.sampleSessions, 8).map(
      (session) =>
        `• ${session.sessionId} user=${session.displayUser ?? 'anon'} browser=${
          session.browser ?? '—'
        } duration=${formatMs(session.durationMs)} errors=${session.errorCount} rage=${
          session.rageClickCount
        } replay=${session.hasReplay ? 'yes' : 'no'}`
    ),
  ];
};

const pageLines = (
  heading: string,
  rows: Array<{
    path: string;
    views: number;
    p75Lcp: number | null;
    errorCount: number;
  }>
): string[] => {
  if (rows.length === 0) {
    return [heading, '• None'];
  }
  return [
    heading,
    ...cap(rows, 12).map(
      (page) =>
        `• ${page.path}: ${page.views} views, LCP p75 ${formatMs(page.p75Lcp)}, ${
          page.errorCount
        } errors`
    ),
  ];
};

export const reportToPromptContext = (report: RumReportResponse): string => {
  switch (report.templateId) {
    case 'scorecard':
      return scorecardMarkdown(report, '(in-app report)');
    case 'pages':
      return [
        ...scopeLines(report),
        `Page views: ${report.kpis.pageViews.current ?? '—'} (${formatDelta(
          report.kpis.pageViews.pct
        )})`,
        `Distinct paths: ${report.kpis.distinctPaths.current ?? '—'} (${formatDelta(
          report.kpis.distinctPaths.pct
        )})`,
        `Poor LCP share: ${formatPct(report.kpis.poorLcpPct.current)} (${formatDelta(
          report.kpis.poorLcpPct.pct
        )})`,
        `Worst path: ${report.worstPath ?? '—'}`,
        '',
        ...pageLines('Most viewed:', report.mostViewed),
        '',
        ...pageLines('Slowest (LCP):', report.slowest),
        '',
        ...sessionLines(report),
      ].join('\n');
    case 'errors':
      return [
        ...scopeLines(report),
        `Error sessions: ${report.kpis.errorSessions.current ?? '—'} (${formatDelta(
          report.kpis.errorSessions.pct
        )})`,
        `Error rate: ${formatPct(report.kpis.errorRate.current)} (${formatDelta(
          report.kpis.errorRate.pct
        )})`,
        `Distinct groups: ${report.kpis.distinctGroups.current ?? '—'}`,
        `Identified users: ${report.kpis.identifiedUsers.current ?? '—'}`,
        `Top group: ${report.topGroupKey ?? '—'}`,
        '',
        'Error groups:',
        ...(report.groups.length === 0
          ? ['• None']
          : cap(report.groups, 12).map(
              (group) =>
                `• ${group.type}: ${group.message} count=${group.count} sessions=${
                  group.sessionCount
                } users=${group.userCount} (${formatDelta(group.countDelta.pct)})`
            )),
        '',
        ...sessionLines(report),
      ].join('\n');
    case 'frustration':
      return [
        ...scopeLines(report),
        `Rage sessions: ${report.kpis.rageSessions.current ?? '—'} (${formatDelta(
          report.kpis.rageSessions.pct
        )})`,
        `Dead-click sessions: ${report.kpis.deadClickSessions.current ?? '—'} (${formatDelta(
          report.kpis.deadClickSessions.pct
        )})`,
        `Error sessions: ${report.kpis.errorSessions.current ?? '—'} (${formatDelta(
          report.kpis.errorSessions.pct
        )})`,
        '',
        'Friction:',
        ...(report.friction.length === 0
          ? ['• None']
          : cap(report.friction, 12).map(
              (row) =>
                `• ${row.kind} @ ${row.step}: ${row.sessionCount} sessions (${formatPct(
                  row.share
                )})`
            )),
        '',
        ...sessionLines(report),
      ].join('\n');
    case 'funnel':
      return [
        ...scopeLines(report),
        `Conversion: ${formatPct(report.kpis.conversion.current)} (${formatDelta(
          report.kpis.conversion.pct
        )})`,
        `Sessions considered: ${report.kpis.sessionsConsidered.current ?? '—'}`,
        '',
        'Steps:',
        ...(report.steps.length === 0
          ? ['• None']
          : report.steps.map(
              (step) =>
                `• ${step.label}: ${step.count} (from start ${formatPct(
                  step.conversionFromStart
                )}, drop-off ${step.dropOffCount})`
            )),
        '',
        ...sessionLines(report),
      ].join('\n');
    case 'clients':
      return [
        ...scopeLines(report),
        `Mobile sessions: ${report.mobileSessions}`,
        `Desktop sessions: ${report.desktopSessions}`,
        '',
        'Browsers:',
        ...(report.browsers.length === 0
          ? ['• None']
          : cap(report.browsers, 8).map((row) => `• ${row.key}: ${row.count}`)),
        '',
        'OS:',
        ...(report.os.length === 0
          ? ['• None']
          : cap(report.os, 8).map((row) => `• ${row.key}: ${row.count}`)),
        '',
        'Countries:',
        ...(report.countries.length === 0
          ? ['• None']
          : cap(report.countries, 12).map(
              (row) =>
                `• ${row.name} (${row.isoCode}): ${row.pageViews} views, ${
                  row.sessions
                } sessions, ${row.errorCount} errors, LCP p75 ${formatMs(row.p75Lcp)}`
            )),
        '',
        'Browser × OS:',
        ...(report.nested.length === 0
          ? ['• None']
          : cap(report.nested, 12).map(
              (row) =>
                `• ${row.browser} / ${row.os}: ${row.sessions} sessions, ${row.errorSessions} with errors`
            )),
        '',
        ...sessionLines(report),
      ].join('\n');
    case 'users':
      return [
        ...scopeLines(report),
        `Identified users: ${report.identifiedCount}`,
        '',
        'Users:',
        ...(report.users.length === 0
          ? ['• None']
          : cap(report.users, 25).map(
              (row) =>
                `• ${row.displayUser}: ${row.sessionCount} sessions, ${row.errorSessions} errors, ${
                  row.rageSessions
                } rage, last=${row.lastSeen ?? '—'}`
            )),
        '',
        ...sessionLines(report),
      ].join('\n');
  }
};

export const defaultReportInstructions = (templateId: RumReportResponse['templateId']): string => {
  switch (templateId) {
    case 'scorecard':
      return i18n.translate('xpack.ux.reports.ai.instructions.scorecardDescription', {
        defaultMessage:
          'Write a weekly UX scorecard: what improved or regressed, who is affected (pages, countries), and the three actions to take next.',
      });
    case 'pages':
      return i18n.translate('xpack.ux.reports.ai.instructions.pagesDescription', {
        defaultMessage:
          'Explain which routes are slow or error-prone. Rank by user impact (views × poor LCP) and suggest where to look first.',
      });
    case 'errors':
      return i18n.translate('xpack.ux.reports.ai.instructions.errorsDescription', {
        defaultMessage:
          'Summarize which exceptions burned the most sessions and users. Call out any group that is growing vs the previous period.',
      });
    case 'frustration':
      return i18n.translate('xpack.ux.reports.ai.instructions.frustrationDescription', {
        defaultMessage:
          'Describe rage, dead, and error-click hotspots. Tie friction to steps or pages and recommend a fix order.',
      });
    case 'funnel':
      return i18n.translate('xpack.ux.reports.ai.instructions.funnelDescription', {
        defaultMessage:
          'Explain funnel conversion and the largest drop-offs. Suggest which step to investigate in Session Replay.',
      });
    case 'clients':
      return i18n.translate('xpack.ux.reports.ai.instructions.clientsDescription', {
        defaultMessage:
          'Describe browser, OS, device, and country mix. Highlight clients or geos with outsized errors or poor LCP.',
      });
    case 'users':
      return i18n.translate('xpack.ux.reports.ai.instructions.usersDescription', {
        defaultMessage:
          'Summarize identified-user experience for support. List users with the most errors or rage clicks.',
      });
  }
};

export const describeRumScope = (scope: RumLlmScope): string => {
  const parts = [
    `Time range: ${scope.rangeFrom} → ${scope.rangeTo}`,
    `Service: ${scope.serviceName || 'all'}`,
  ];
  if (scope.browser) {
    parts.push(`Browser: ${scope.browser}`);
  }
  if (scope.os) {
    parts.push(`OS: ${scope.os}`);
  }
  if (scope.location) {
    parts.push(`Country: ${scope.location}`);
  }
  if (scope.pageUrl) {
    parts.push(`Page: ${scope.pageUrl}`);
  }
  if (scope.user) {
    parts.push(`User: ${scope.user}`);
  }
  if (scope.kuery) {
    parts.push(`KQL: ${scope.kuery}`);
  }
  return parts.join('. ') + '.';
};

const FOLLOW_UP_NARRATIVE_CHARS = 8_000;

/** Prompt that continues a report narrative in the AI Analyst tab. */
export const reportAnalystFollowUp = (report: RumReportResponse, narrative?: string): string => {
  const header = describeRumScope({
    rangeFrom: report.rangeFrom,
    rangeTo: report.rangeTo,
    serviceName: report.serviceName ?? undefined,
  });
  const trimmed = narrative?.trim();
  if (!trimmed) {
    return `${header}

Investigate this ${report.title}. Use observability.ux tools (overview, pages, errors, sessions) to find regressions and who is affected. Recommend three concrete next steps.`;
  }
  const body =
    trimmed.length > FOLLOW_UP_NARRATIVE_CHARS
      ? `${trimmed.slice(0, FOLLOW_UP_NARRATIVE_CHARS)}\n…(truncated)`
      : trimmed;
  return `${header}

I generated this ${report.title} narrative in Reporting. Use observability.ux tools to investigate the recommended next steps. Do not invent metrics. Ask which action to take first if several look equally urgent.

Narrative:
${body}`;
};

export const investigationPrompt = (id: RumInvestigationId, scope: RumLlmScope): string => {
  const header = describeRumScope(scope);
  switch (id) {
    case 'slow_users':
      return `${header}

Find the slowest user sessions in this range. Use observability.ux.find_sessions sorted by durationMs descending. Summarize who is slow (user, country, browser), which pages they hit, and whether they also have errors or rage clicks. List session IDs I can open in Session Replay.`;
    case 'slow_pages':
      return `${header}

Where is the website slow? Use observability.ux.get_pages and observability.ux.get_overview. Rank routes and countries by poor LCP (p75 ≥ ${CWV_LCP_POOR_MS}ms) weighted by views. Call out the worst 5 pages and any geo concentration.`;
    case 'errors':
      return `${header}

Who is facing errors? Use observability.ux.get_errors and observability.ux.find_sessions with hasErrors=true. Rank error groups by sessions and identified users, then list representative session IDs.`;
    case 'frustration':
      return `${header}

Find frustration hotspots (rage clicks, dead clicks). Use observability.ux.get_overview for counts and observability.ux.find_sessions with hasRage=true. Name the pages and users most affected.`;
    case 'compare':
      return `${header}

Compare this period to the previous equal-length window. Use observability.ux.get_report with templateId=scorecard and compare=previous. Write a stakeholder brief: KPIs, CWV, countries, top regressions, and recommended next steps.`;
  }
};
