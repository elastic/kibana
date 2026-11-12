/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVELOPE_FIXTURE as envelope } from '../worker_event_fields.fixture';
import {
  ALERT_TRIAGE_TELEMETRY_EVENTS,
  type AlertTriageTelemetryEventPayloads,
} from './alert_triage';

export const ALERT_TRIAGE_EVENT_FIXTURES: AlertTriageTelemetryEventPayloads = {
  [ALERT_TRIAGE_TELEMETRY_EVENTS.AlertTriageBatchClassified]: {
    ...envelope,
    alerts_total: 40,
    alerts_without_verdict: 2,
    fp_below_floor: 3,
    fp_candidates: 20,
    investigation_id: '5f0c3c8e-2d51-4b8a-9e0f-7c1d2b3a4e5f',
    verdicts_false_positive: 23,
    verdicts_inconclusive: 5,
    verdicts_true_positive: 10,
    worker_id: 'system-security-floor-alert-triage',
  },
  [ALERT_TRIAGE_TELEMETRY_EVENTS.AlertTriageBatchGrouped]: {
    ...envelope,
    alerts_joined: 0,
    alerts_pooled: 0,
    alerts_with_strict_key: 36,
    conversation_created: false,
    fp_candidates_on_fallback: 4,
    grouping: 'on',
    proposals_created: 0,
    strict_keys: 12,
    strict_keys_single_alert: 5,
    wide_keys: 8,
    wide_keys_single_alert: 3,
    worker_id: 'system-security-floor-alert-triage',
  },
  [ALERT_TRIAGE_TELEMETRY_EVENTS.AlertTriageClosureResolved]: {
    ...envelope,
    alerts_proposed: 20,
    alerts_retag_failed: 0,
    revisions: 1,
    auto_approve_requested: true,
    investigation_id: '5f0c3c8e-2d51-4b8a-9e0f-7c1d2b3a4e5f',
    outcome: 'approved',
    proposal_read_failed: false,
    worker_id: 'system-security-floor-alert-triage',
  },
};
