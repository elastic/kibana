/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared, pure view helpers for the Significant Security Event's hit-centric
 * fields (plan D1/D7/D9/D13): the headline `summary`, the `basis` grading, a
 * check for whether a Tier 2 ES|QL proposal is an executable query, deriving
 * `detections[]` from a hunt result, and bucketing `events[]` by detection.
 * The SSE mapper and any renderer that needs the same text call these instead
 * of re-deriving it.
 */

export { buildSummary, type BuildSummaryOptions } from './build_summary';

export { classifyBasis, type SseBasis, type ClassifyBasisIoc } from './classify_basis';

export { isExecutableHuntQuery } from './is_executable_hunt_query';

export {
  deriveDetections,
  observedIocMatchFromEvents,
  reconcileIocDetectionFields,
  type SseDetection,
  type SseEventRef,
  type SseTier2Behavior,
  type DeriveDetectionsHuntResult,
  type DeriveDetectionsOptions,
} from './derive_detections';

export {
  groupEventsByDetection,
  type SseEventGroup,
  type GroupEventsHuntResult,
} from './group_events_by_detection';
