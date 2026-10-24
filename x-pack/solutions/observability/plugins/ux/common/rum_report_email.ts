/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RumFacetBucket, RumVitalSummary } from './rum_app';
import type {
  RumReportDelta,
  RumReportErrorRow,
  RumReportPageRow,
  RumReportResponse,
  RumReportSessionChip,
  RumScorecardReport,
} from './rum_report';

const formatCount = (value: number | null | undefined): string =>
  value == null || !Number.isFinite(value) ? '-' : String(Math.round(value));

const formatMs = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) {
    return '-';
  }
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
};

const formatRate = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) {
    return '-';
  }
  return `${Math.round(value * 1000) / 10}%`;
};

const formatSignedPct = (pct: number | null): string | null => {
  if (pct == null || !Number.isFinite(pct)) {
    return null;
  }
  const rounded = Math.round(pct * 1000) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
};

export const formatReportDay = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatPeriod = (from: string, to: string): string =>
  `${formatReportDay(from)} - ${formatReportDay(to)}`;

const kpiValue = (delta: RumReportDelta, format: (value: number) => string): string => {
  const current = delta.current == null ? '-' : format(delta.current);
  const vs = formatSignedPct(delta.pct);
  return vs ? `${current} (${vs} vs previous)` : current;
};

const vitalLine = (name: string, vital: RumVitalSummary, unit: 'ms' | 'score' = 'ms'): string => {
  const p75 =
    unit === 'score' ? (vital.p75 == null ? '-' : vital.p75.toFixed(3)) : formatMs(vital.p75);
  if (!vital.ranks) {
    return `${name} p75 ${p75}`;
  }
  return `${name} p75 ${p75} (good ${vital.ranks.good}% / NI ${vital.ranks.ni}% / poor ${vital.ranks.poor}%)`;
};

const pageLine = (page: RumReportPageRow): string =>
  `${page.path}  views ${formatCount(page.views)}  LCP ${formatMs(
    page.p75Lcp
  )}  errors ${formatCount(page.errorCount)}`;

const errorLine = (group: RumReportErrorRow): string =>
  `${group.type}: ${group.message} (${formatCount(group.count)} in ${formatCount(
    group.sessionCount
  )} sessions)`;

const sessionLine = (session: RumReportSessionChip): string => {
  const who = session.displayUser || session.browser || session.sessionId.slice(0, 8);
  const bits = [
    who,
    session.browser && session.displayUser ? session.browser : null,
    session.errorCount > 0 ? `${session.errorCount} errors` : null,
    session.rageClickCount > 0 ? `${session.rageClickCount} rage` : null,
    session.hasReplay ? 'replay' : null,
  ].filter((bit): bit is string => Boolean(bit));
  return bits.join(' | ');
};

const facetLine = (bucket: RumFacetBucket): string =>
  `${bucket.key} (${formatCount(bucket.count)})`;

const none = (): string[] => ['None'];

export interface EmailSection {
  heading: string;
  rows: string[];
}

export interface EmailModel {
  title: string;
  meta: string[];
  sections: EmailSection[];
}

const headerMeta = (report: RumReportResponse): string[] => {
  const meta = [
    report.serviceName ? `Service: ${report.serviceName}` : 'Service: all',
    `Period: ${formatPeriod(report.rangeFrom, report.rangeTo)}`,
  ];
  if (report.compareFrom && report.compareTo) {
    meta.push(`Compared to: ${formatPeriod(report.compareFrom, report.compareTo)}`);
  }
  return meta;
};

const scorecardModel = (report: RumScorecardReport): EmailModel => {
  const pages = report.topPages.slice(0, 8);
  const errors = report.errorGroups.slice(0, 8);
  const countries = report.countries.slice(0, 8);
  const browsers = report.browsers.slice(0, 6);
  const sessions = report.sampleSessions.slice(0, 8);
  return {
    title: report.title,
    meta: headerMeta(report),
    sections: [
      {
        heading: 'Scorecard',
        rows: [
          `Sessions: ${kpiValue(report.kpis.sessions, formatCount)}`,
          `Page views: ${kpiValue(report.kpis.pageViews, formatCount)}`,
          `Error rate: ${kpiValue(report.kpis.errorRate, formatRate)}`,
          `Bounce rate: ${kpiValue(report.kpis.bounceRate, formatRate)}`,
          `p75 load: ${kpiValue(report.kpis.p75LoadMs, formatMs)}`,
          `p75 INP: ${kpiValue(report.kpis.p75Inp, formatMs)}`,
        ],
      },
      {
        heading: 'Core Web Vitals',
        rows: [
          vitalLine('LCP', report.vitals.lcp),
          vitalLine('INP', report.vitals.inp),
          vitalLine('CLS', report.vitals.cls, 'score'),
        ],
      },
      {
        heading: 'Frustration',
        rows: [
          `Rage-click sessions: ${formatCount(report.frustration.rageSessions)}`,
          `Dead-click sessions: ${formatCount(report.frustration.deadClickSessions)}`,
          `Error sessions: ${formatCount(report.frustration.errorSessions)}`,
        ],
      },
      {
        heading: 'Top pages',
        rows: pages.length === 0 ? none() : pages.map(pageLine),
      },
      {
        heading: 'Top errors',
        rows: errors.length === 0 ? none() : errors.map(errorLine),
      },
      {
        heading: 'Top countries',
        rows:
          countries.length === 0
            ? none()
            : countries.map(
                (row) =>
                  `${row.name} (${row.isoCode}): ${formatCount(row.pageViews)} views, ${formatCount(
                    row.sessions
                  )} sessions, ${formatCount(row.errorCount)} errors`
              ),
      },
      {
        heading: 'Browsers',
        rows: browsers.length === 0 ? none() : browsers.map(facetLine),
      },
      {
        heading: 'Sessions to review',
        rows: sessions.length === 0 ? none() : sessions.map(sessionLine),
      },
    ],
  };
};

export const reportModel = (report: RumReportResponse): EmailModel => {
  if (report.templateId === 'scorecard') {
    return scorecardModel(report);
  }
  if (report.templateId === 'pages') {
    return {
      title: report.title,
      meta: headerMeta(report),
      sections: [
        {
          heading: 'Totals',
          rows: [
            `Page views: ${kpiValue(report.kpis.pageViews, formatCount)}`,
            `Distinct paths: ${kpiValue(report.kpis.distinctPaths, formatCount)}`,
            `Poor LCP share: ${kpiValue(report.kpis.poorLcpPct, formatRate)}`,
          ],
        },
        {
          heading: 'Most viewed',
          rows:
            report.mostViewed.length === 0 ? none() : report.mostViewed.slice(0, 8).map(pageLine),
        },
        {
          heading: 'Slowest LCP',
          rows: report.slowest.length === 0 ? none() : report.slowest.slice(0, 8).map(pageLine),
        },
      ],
    };
  }
  if (report.templateId === 'errors') {
    return {
      title: report.title,
      meta: headerMeta(report),
      sections: [
        {
          heading: 'Totals',
          rows: [
            `Error sessions: ${kpiValue(report.kpis.errorSessions, formatCount)}`,
            `Error rate: ${kpiValue(report.kpis.errorRate, formatRate)}`,
            `Distinct groups: ${kpiValue(report.kpis.distinctGroups, formatCount)}`,
          ],
        },
        {
          heading: 'Error groups',
          rows: report.groups.length === 0 ? none() : report.groups.slice(0, 12).map(errorLine),
        },
      ],
    };
  }
  if (report.templateId === 'frustration') {
    return {
      title: report.title,
      meta: headerMeta(report),
      sections: [
        {
          heading: 'Totals',
          rows: [
            `Rage-click sessions: ${kpiValue(report.kpis.rageSessions, formatCount)}`,
            `Dead-click sessions: ${kpiValue(report.kpis.deadClickSessions, formatCount)}`,
            `Error sessions: ${kpiValue(report.kpis.errorSessions, formatCount)}`,
          ],
        },
        {
          heading: 'Friction',
          rows:
            report.friction.length === 0
              ? none()
              : report.friction
                  .slice(0, 12)
                  .map(
                    (row) =>
                      `${row.kind} / ${row.step}: ${formatCount(
                        row.sessionCount
                      )} sessions (${formatRate(row.share)})`
                  ),
        },
      ],
    };
  }
  if (report.templateId === 'funnel') {
    return {
      title: report.title,
      meta: headerMeta(report),
      sections: [
        {
          heading: 'Totals',
          rows: [
            `Conversion: ${kpiValue(report.kpis.conversion, formatRate)}`,
            `Sessions: ${kpiValue(report.kpis.sessionsConsidered, formatCount)}`,
          ],
        },
        {
          heading: 'Steps',
          rows:
            report.steps.length === 0
              ? none()
              : report.steps.map(
                  (step) =>
                    `${step.label}: ${formatCount(step.count)} (${formatRate(
                      step.conversionFromStart
                    )} from start)`
                ),
        },
      ],
    };
  }
  if (report.templateId === 'clients') {
    return {
      title: report.title,
      meta: headerMeta(report),
      sections: [
        {
          heading: 'Mix',
          rows: [
            `Desktop sessions: ${formatCount(report.desktopSessions)}`,
            `Mobile sessions: ${formatCount(report.mobileSessions)}`,
          ],
        },
        {
          heading: 'Browsers',
          rows: report.browsers.length === 0 ? none() : report.browsers.slice(0, 8).map(facetLine),
        },
        {
          heading: 'OS',
          rows: report.os.length === 0 ? none() : report.os.slice(0, 8).map(facetLine),
        },
      ],
    };
  }
  return {
    title: report.title,
    meta: headerMeta(report),
    sections: [
      {
        heading: 'Users',
        rows: [
          `Identified users: ${formatCount(report.identifiedCount)}`,
          ...(report.users.length === 0
            ? none()
            : report.users
                .slice(0, 12)
                .map(
                  (row) =>
                    `${row.displayUser}: ${formatCount(row.sessionCount)} sessions, ${formatCount(
                      row.errorSessions
                    )} with errors`
                )),
        ],
      },
    ],
  };
};

const withNarrativeMarkdown = (body: string, narrative?: string): string => {
  const trimmed = narrative?.trim();
  if (!trimmed) {
    return body;
  }
  return [`# AI summary`, '', trimmed, '', '---', '', body].join('\n');
};

export const reportEmailMarkdown = (
  report: RumReportResponse,
  shareUrl: string,
  narrative?: string
): string => {
  const model = reportModel(report);
  const lines = [`# ${model.title}`, ...model.meta, ''];
  for (const section of model.sections) {
    lines.push(`## ${section.heading}`);
    for (const row of section.rows) {
      lines.push(`- ${row}`);
    }
    lines.push('');
  }
  lines.push(`[Open in Kibana](${shareUrl})`);
  return withNarrativeMarkdown(lines.join('\n'), narrative);
};

export const scorecardMarkdown = (report: RumScorecardReport, shareUrl: string): string =>
  reportEmailMarkdown(report, shareUrl);

export const reportToPdfText = (
  report: RumReportResponse,
  shareUrl: string,
  narrative?: string
): string => {
  const model = reportModel(report);
  const lines: string[] = [];
  const trimmed = narrative?.trim();
  if (trimmed) {
    lines.push('AI summary', '');
    for (const line of trimmed.split('\n')) {
      lines.push(line.replace(/^#+\s*/, ''));
    }
    lines.push('', '------', '');
  }
  lines.push(model.title, '', ...model.meta, '');
  for (const section of model.sections) {
    lines.push(section.heading);
    for (const row of section.rows) {
      lines.push(`- ${row}`);
    }
    lines.push('');
  }
  lines.push(`Open in Kibana: ${shareUrl}`);
  return lines.join('\n');
};

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const htmlRows = (rows: string[]): string =>
  rows
    .map(
      (row) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #e0e0e0;font-size:13px;line-height:1.4">${escapeHtml(
          row
        )}</td></tr>`
    )
    .join('');

const inlineMarkdown = (value: string): string =>
  escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

export const markdownToEmailHtml = (markdown: string): string => {
  const blocks = markdown.trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((line) => /^[-*]\s/.test(line))) {
        return `<ul style="margin:8px 0;padding-left:20px">${lines
          .map((line) => `<li>${inlineMarkdown(line.replace(/^[-*]\s/, ''))}</li>`)
          .join('')}</ul>`;
      }
      const first = lines[0] ?? '';
      if (first.startsWith('## ')) {
        return `<h3 style="font-size:15px;margin:16px 0 8px">${inlineMarkdown(
          first.slice(3)
        )}</h3>${
          lines.length > 1
            ? `<p style="margin:0 0 8px;line-height:1.5">${lines
                .slice(1)
                .map((line) => inlineMarkdown(line))
                .join('<br>')}</p>`
            : ''
        }`;
      }
      if (first.startsWith('# ')) {
        return `<h2 style="font-size:18px;margin:16px 0 8px">${inlineMarkdown(
          first.slice(2)
        )}</h2>${
          lines.length > 1
            ? `<p style="margin:0 0 8px;line-height:1.5">${lines
                .slice(1)
                .map((line) => inlineMarkdown(line))
                .join('<br>')}</p>`
            : ''
        }`;
      }
      return `<p style="margin:0 0 8px;line-height:1.5">${lines
        .map((line) => inlineMarkdown(line.replace(/^[-*]\s/, '• ')))
        .join('<br>')}</p>`;
    })
    .join('');
};

export const reportEmailHtml = (
  report: RumReportResponse,
  shareUrl: string,
  narrative?: string
): string => {
  const model = reportModel(report);
  const sections = model.sections
    .map(
      (section) =>
        `<h2 style="font-size:16px;margin:24px 0 8px">${escapeHtml(section.heading)}</h2>
<table width="100%" cellpadding="0" cellspacing="0">${htmlRows(section.rows)}</table>`
    )
    .join('\n');
  const trimmed = narrative?.trim();
  const summary = trimmed
    ? `<div style="background:#f4f8fc;border-left:4px solid #0077cc;padding:16px 20px;margin:0 0 24px">
      <h2 style="font-size:16px;margin:0 0 8px">AI summary</h2>
      ${markdownToEmailHtml(trimmed)}
    </div>`
    : '';
  return `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
  <div style="max-width:720px;margin:0 auto;background:#fff;padding:24px 28px;border:1px solid #d3dae6;border-radius:6px">
    <h1 style="font-size:22px;margin:0 0 12px">${escapeHtml(model.title)}</h1>
    <p style="margin:0 0 8px;color:#535966;font-size:13px">${model.meta
      .map(escapeHtml)
      .join('<br>')}</p>
    ${summary}
    ${sections}
    <p style="margin:28px 0 0">
      <a href="${escapeHtml(shareUrl)}" style="color:#0077cc">Open this report in Kibana</a>
    </p>
  </div>
</body>
</html>`;
};
