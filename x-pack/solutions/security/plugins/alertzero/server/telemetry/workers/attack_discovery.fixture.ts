/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVELOPE_FIXTURE as envelope } from '../worker_event_fields.fixture';
import {
  ATTACK_DISCOVERY_TELEMETRY_EVENTS,
  type AttackDiscoveryTelemetryEventPayloads,
} from './attack_discovery';

export const ATTACK_DISCOVERY_EVENT_FIXTURES: AttackDiscoveryTelemetryEventPayloads = {
  [ATTACK_DISCOVERY_TELEMETRY_EVENTS.AdWorkerRunCompleted]: {
    ...envelope,
    alerts_analyzed: 120,
    attacks_generated: 4,
    attacks_persisted: 3,
    batches_failed: 0,
    batches_total: 2,
    run_outcome: 'produced',
  },
  [ATTACK_DISCOVERY_TELEMETRY_EVENTS.AdWorkerReviewStarted]: {
    ...envelope,
    investigation_id: '5f0c3c8e-2d51-4b8a-9e0f-7c1d2b3a4e5f',
    is_rereview: false,
  },
  [ATTACK_DISCOVERY_TELEMETRY_EVENTS.AdWorkerAnalysisCompleted]: {
    ...envelope,
    analysis_error: false,
    verdict: 'true_positive',
  },
  [ATTACK_DISCOVERY_TELEMETRY_EVENTS.AdWorkerHandoffResolved]: {
    ...envelope,
    auto_approve_requested: true,
    outcome: 'approved',
    verdict: 'true_positive',
  },
};
