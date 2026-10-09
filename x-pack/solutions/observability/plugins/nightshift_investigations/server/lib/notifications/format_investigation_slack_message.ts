/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
 * summary, impacted entities, the top proposed action, and a link back to Kibana. Block Kit is a
 * separate follow-up; this text must stand on its own.
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
