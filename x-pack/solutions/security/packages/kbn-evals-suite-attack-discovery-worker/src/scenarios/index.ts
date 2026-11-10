/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUDIT_SCENARIOS, type AuditScenario } from '@kbn/evals-suite-attack-discovery';
import { baitFalsePositiveScenario } from './bait_false_positive';
import { seededFalsePositiveScenario } from './seeded_false_positive';

/**
 * Every scenario the worker suite runs: the shared audit scenarios plus the two worker-only
 * false-positive rows, whose worlds live in `worker_world.ts` rather than the shared suite.
 */
export const WORKER_AUDIT_SCENARIOS: readonly AuditScenario[] = [
  ...AUDIT_SCENARIOS,
  baitFalsePositiveScenario,
  seededFalsePositiveScenario,
];
