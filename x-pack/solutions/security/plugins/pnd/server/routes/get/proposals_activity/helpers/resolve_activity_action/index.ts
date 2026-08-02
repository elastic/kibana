/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_REGISTRY } from '@kbn/pnd-common';
import type { PndGateStepId, RecommendedAction } from '@kbn/pnd-common';

/**
 * The `waitForInput` step ids the activity query is allow-listed to — the registry's own, so the
 * query filter can never drift from the join below.
 */
export const PND_ACTIVITY_STEP_IDS: readonly PndGateStepId[] = PND_GATE_REGISTRY.map(
  ({ stepId }) => stepId
);

const ACTION_BY_STEP_ID: ReadonlyMap<string, RecommendedAction> = new Map(
  PND_GATE_REGISTRY.map(({ recommendedAction, stepId }): [string, RecommendedAction] => [
    stepId,
    recommendedAction,
  ])
);

/**
 * Join a bucketed `stepId` to the recommended action its gate belongs to.
 *
 * G4: contain/escalate/investigate/tune is not a mapped field on `.workflows-step-executions`
 * (`dynamic: false`), so it cannot be aggregated on — the histogram buckets on `stepId` and the
 * category is recovered here, in JS, from `PND_GATE_REGISTRY`.
 *
 * The registry is keyed by `(workflowId, stepId)`, but the sub-aggregation only carries `stepId`.
 * That is sound because the four gates have four distinct step ids, which `index.test.ts` pins;
 * were a fifth gate ever to reuse one, the query would need a `workflowId` sub-aggregation and a
 * `getGateDefinition(workflowId, stepId)` join instead.
 *
 * Fail-closed like the rest of the registry lookups: a step id outside it — a PND watch's
 * non-gate `waitForInput` — contributes to no category rather than to an arbitrary one.
 */
export const resolveActivityAction = (stepId: string): RecommendedAction | undefined =>
  ACTION_BY_STEP_ID.get(stepId);
