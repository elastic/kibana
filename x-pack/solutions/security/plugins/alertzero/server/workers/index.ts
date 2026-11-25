/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertTriageServerDefinition } from '../alert_triage/worker_server';
import { continuousThreatHuntServerDefinition } from '../services/watches/hunt/worker_server';
import type { WorkerServerDefinition } from './types';

/** One entry per Worker that declares steps or flags. */
export const WORKER_SERVER_DEFINITIONS: readonly WorkerServerDefinition[] = [
  alertTriageServerDefinition,
  continuousThreatHuntServerDefinition,
];

export { createWorkerFeatureFlagValues } from './feature_flags';
export type {
  WorkerFeatureFlag,
  WorkerServerContext,
  WorkerServerDefinition,
  WorkerStepDefinition,
} from './types';
