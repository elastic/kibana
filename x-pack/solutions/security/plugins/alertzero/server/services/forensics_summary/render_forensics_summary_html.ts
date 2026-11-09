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
import { CUSTOM_CONTENT_MAX_HEIGHT, CUSTOM_CONTENT_MIN_HEIGHT } from '@kbn/custom-content-common';
import { estimateForensicsSummaryHeight } from './estimate_forensics_summary_height';
import type { DecisionGroup, ForensicsSummaryViewModel, ForensicsVerdict } from './view_model';
import { countOpenDecisions } from './view_model';

const loadFiles = once(() => ({
  template: fs.readFileSync(path.join(__dirname, 'forensics_summary.mustache.html'), 'utf8'),
  css: fs.readFileSync(path.join(__dirname, 'forensics_summary.css'), 'utf8'),
}));

/** Model text, alert and user values are data: escaped before they touch the HTML. `{` too, so a template can't come back. */
const escapeHtml = (text: unknown): string => escape(String(text)).replace(/\{/g, '&#123;');

const VERDICTS: Record<ForensicsVerdict, { label: string; className: string }> = {
  confirmed_incident: { label: 'Confirmed incident', className: 'danger' },
  not_an_incident: { label: 'Not an incident', className: 'success' },
  unclear: { label: 'Unclear', className: 'warning' },
};

const DECISION_LABELS: Record<DecisionGroup, string> = {
  awaiting: 'awaiting',
  running: 'running',
  done: 'done',
  failed: 'failed',
  closed: 'closed',
};

const DECISION_CLASSES: Record<DecisionGroup, string> = {
  awaiting: 'warning',
  running: 'neutral',
  done: 'success',
  failed: 'danger',
  closed: 'hollow',
};

const MINUTES = 16;
const SECONDS = 19;

/** An ISO timestamp as `YYYY-MM-DD HH:mm[:ss] UTC`: the card is shared, so it names no viewer's zone. Unparseable text is kept. */
const formatUtc = (timestamp: string, precision: typeof MINUTES | typeof SECONDS): string => {
  const time = Date.parse(timestamp);
  return Number.isNaN(time)
    ? timestamp
    : `${new Date(time).toISOString().slice(0, precision).replace('T', ' ')} UTC`;
};

const countOf = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

const buildContext = (viewModel: ForensicsSummaryViewModel, css: string) => {
  const { verdict, decisions, scope, killChain, proposals, timeline, indicators, alerts } =
    viewModel;
  const { label: verdictLabel, className: verdictClass } = VERDICTS[verdict];
  const { window } = timeline;
  const moreEvents = timeline.total - timeline.events.length;

  return {
    ...viewModel,
    css,
    verdictLabel,
    verdictClass,
    analyzedAt: viewModel.analyzedAt && formatUtc(viewModel.analyzedAt, MINUTES),
    openDecisions: countOpenDecisions(viewModel),
    decisionFacts: (Object.keys(DECISION_LABELS) as DecisionGroup[])
      .filter((group) => decisions[group] > 0)
      .map((group) => ({ count: decisions[group], label: DECISION_LABELS[group] })),
    scopeFacts: [
      countOf(scope.hosts, 'host', 'hosts'),
      countOf(scope.identities, 'identity', 'identities'),
      countOf(scope.network, 'IP', 'IPs'),
    ],
    hasKillChain: killChain.length > 0,
    tacticCount: killChain.length,
    detectedTactics: killChain.filter(({ detected }) => detected).length,
    hasProposals: proposals.length > 0,
    proposalCount: proposals.length,
    proposals: proposals.map((proposal) => ({
      ...proposal,
      statusClass: DECISION_CLASSES[proposal.group],
      expiresAt: proposal.expiresAt && formatUtc(proposal.expiresAt, MINUTES),
    })),
    hasTimeline: timeline.events.length > 0,
    timeline: {
      ...timeline,
      events: timeline.events.map((event) => ({
        ...event,
        timestamp: formatUtc(event.timestamp, SECONDS),
      })),
    },
    timelineMeta: [
      countOf(timeline.total, 'event', 'events'),
      ...(window
        ? [`${formatUtc(window.start, MINUTES)} to ${formatUtc(window.end, MINUTES)}`]
        : []),
    ].join(' · '),
    moreEvents: moreEvents > 0 ? moreEvents : undefined,
    hasIndicators: indicators.length > 0,
    indicatorTotal: sum(indicators.map(({ count }) => count)),
    indicators: indicators.map((indicator) => ({
      ...indicator,
      valuesText: [
        ...indicator.values,
        ...(indicator.count > indicator.values.length
          ? [`+${indicator.count - indicator.values.length} more`]
          : []),
      ].join(' · '),
    })),
    hasAlerts: alerts.total > 0,
    hasShownAlerts: alerts.shown.length > 0,
    alerts: {
      ...alerts,
      shown: alerts.shown.map((alert) => ({
        ...alert,
        width: clamp(Math.round(alert.riskScore), 0, 100),
      })),
    },
  };
};

/**
 * Renders the view model as the HTML of an inline `custom_content` visualization, and the height its card
 * needs. The sandbox allows no scripts or images. Only `--cc-*` theme tokens and `light-dark()` pairs are
 * used, so the card follows each viewer's theme. A card taller than its height scrolls.
 */
export const renderForensicsSummaryHtml = (
  viewModel: ForensicsSummaryViewModel
): { html: string; height: number } => {
  const { template, css } = loadFiles();
  return {
    html: Mustache.render(template, buildContext(viewModel, css), undefined, {
      escape: escapeHtml,
    }),
    height: clamp(
      Math.ceil(estimateForensicsSummaryHeight(viewModel)),
      CUSTOM_CONTENT_MIN_HEIGHT,
      CUSTOM_CONTENT_MAX_HEIGHT
    ),
  };
};
