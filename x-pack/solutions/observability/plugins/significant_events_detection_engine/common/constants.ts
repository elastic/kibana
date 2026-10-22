/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Plugin id, as declared in kibana.jsonc. Also the owner of the engine's managed workflow. */
export const DETECTION_ENGINE_PLUGIN_ID = 'significantEventsDetectionEngine';

/** Every route of the engine lives under this path. */
export const DETECTION_ENGINE_API_BASE_PATH = '/internal/significant_events/detection_engine';

/** Size of one evaluation bucket. Every strategy, rule and baseline counts in these. */
export const BUCKET_MS = 60_000;

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Id of the Agent Builder profile the engine runs its triage step with. */
export const DETECTION_ENGINE_TRIAGE_AGENT_ID = 'significant-events.detection-engine-triage';

/** Id of the managed workflow that runs the engine on a schedule, before the per-space suffix. */
export const DETECTION_ENGINE_SCHEDULER_WORKFLOW_ID = 'system-significant-events-detection-engine';
