/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtractedBehavior } from './hunt_behavior_client';

/**
 * Task output for one report. The task POSTs the report body to the live
 * `hunt_behavior` route and projects the response into the flat shape the
 * evaluators consume.
 */
export interface HuntTaskOutput {
  reportId?: string;
  /** Technique IDs the model kept (passed catalog validation). */
  techniques: string[];
  /** Parent technique IDs for sub-techniques (e.g. T1566 for T1566.001). */
  parentTechniques: string[];
  /** Technique IDs the model proposed that failed catalog validation. */
  droppedUnknownIds: string[];
  /** Proposed ES|QL detection rules, one per kept behavior. */
  esqlRules: string[];
  /** Full validated behaviors (technique_id + confidence + rule). */
  behaviors: ExtractedBehavior[];
  /** OTel trace id so trace-based evaluators can resolve latency/tokens. */
  traceId?: string;
}
