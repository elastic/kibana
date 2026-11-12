/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVELOPE_FIXTURE as envelope } from '../worker_event_fields.fixture';
import {
  CONTINUOUS_THREAT_HUNT_TELEMETRY_EVENTS,
  type ContinuousThreatHuntTelemetryEventPayloads,
} from './continuous_threat_hunt';

export const CONTINUOUS_THREAT_HUNT_EVENT_FIXTURES: ContinuousThreatHuntTelemetryEventPayloads = {
  [CONTINUOUS_THREAT_HUNT_TELEMETRY_EVENTS.HuntReportCompleted]: {
    ...envelope,
    closed_clean: true,
    coverage_kis_skipped: 0,
    coverage_kis_written: 2,
    has_confirmed_hit: false,
    hunt_status: 'success',
    investigation_id: '3f1c2b4a-5d6e-5f70-8a9b-0c1d2e3f4a5b',
    mint_suppression: 'none',
    package_status: 'success',
    proposals_dispatch_failed: 0,
    proposals_prepared: 0,
    tier2_invoked: false,
    watch_tag: 'watch-hunt',
    worker_id: 'system-security-hunt-continuous-threat-hunt',
  },
};
