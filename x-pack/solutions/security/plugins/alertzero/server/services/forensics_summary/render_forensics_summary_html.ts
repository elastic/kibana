/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { clamp, escape, once, sum } from 'lodash';
import Mustache from 'mustache';
import type { ProposalStatus } from '@kbn/proposals-common';
import { CUSTOM_CONTENT_MAX_HEIGHT, CUSTOM_CONTENT_MIN_HEIGHT } from '@kbn/custom-content-common';
import { CLOSE_ATTACK_ACTION_WORKFLOW_ID, getIocKindClass } from './constants';
import { estimateForensicsSummaryHeight } from './estimate_forensics_summary_height';
import {
  buildChevrons,
  buildDonutSegments,
  buildEntityGraph,
  buildSplit,
  buildTimelinePlot,
  formatTimeOfDay,
  truncateText,
} from './forensics_summary_charts';
import type { ChartPart } from './forensics_summary_charts';
import type {
  AlertSeverity,
  DecisionGroup,
  ForensicsSummaryViewModel,
  ForensicsVerdict,
} from './view_model';
import { countOpenDecisions } from './view_model';

const loadFiles = once(() => {
  const read = (file: string) => fs.readFileSync(path.join(__dirname, file), 'utf8');
  return {
    template: read('forensics_summary.mustache.html'),
    partials: { alerts: read('forensics_summary_alerts.mustache.html') },
    css: read('forensics_summary.css'),
  };
});

/** Model text, alert and user values are data: escaped before they touch the HTML. `{` too, so a template can't come back. */
const escapeHtml = (text: unknown): string => escape(String(text)).replace(/\{/g, '&#123;');

const VERDICTS: Record<ForensicsVerdict, { label: string; className: string }> = {
  confirmed_incident: { label: 'Confirmed incident', className: 'danger' },
  not_an_incident: { label: 'Not an incident', className: 'success' },
  unclear: { label: 'Unclear', className: 'warning' },
};

/** The donut's parts and legend, in reading order; class names pick each state's color. */
const DECISION_PARTS: ReadonlyArray<{ group: DecisionGroup; label: string; className: string }> = [
  { group: 'awaiting', label: 'awaiting', className: 'd-wait' },
  { group: 'running', label: 'running', className: 'd-run' },
  { group: 'done', label: 'done', className: 'd-done' },
  { group: 'failed', label: 'failed', className: 'd-fail' },
  { group: 'closed', label: 'closed', className: 'd-closed' },
];

const SEVERITIES: readonly AlertSeverity[] = ['critical', 'high', 'medium', 'low'];

const STATUSES: Record<ProposalStatus, { label: string; className: string }> = {
  pending: { label: 'Awaiting approval', className: 'warning' },
  executing: { label: 'Running', className: 'neutral' },
  succeeded: { label: 'Applied', className: 'success' },
  failed: { label: 'Failed', className: 'danger' },
  expired: { label: 'Expired', className: 'hollow' },
  superseded: { label: 'Replaced', className: 'hollow' },
  no_action: { label: 'No action', className: 'hollow' },
};

const IMPACT_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;

/** A meter's cells, lit up to the level's position; empty for an unknown level. */
const toMeter = (levels: readonly string[], level: string | undefined) => {
  const lit = level ? levels.indexOf(level) + 1 : 0;
  return lit > 0 ? levels.map((_, index) => ({ on: index < lit })) : [];
};

/** Each action's 16 × 16 stroke icon. Fixed markup, so it is the one thing printed unescaped. */
const ACTION_ICONS: Record<string, string> = {
  'system-alertzero-action-isolate-host':
    '<rect x="2" y="2.5" width="12" height="8.5" rx="1.2"/><path d="M5.5 14h5M8 11v3M2.5 2.5l11 9"/>',
  'system-alertzero-action-kill-process':
    '<circle cx="8" cy="8" r="6"/><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4"/>',
  'system-alertzero-action-suspend-process':
    '<circle cx="8" cy="8" r="6"/><path d="M6.6 5.6v4.8M9.4 5.6v4.8"/>',
  'system-alertzero-action-memory-dump':
    '<rect x="4" y="4" width="8" height="8" rx="1"/><path d="M6 2v2M10 2v2M6 12v2M10 12v2M2 6h2M2 10h2M12 6h2M12 10h2"/>',
  [CLOSE_ATTACK_ACTION_WORKFLOW_ID]:
    '<circle cx="8" cy="8" r="6"/><path d="M5.3 8.2l1.9 1.9 3.6-4"/>',
  'system-alertzero-action-handoff-to-forensics': '<path d="M2 8h8.5M7.5 5l3 3-3 3M13.5 3v10"/>',
};
const DEFAULT_ACTION_ICON = '<circle cx="8" cy="8" r="2.5"/>';

const MINUTES = 16;
const SECONDS = 19;

/** An ISO timestamp as `YYYY-MM-DD HH:mm[:ss] UTC`: the card is shared, so it names no viewer's zone. Unparseable text is kept. */
const formatUtc = (timestamp: string, precision: typeof MINUTES | typeof SECONDS): string => {
  const time = Date.parse(timestamp);
  return Number.isNaN(time)
    ? timestamp
    : `${new Date(time).toISOString().slice(0, precision).replace('T', ' ')} UTC`;
};

/** A window as `HH:mm–HH:mm UTC` inside one day, or with both dates when it spans more. Unparseable text is kept. */
const formatWindow = (start: string, end: string): string => {
  const [startTime, endTime] = [Date.parse(start), Date.parse(end)];
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return `${start}–${end}`;
  }
  const [startIso, endIso] = [new Date(startTime).toISOString(), new Date(endTime).toISOString()];
  return startIso.slice(0, 10) === endIso.slice(0, 10)
    ? `${startIso.slice(11, 16)}–${endIso.slice(11, 16)} UTC`
    : `${startIso.slice(0, 16).replace('T', ' ')} – ${endIso.slice(0, 16).replace('T', ' ')} UTC`;
};

const countOf = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Markdown emphasis and code ticks would show as literal characters in the callout. */
const toPlainSummary = (summary: string): string => summary.replace(/\*\*|`/g, '');

const buildHeader = (viewModel: ForensicsSummaryViewModel) => {
  const { verdict, autonomy, alerts, timeline, indicators, decisions } = viewModel;
  const { label: verdictLabel, className: verdictClass } = VERDICTS[verdict];
  const hasEvidence = timeline.total > 0 || indicators.length > 0;
  const proposalCount = sum(Object.values(decisions));
  const openDecisions = countOpenDecisions(viewModel);
  const decisionsStep = openDecisions > 0 ? 'cur' : proposalCount > 0 ? 'done' : '';
  return {
    verdictLabel,
    verdictClass,
    autonomyLabel: autonomy === 'supervised' ? 'Supervised' : 'Manual approval',
    windowFacts: [
      ...(timeline.window
        ? [`Searched ${formatWindow(timeline.window.start, timeline.window.end)}`]
        : []),
      countOf(alerts.total, 'correlated alert', 'correlated alerts'),
    ],
    flow: [
      { label: 'Attack Discovery', className: 'done' },
      { label: 'Verdict', className: 'done' },
      { label: 'Endpoint analysis', className: hasEvidence ? 'done' : 'cur' },
      { label: 'Decisions', className: decisionsStep },
    ].map((step, index) => ({ ...step, first: index === 0 })),
    noEvidence: !hasEvidence,
  };
};

const buildKpis = (viewModel: ForensicsSummaryViewModel) => {
  const { decisions, peakRisk, scope, alerts } = viewModel;
  const proposalCount = sum(Object.values(decisions));
  const openDecisions = countOpenDecisions(viewModel);
  const decisionParts: ChartPart[] = DECISION_PARTS.map(({ group, className }) => ({
    className,
    count: decisions[group],
  }));
  const severityParts: ChartPart[] = SEVERITIES.map((severity) => ({
    className: `s-${severity}`,
    count: alerts.shown.filter((alert) => alert.severity === severity).length,
  }));
  const scopeParts: ChartPart[] = [
    { className: getIocKindClass('affected_hosts'), count: scope.hosts },
    { className: getIocKindClass('compromised_identities'), count: scope.identities },
    { className: getIocKindClass('ips'), count: scope.network },
  ];
  return {
    decisionsKpi: {
      label: `${openDecisions} of ${proposalCount} proposals need a decision`,
      segments: buildDonutSegments(decisionParts),
      value: proposalCount === 0 ? '–' : openDecisions,
      suffix: openDecisions > 0 ? 'to decide' : proposalCount > 0 ? 'decided' : 'proposals',
      legend: DECISION_PARTS.filter(({ group }) => decisions[group] > 0).map(
        ({ group, label, className }) => ({ className, label: `${decisions[group]} ${label}` })
      ),
    },
    peakKpi: {
      value: peakRisk ? peakRisk.score : '–',
      suffix: peakRisk?.severity,
      className: peakRisk ? `t-${peakRisk.severity}` : '',
      split: buildSplit(severityParts),
      text: alerts.shown.length
        ? SEVERITIES.flatMap((severity, index) =>
            severityParts[index].count > 0 ? [`${severityParts[index].count} ${severity}`] : []
          ).join(' · ')
        : alerts.total > 0
        ? 'alerts not in this space'
        : 'no alerts',
    },
    scopeKpi: {
      value: scope.hosts,
      suffix: scope.hosts === 1 ? 'host' : 'hosts',
      split: buildSplit(scopeParts),
      text: `${countOf(scope.identities, 'identity', 'identities')} · ${scope.network} network`,
    },
  };
};

const buildDecide = ({ proposals, alerts }: ForensicsSummaryViewModel) => {
  const categories = [...new Set(proposals.map(({ category }) => category))];
  return {
    proposalCount: countOf(proposals.length, 'proposal', 'proposals'),
    proposalGroups: categories.map((category) => ({
      label: capitalize(category),
      proposals: proposals
        .filter((proposal) => proposal.category === category)
        .map((proposal) => {
          const isOpen = proposal.group === 'awaiting' || proposal.group === 'running';
          const status =
            proposal.status === 'no_action' && proposal.dismissed
              ? { label: 'Dismissed', className: 'hollow' }
              : STATUSES[proposal.status];
          return {
            ...proposal,
            edgeClass: category === 'respond' || category === 'investigate' ? category : 'other',
            settled: !isOpen,
            statusLabel: status.label,
            statusClass: status.className,
            icon:
              (proposal.actionWorkflowId && ACTION_ICONS[proposal.actionWorkflowId]) ??
              DEFAULT_ACTION_ICON,
            expiresAt: proposal.expiresAt && formatUtc(proposal.expiresAt, MINUTES),
            impactMeter: toMeter(IMPACT_LEVELS, proposal.impact),
            confidenceMeter: toMeter(CONFIDENCE_LEVELS, proposal.confidence),
            closesAlerts:
              proposal.status === 'pending' &&
              proposal.actionWorkflowId === CLOSE_ATTACK_ACTION_WORKFLOW_ID &&
              alerts.total > 0
                ? countOf(alerts.total, 'alert', 'alerts')
                : undefined,
          };
        }),
    })),
  };
};

const buildTimeline = ({ timeline, alerts, host }: ForensicsSummaryViewModel) => {
  const { events, total } = timeline;
  const plot = buildTimelinePlot(events, alerts.shown);
  const moreEvents = total - events.length;
  return {
    hasTimeline: events.length > 0,
    timelineMeta: [
      countOf(total, 'event', 'events'),
      ...(plot ? [`over ${countOf(plot.spanMinutes, 'minute', 'minutes')}`] : []),
      ...(host ? [`on ${host}`] : []),
    ].join(' '),
    plot,
    eventList: events.map(({ timestamp, description }, index) => ({
      number: index + 1,
      time: formatTimeOfDay(timestamp),
      title: formatUtc(timestamp, SECONDS),
      description: truncateText(description.replace(/\s+/g, ' '), 140),
    })),
    moreEvents: moreEvents > 0 ? moreEvents : undefined,
  };
};

const buildIndicators = ({ host, indicators }: ForensicsSummaryViewModel) => {
  const valuesOf = (key: string): string[] =>
    indicators.find((indicator) => indicator.key === key)?.values ?? [];
  const largest = Math.max(1, ...indicators.map(({ count }) => count));
  return {
    hasIndicators: indicators.length > 0,
    indicatorTotal: sum(indicators.map(({ count }) => count)),
    graph: buildEntityGraph({
      host,
      identities: valuesOf('compromised_identities'),
      ips: valuesOf('ips'),
      hosts: valuesOf('affected_hosts'),
    }),
    indicatorBars: indicators.map(({ label, color, count }) => ({
      label,
      className: `k${color}`,
      count,
      width: Math.round((count * 100) / largest),
    })),
    indicatorValues: indicators.flatMap(({ values }) =>
      values.map((value) => ({ value, label: truncateText(value, 40) }))
    ),
  };
};

const buildAlerts = ({ alerts }: ForensicsSummaryViewModel) => ({
  hasAlerts: alerts.total > 0,
  hasShownAlerts: alerts.shown.length > 0,
  alertRows: alerts.shown.map((alert) => ({
    ...alert,
    width: clamp(Math.round(alert.riskScore), 0, 100),
  })),
  alertsAbove: alerts.total > 0 && alerts.closePending,
  alertsBelow: alerts.total > 0 && !alerts.closePending,
});

const buildContext = (viewModel: ForensicsSummaryViewModel, css: string) => ({
  ...viewModel,
  css,
  summary: viewModel.summary && toPlainSummary(viewModel.summary),
  ...buildHeader(viewModel),
  ...buildKpis(viewModel),
  chevrons: buildChevrons(viewModel.killChain),
  hasKillChain: viewModel.killChain.length > 0,
  detectedTactics: viewModel.killChain.filter(({ detected }) => detected).length,
  ...buildDecide(viewModel),
  ...buildTimeline(viewModel),
  ...buildIndicators(viewModel),
  ...buildAlerts(viewModel),
});

/**
 * Renders the view model as the HTML of an inline `custom_content` visualization, and the height its card
 * needs. The sandbox allows no scripts or images, so the charts are inline SVG. Colors are the renderer's
 * `--cc-*` theme tokens, mixes of them, and `light-dark()` pairs where EUI has no token, so the card
 * follows each viewer's theme. A card taller than its height scrolls.
 */
const SUMMARY_CALLOUT_PATTERN =
  /[ \t]*<div class="callout"><p class="clamp2"><strong class="callout-title">What happened · <\/strong>.*?<\/p><\/div>\n?/s;

/** The card's HTML without the summary callout, so two cards can be compared for everything but the summary. */
export const stripSummaryCallout = (html: string): string =>
  html.replace(SUMMARY_CALLOUT_PATTERN, '');

export const renderForensicsSummaryHtml = (
  viewModel: ForensicsSummaryViewModel
): { html: string; height: number } => {
  const { template, partials, css } = loadFiles();
  return {
    html: Mustache.render(template, buildContext(viewModel, css), partials, {
      escape: escapeHtml,
    }),
    height: clamp(
      Math.ceil(estimateForensicsSummaryHeight(viewModel)),
      CUSTOM_CONTENT_MIN_HEIGHT,
      CUSTOM_CONTENT_MAX_HEIGHT
    ),
  };
};
