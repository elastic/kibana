/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateAlertEventData } from '@kbn/alerting-v2-schemas';
import {
  SIGNIFICANT_EVENTS_ALERT_SOURCE,
  SIGNIFICANT_EVENTS_SEVERITY_MAP,
  SIGNIFICANT_EVENTS_STATUS_MAP,
} from '@kbn/significant-events-schema';
import type { SignificantEvent } from './data_stream';

/**
 * Maps a SignificantEvent to the CreateAlertEventData payload accepted by
 * AlertEventsClient.createAlertEvent. Pure function — no I/O.
 *
 * Field placement decisions:
 * - fingerprint = event_id (stable series key; also kept in data for URL/API use)
 * - severity mapped at top level; not duplicated in data
 * - status mapped to alert_status only; closed and dismissed are both inactive by decision
 * - event_uuid / previous_event_uuid dropped (version order = @timestamp within group_hash)
 * - space_id is not set here — the request-scoped client injects it
 */
export const toRuleEvent = (event: SignificantEvent): CreateAlertEventData => {
  const data = Object.fromEntries(
    Object.entries({
      event_id: event.event_id,
      // rule_name is the alerting v2 UI display-name convention (read by the alerts UI)
      rule_name: event.title,
      title: event.title,
      summary: event.summary,
      confidence: event.confidence,
      stream_names: event.stream_names,
      symptom_hypothesis: event.symptom_hypothesis,
      assessment_note: event.assessment_note,
      signals: event.signals,
      causal_features: event.causal_features,
      blast_radius: event.blast_radius,
      investigations: event.investigations,
      workflow_execution_id: event.workflow_execution_id,
      conversation_id: event.conversation_id,
    }).filter(([_k, v]) => v !== undefined)
  );

  return {
    source: SIGNIFICANT_EVENTS_ALERT_SOURCE,
    fingerprint: event.event_id,
    timestamp: new Date(event['@timestamp']).toISOString(),
    severity: SIGNIFICANT_EVENTS_SEVERITY_MAP[event.severity],
    alert_status: SIGNIFICANT_EVENTS_STATUS_MAP[event.status],
    data,
  };
};
