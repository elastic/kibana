/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_REGISTRY, PND_GATE_STEP_IDS, RECOMMENDED_ACTIONS } from '@kbn/pnd-common';

import { PND_ACTIVITY_STEP_IDS, resolveActivityAction } from '.';

describe('PND_ACTIVITY_STEP_IDS', () => {
  it('is the registry step ids, so the query filter can never drift from the join', () => {
    expect([...PND_ACTIVITY_STEP_IDS].sort()).toEqual(
      PND_GATE_REGISTRY.map(({ stepId }) => stepId).sort()
    );
  });

  /**
   * The aggregation buckets on `stepId` alone (G4), so the join is only sound while no two gates
   * share a step id across workflows. This is the invariant that makes the one-level sub-agg
   * enough — if it ever breaks, the query needs a `workflowId` sub-agg and a
   * `getGateDefinition(workflowId, stepId)` join instead.
   */
  it('holds one distinct step id per registered gate', () => {
    expect(new Set(PND_ACTIVITY_STEP_IDS).size).toEqual(PND_GATE_REGISTRY.length);
  });
});

describe('resolveActivityAction', () => {
  it.each(PND_GATE_REGISTRY.map(({ recommendedAction, stepId }) => [stepId, recommendedAction]))(
    'resolves %s to the registry action %s',
    (stepId, recommendedAction) => {
      expect(resolveActivityAction(stepId)).toEqual(recommendedAction);
    }
  );

  it('covers every recommended action across the four gates, so no tile is unreachable', () => {
    expect(new Set(PND_ACTIVITY_STEP_IDS.map((stepId) => resolveActivityAction(stepId)))).toEqual(
      new Set(RECOMMENDED_ACTIONS)
    );
  });

  it('is fail-closed for an unregistered step id', () => {
    expect(resolveActivityAction('await_approval')).toBeUndefined();
  });

  it('resolves the tuning gate that lives on a different watch than the other three', () => {
    expect(resolveActivityAction(PND_GATE_STEP_IDS.awaitApplyTuning)).toEqual('tune');
  });
});
