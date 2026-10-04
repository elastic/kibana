/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '@kbn/significant-events-schema';
import type { NotifiableInvestigation } from './notification_delivery';

/** Slack truncates long messages; a channel post is a pointer, the detail lives in Kibana. */
const MAX_SUMMARY_LENGTH = 1500;
const MAX_IMPACT_ENTITIES = 5;

// The only severity label map lives in the nightshift public plugin, which the server cannot import.
const SEVERITY_LABELS: Record<Severity, string> = {
  '80-critical': 'Critical',
  '60-high': 'High',
  '40-medium': 'Medium',
  '20-low': 'Low',
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
}: {
  investigation: NotifiableInvestigation;
  url: string;
  automationName?: string;
}): string => {
  const title = escapeMrkdwn(oneLine(investigation.title) || 'Investigation');
  const automation = automationName ? `Automation: ${escapeMrkdwn(oneLine(automationName))}` : '';
  const link = `<${url}|Open the investigation in Kibana>`;

  if (investigation.status === 'failed') {
    const reason = investigation.error ? `: ${escapeMrkdwn(oneLine(investigation.error))}` : '';
    return [`*${title}* — Investigation failed${reason}`, automation, link]
      .filter(Boolean)
      .join('\n');
  }

  if (investigation.status === 'cancelled') {
    return [`*${title}* — Investigation was stopped before it completed.`, automation, link]
      .filter(Boolean)
      .join('\n');
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

  return [
    `*${title}* — Investigation completed`,
    [severity, automation].filter(Boolean).join(' · '),
    summary,
    impact,
    action,
    link,
  ]
    .filter(Boolean)
    .join('\n');
};
