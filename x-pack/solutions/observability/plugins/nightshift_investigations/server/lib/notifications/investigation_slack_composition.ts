/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ComponentsNode } from '@kbn/isomer-components';
import type { KibanaIsomerRuntime } from '@kbn/isomer-plugin/server';
import type { JsonObject } from '@kbn/utility-types';
import type { Severity } from '@kbn/significant-events-schema';
import type { NotificationPhase } from './notification_routing';
import type { NotifiableInvestigation } from './notification_delivery';

export type SlackBlock = JsonObject & { type: string };

const MAX_HEADER_LENGTH = 200;
const MAX_CONTEXT_ITEM_LENGTH = 500;
const MAX_SUMMARY_LENGTH = 1500;
const MAX_HYPOTHESIS_REASON_LENGTH = 600;
const MAX_IMPACT_ENTITIES = 5;
const MAX_HYPOTHESES = 2;

// The only severity label map lives in the nightshift public plugin, which the server cannot import.
const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

const oneLine = (value: string): string => value.replace(/\s+/g, ' ').trim();

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const markdown = (text: string): ComponentsNode => ({ type: 'markdown', text });

const quote = (text: string): string =>
  text
    .split('\n')
    .map((line) => (line.trim() ? `> ${line}` : '>'))
    .join('\n');

const section = (title: string, ...body: ComponentsNode[]): ComponentsNode => ({
  type: 'section',
  title,
  body,
});

const collapsibleSection = (title: string, ...body: ComponentsNode[]): ComponentsNode => ({
  type: 'section',
  title,
  collapsible: true,
  body,
});

const context = (...items: string[]): ComponentsNode[] => {
  const present = items.filter(Boolean);
  return present.length > 0
    ? [
        {
          type: 'context',
          items: present.map((text) => ({
            text: truncate(oneLine(text), MAX_CONTEXT_ITEM_LENGTH),
          })),
        },
      ]
    : [];
};

const openInvestigation = (url: string): ComponentsNode => ({
  type: 'actions',
  buttons: [{ label: 'View Full Investigation', url, primary: true }],
});

const timedOutLabel = (): string =>
  i18n.translate('xpack.nightshiftInvestigations.notifications.timedOutLabel', {
    defaultMessage: 'Investigation timed out',
  });

const codeSpan = (value: string): string => `\`${value.replace(/`/g, "'")}\``;

const buildImpact = ({ impact }: NotifiableInvestigation): ComponentsNode[] => {
  const entityNames = (impact?.entities ?? []).map(({ name }) => oneLine(name)).filter(Boolean);
  const shown = entityNames.slice(0, MAX_IMPACT_ENTITIES).map(codeSpan);
  const hidden = entityNames.length - shown.length;
  const summary = impact?.summary?.trim();
  const body = [
    summary ? truncate(summary, MAX_SUMMARY_LENGTH) : '',
    shown.length > 0 ? `${shown.join(', ')}${hidden > 0 ? ` +${hidden} more` : ''}` : '',
  ].filter(Boolean);
  return body.length > 0 ? [section('Impact', markdown(body.join('\n\n')))] : [];
};

const buildHypotheses = ({ hypotheses = [] }: NotifiableInvestigation): ComponentsNode[] => {
  // Dismissed hypotheses are not findings. Without a confirmed one, the leading open one stands in.
  const byConfidence = [...hypotheses].sort((a, b) => b.confidence - a.confidence);
  const confirmed = byConfidence.filter(({ status }) => status === 'confirmed');
  const shown =
    confirmed.length > 0
      ? confirmed.slice(0, MAX_HYPOTHESES)
      : byConfidence.filter(({ status }) => status === 'investigating').slice(0, 1);
  if (shown.length === 0) {
    return [];
  }
  return [
    collapsibleSection(
      'Hypotheses',
      ...shown.map(({ candidate, confidence, status, reason }) => {
        const heading = `**${oneLine(candidate)}** _(${capitalize(status)} · ${Math.round(
          confidence * 100
        )}%)_`;
        const detail = reason?.trim();
        return markdown(
          detail ? `${heading}\n\n${truncate(detail, MAX_HYPOTHESIS_REASON_LENGTH)}` : heading
        );
      })
    ),
  ];
};

/** Lays an investigation's lifecycle message out as an Isomer composition. */
export const buildInvestigationSlackComposition = ({
  investigation,
  url,
  automationName,
  phase = 'completed',
  reason,
}: {
  investigation: NotifiableInvestigation;
  url: string;
  automationName?: string;
  phase?: NotificationPhase;
  reason?: string;
}): ComponentsNode[] => {
  const title: ComponentsNode = {
    type: 'header',
    text: truncate(oneLine(investigation.title) || 'Investigation', MAX_HEADER_LENGTH),
  };
  const automation = automationName ? `Automation: ${oneLine(automationName)}` : '';

  if (phase === 'started') {
    return [
      title,
      ...context(':hourglass_flowing_sand: Investigating…', automation),
      openInvestigation(url),
    ];
  }

  if (phase === 'failed' || phase === 'timed_out') {
    const outcome = phase === 'timed_out' ? timedOutLabel() : 'Investigation failed';
    const failureReason = reason?.trim() || investigation.error?.trim() || outcome;
    return [
      title,
      ...context(`:warning: ${outcome}`, automation),
      section('What went wrong', markdown(truncate(failureReason, MAX_SUMMARY_LENGTH))),
      openInvestigation(url),
    ];
  }

  const whatHappened = investigation.summary?.trim();
  const findings: ComponentsNode[] = [
    ...(whatHappened
      ? [
          collapsibleSection(
            "What's happened",
            markdown(truncate(whatHappened, MAX_SUMMARY_LENGTH))
          ),
        ]
      : []),
    ...buildImpact(investigation),
  ];
  const verdict = investigation.verdict?.trim();

  return [
    title,
    ...context(
      investigation.severity ? `Severity: ${SEVERITY_LABELS[investigation.severity]}` : '',
      automation
    ),
    ...findings,
    ...(verdict
      ? [section('Conclusion', markdown(quote(truncate(verdict, MAX_SUMMARY_LENGTH))))]
      : []),
    ...buildHypotheses(investigation),
    openInvestigation(url),
  ];
};

/** Renders the composition as Slack blocks and fallback text, throwing if Isomer rejects it. */
export const renderInvestigationSlackMessage = ({
  runtime,
  ...params
}: Parameters<typeof buildInvestigationSlackComposition>[0] & {
  runtime: KibanaIsomerRuntime;
}): { text: string; blocks: SlackBlock[] } => {
  const { text, blocks } = runtime.surfaces.slack.render(
    { type: 'view', body: buildInvestigationSlackComposition(params) },
    { heading: false }
  );
  return { text, blocks: blocks as SlackBlock[] };
};
