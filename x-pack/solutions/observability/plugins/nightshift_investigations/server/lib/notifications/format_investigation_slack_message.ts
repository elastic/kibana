/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import type { Severity } from '@kbn/significant-events-schema';
import type { NotificationPhase } from './notification_routing';
import type { NotifiableInvestigation } from './notification_delivery';

/** Slack truncates long messages; a channel post is a pointer, the detail lives in Kibana. */
const MAX_SUMMARY_LENGTH = 1500;
const MAX_IMPACT_ENTITIES = 5;

// The only severity label map lives in the nightshift public plugin, which the server cannot import.
const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Slack mrkdwn treats these as control characters, so LLM text has to be escaped before posting. */
const escapeMrkdwn = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

const oneLine = (value: string): string => value.replace(/\s+/g, ' ').trim();

/**
 * Renders an investigation's outcome as plain Slack mrkdwn: headline, severity and automation,
 * summary, impacted entities, the top proposed action, and a link back to Kibana. Slack shows it
 * in notifications and wherever the blocks cannot render, so it must stand on its own.
 */
export const formatInvestigationSlackMessage = ({
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
}): string => {
  const title = escapeMrkdwn(oneLine(investigation.title) || 'Investigation');
  const automation = automationName ? `Automation: ${escapeMrkdwn(oneLine(automationName))}` : '';
  const link = `<${url}|Open the investigation in Kibana>`;
  const render = (lines: string[]): string =>
    `${truncate(lines.filter(Boolean).join('\n'), Math.max(0, 4000 - link.length - 1))}\n${link}`;
  if (phase === 'started') {
    return render([`*${title}* — Investigation started`, automation]);
  }

  if (phase === 'failed') {
    const failureReason = reason || investigation.error || 'Investigation failed';
    return render([
      `*${title}* — Investigation failed: ${escapeMrkdwn(oneLine(failureReason))}`,
      automation,
    ]);
  }

  const severity = investigation.severity
    ? `Severity: ${SEVERITY_LABELS[investigation.severity]}`
    : '';
  const summary = investigation.summary
    ? escapeMrkdwn(truncate(investigation.summary.trim(), MAX_SUMMARY_LENGTH))
    : '';

  const entityNames = (investigation.impact?.entities ?? [])
    .map(({ name }) => oneLine(name))
    .filter(Boolean);
  const shownEntities = entityNames.slice(0, MAX_IMPACT_ENTITIES).map(escapeMrkdwn);
  const hiddenEntities = entityNames.length - shownEntities.length;
  const impact =
    shownEntities.length > 0
      ? `Impact: ${shownEntities.join(', ')}${hiddenEntities > 0 ? ` +${hiddenEntities} more` : ''}`
      : '';

  const topAction = investigation.recommendations?.[0]?.title;
  const action = topAction ? `Proposed action: ${escapeMrkdwn(oneLine(topAction))}` : '';

  return render([
    `*${title}* — Investigation completed`,
    [severity, automation].filter(Boolean).join(' · '),
    summary,
    impact,
    action,
  ]);
};

export type SlackBlock = JsonObject & { type: string };

/** Slack's limits: header text 150 characters, section text 3,000. */
const MAX_HEADER_LENGTH = 150;
const MAX_SECTION_LENGTH = 3000;
const MAX_HYPOTHESES = 2;
const MAX_HYPOTHESIS_REASON_LENGTH = 600;

const header = (text: string): SlackBlock => ({
  type: 'header',
  text: { type: 'plain_text', text: truncate(text, MAX_HEADER_LENGTH), emoji: true },
});

const context = (parts: string[]): SlackBlock => ({
  type: 'context',
  elements: [{ type: 'mrkdwn', text: parts.filter(Boolean).join('  ·  ') }],
});

/** `text` is already escaped mrkdwn. */
const mrkdwn = (text: string): SlackBlock => ({
  type: 'section',
  text: { type: 'mrkdwn', text: truncate(text, MAX_SECTION_LENGTH) },
});

/**
 * The label and each body get blocks of their own: Slack pads every block, which spaces the label
 * from its content, and collapses each long body behind its own "Show more".
 */
const section = (label: string, ...bodies: string[]): SlackBlock[] => [
  mrkdwn(`*${label}*`),
  ...bodies.map(mrkdwn),
];

const linkButton = (url: string): SlackBlock => ({
  type: 'actions',
  elements: [
    {
      type: 'button',
      text: { type: 'plain_text', text: 'View Full Investigation', emoji: true },
      url,
      style: 'primary',
    },
  ],
});

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const quote = (value: string): string =>
  value
    .split('\n')
    .map((line) => `>${line.trim() ? ` ${line}` : ''}`)
    .join('\n');

/**
 * Lays the same outcome out as Block Kit: the impact, then the conclusion quoted, the hypotheses,
 * and a button back to Kibana.
 */
export const buildInvestigationSlackBlocks = ({
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
}): SlackBlock[] => {
  const title = oneLine(investigation.title) || 'Investigation';
  const automation = automationName ? `Automation: ${escapeMrkdwn(oneLine(automationName))}` : '';

  if (phase === 'started') {
    return [
      header(title),
      context([':hourglass_flowing_sand: Investigating…', automation]),
      linkButton(url),
    ];
  }

  if (phase === 'failed') {
    const failureReason = reason?.trim() || investigation.error?.trim() || 'Investigation failed';
    return [
      header(title),
      context([':warning: Investigation failed', automation]),
      ...section('What went wrong', escapeMrkdwn(truncate(failureReason, MAX_SUMMARY_LENGTH))),
      linkButton(url),
    ];
  }

  const blocks: SlackBlock[] = [];

  const entityNames = (investigation.impact?.entities ?? [])
    .map(({ name }) => oneLine(name))
    .filter(Boolean);
  const shownEntities = entityNames
    .slice(0, MAX_IMPACT_ENTITIES)
    .map((name) => `\`${escapeMrkdwn(name)}\``);
  const hiddenEntities = entityNames.length - shownEntities.length;
  // Without an impact summary, what happened stands in for it.
  const impactText = investigation.impact?.summary?.trim() || investigation.summary?.trim();
  const impactLines = [
    impactText ? escapeMrkdwn(truncate(impactText, MAX_SUMMARY_LENGTH)) : '',
    shownEntities.length > 0
      ? `${shownEntities.join(', ')}${hiddenEntities > 0 ? ` +${hiddenEntities} more` : ''}`
      : '',
  ].filter(Boolean);
  if (impactLines.length > 0) {
    blocks.push(...section('Impact', impactLines.join('\n')), { type: 'divider' });
  }

  if (investigation.verdict?.trim()) {
    blocks.push(
      ...section(
        'Conclusion',
        quote(escapeMrkdwn(truncate(investigation.verdict.trim(), MAX_SUMMARY_LENGTH)))
      )
    );
  }

  // Dismissed hypotheses are not findings. Without a confirmed one, the leading open one stands in.
  const byConfidence = [...(investigation.hypotheses ?? [])].sort(
    (a, b) => b.confidence - a.confidence
  );
  const confirmed = byConfidence.filter(({ status }) => status === 'confirmed');
  const hypotheses =
    confirmed.length > 0
      ? confirmed.slice(0, MAX_HYPOTHESES)
      : byConfidence.filter(({ status }) => status === 'investigating').slice(0, 1);
  if (hypotheses.length > 0) {
    blocks.push(
      ...section(
        'Hypotheses',
        ...hypotheses.map(({ candidate, confidence, status, reason: hypothesisReason }) => {
          const label = `*${escapeMrkdwn(oneLine(candidate))}* _(${capitalize(
            status
          )} · ${Math.round(confidence * 100)}%)_`;
          return hypothesisReason?.trim()
            ? `• ${label}: ${escapeMrkdwn(
                truncate(oneLine(hypothesisReason), MAX_HYPOTHESIS_REASON_LENGTH)
              )}`
            : `• ${label}`;
        })
      )
    );
  }

  blocks.push(linkButton(url));
  return blocks;
};

/** The message to post: Block Kit blocks, and the mrkdwn text Slack falls back to. */
export const renderInvestigationSlackMessage = (
  params: Parameters<typeof buildInvestigationSlackBlocks>[0]
): { text: string; blocks: SlackBlock[] } => ({
  text: formatInvestigationSlackMessage(params),
  blocks: buildInvestigationSlackBlocks(params),
});
