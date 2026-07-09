/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';

// Stub: real event schemas are added by a later PR in the stack alongside the
// rest of the event-based-telemetry wiring. PR2's discoveries plugin scaffold
// needs these event constants to exist so plugin.ts can call
// `core.analytics.registerEventType(...)`. Registering an event type with the
// analytics service is FF-off safe — it only declares the schema; no events
// are emitted unless the discoveries plugin runtime path is taken (FF-gated).
export const ATTACK_DISCOVERY_MISCONFIGURATION_EVENT: EventTypeOpts<Record<string, unknown>> = {
  eventType: 'attack_discovery_misconfiguration',
  schema: {},
};

export const ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT: EventTypeOpts<Record<string, unknown>> = {
  eventType: 'attack_discovery_schedule_action',
  schema: {},
};

export const ATTACK_DISCOVERY_STEP_FAILURE_EVENT: EventTypeOpts<Record<string, unknown>> = {
  eventType: 'attack_discovery_step_failure',
  schema: {},
};
