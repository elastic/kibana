/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVELOPE_FIXTURE as envelope } from '../worker_event_fields.fixture';
import { RULE_TUNING_TELEMETRY_EVENTS, type RuleTuningTelemetryEventPayloads } from './rule_tuning';

export const RULE_TUNING_EVENT_FIXTURES: RuleTuningTelemetryEventPayloads = {
  [RULE_TUNING_TELEMETRY_EVENTS.RuleTuningReviewCompleted]: {
    ...envelope,
    applied: true,
    approved_not_applied: false,
    backtest_ran: true,
    backtest_reduced_alerts: true,
    change_type: 'exception',
    confidence: 'medium',
    decision: 'approved',
    entry_gate: 'approved',
    investigation_id: '5f0c3c8e-2d51-4b8a-9e0f-7c1d2b3a4e5f',
    rule_source: 'custom',
    rule_type: 'esql',
    rule_unavailable: false,
    watch_tag: 'watch-detection',
    worker_id: 'system-security-detection-rule-tuning',
  },
};
