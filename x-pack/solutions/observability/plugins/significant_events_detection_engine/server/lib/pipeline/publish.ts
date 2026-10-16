/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import type { RuleEventsClient } from '@kbn/significant-events-plugin/server';
import type { EngineEvent, EventMember } from '../../../common';

const MAX_SUMMARY_LENGTH = 600;
const MAX_SIGNAL_DESCRIPTION_LENGTH = 500;
const MAX_SIGNALS = 100;

type Signal = NonNullable<SignificantEvent['signals']>[number];

function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length - 3)}...` : text;
}

/** Maps a member to a Significant Events signal, keeping verdict and evidence consistent. */
function toSignal(member: EventMember): Signal {
  const metadata = {
    detection_id: member.latest_detection_id,
    rule_uuid: member.fingerprint,
    rule_name: truncate(member.title, 255),
    // The engine does not run change-point detection; a drop is the closest type for silence.
    change_point_type: member.unit === 'drop' ? ('dip' as const) : ('spike' as const),
    p_value: 0,
    severity_score: Math.max(0, Math.min(100, Math.round(member.importance))),
  };
  const base = {
    type: 'detection' as const,
    source_id: member.source_id ?? member.strategy,
    description: truncate(
      `${member.title} (${member.strategy}, ${member.service}). Value ${member.value} ${
        member.unit
      }${member.threshold === undefined ? '' : `, normal up to ${member.threshold.toFixed(3)}`}.`,
      MAX_SIGNAL_DESCRIPTION_LENGTH
    ),
    collected_at: member.last_seen,
    metadata,
  };
  if (!member.verdict || !member.evidence_result) {
    return { ...base, verdict: 'not_checked', evidence: null };
  }
  const verdict =
    member.verdict === 'refutes' && member.evidence_result === 'error'
      ? 'inconclusive'
      : member.verdict;
  return {
    ...base,
    verdict,
    evidence: { esql_query: member.evidence_esql, result: member.evidence_result },
  };
}

/** The Significant Events shape of an engine event, as written to `.rule-events`. */
export function toSignificantEvent(event: EngineEvent): SignificantEvent {
  const verdicts = event.assessment?.verdicts ?? [];
  const confirming = verdicts.filter((verdict) => verdict.verdict === 'confirms').length;
  return {
    event_id: event.event_id,
    '@timestamp': event.updated_at,
    title: truncate(event.title, 512),
    summary: truncate(event.summary, MAX_SUMMARY_LENGTH),
    severity: event.severity,
    status: event.status,
    confidence: verdicts.length > 0 ? Math.round((confirming / verdicts.length) * 100) / 100 : 0.5,
    source_ids: [
      ...new Set(event.members.flatMap((member) => (member.source_id ? [member.source_id] : []))),
    ],
    signals: event.members.slice(0, MAX_SIGNALS).map(toSignal),
    assessment_note: event.assessment
      ? truncate(
          `Detection engine, ${event.assessment.agent} agent. ${
            event.assessment.severity_guard ?? ''
          }`.trim(),
          MAX_SUMMARY_LENGTH
        )
      : undefined,
  };
}

/**
 * The hand-off: writes the event as an Alerting v2 alert through the plugin's own client, which
 * also fires the Significant Events workflow triggers that notifications and investigations use.
 */
export async function publishToAlertingV2({
  ruleEventsClient,
  event,
}: {
  ruleEventsClient: RuleEventsClient;
  event: EngineEvent;
}): Promise<void> {
  const next = toSignificantEvent(event);
  const prior = await ruleEventsClient.findLatestByEventId(event.event_id);
  if (!prior) {
    await ruleEventsClient.createEvent({ event: next });
    return;
  }
  const result = await ruleEventsClient.updateEvent({ event: next, prior });
  if (!result.updated) {
    throw new Error('Another writer updated the alert first; it will be retried on the next run');
  }
}
