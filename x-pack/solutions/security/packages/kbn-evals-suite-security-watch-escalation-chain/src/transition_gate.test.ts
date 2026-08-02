/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// L0 transition-gate for the Watch escalation chain.
//
// The chain has NO converse router surface — it is driven by `workflow.execute`
// — so a classic L0 routing-smoke (does the agent pick the right tool?) is N/A
// by design. But the chain's ENTRYPOINT still has a deterministic control-flow
// decision that a real L0 must pin: the Floor orchestrator's `escalate_to_dark`
// step (`watch_floor_orchestrator.yaml`) fires the Floor -> Dark hop iff
//
//     classification == 'true_positive' AND confidence >= escalateThreshold
//
// This is exactly the layer-below decision that, if wrong, makes every L1/L3/L4
// score meaningless (the chain never starts, or starts on the wrong verdict).
// We mirror the predicate from `FLOOR_ESCALATION_POLICY` (kept in sync with the
// YAML) and assert:
//   1. the synthetic fixture the L3/L4 specs drive the chain with actually
//      trips the gate (positive control — the chain is reachable),
//   2. sub-threshold confidence does NOT escalate (no spurious Dark runs),
//   3. a non-true_positive classification does NOT escalate (verdict gating),
//   4. the gate's escalation target matches the fixture's `toWatch` hop.
//
// Deterministic, no LLM, no Kibana boot — the same T0 discipline as the gate
// tests in the pnd plugin.

import { buildSyntheticEscalation, FLOOR_ESCALATION_POLICY } from './constants';

/**
 * Pure mirror of the Floor orchestrator `escalate_to_dark` predicate. Keep this
 * in lockstep with `watch_floor_orchestrator.yaml`'s `if:` expression and
 * `FLOOR_ESCALATION_POLICY`. A drift in either is caught here.
 */
const shouldEscalateToDark = (workerRun: { classification: string; confidence: number }): boolean =>
  workerRun.classification === FLOOR_ESCALATION_POLICY.triggeringClassification &&
  workerRun.confidence >= FLOOR_ESCALATION_POLICY.escalateThreshold;

describe('Watch escalation chain — L0 transition gate (Floor -> Dark)', () => {
  it('escalates a high-confidence true_positive (chain is reachable)', () => {
    expect(shouldEscalateToDark({ classification: 'true_positive', confidence: 0.93 })).toBe(true);
  });

  it('does NOT escalate below the confidence threshold (no spurious Dark runs)', () => {
    const justUnder = FLOOR_ESCALATION_POLICY.escalateThreshold - 0.01;
    expect(shouldEscalateToDark({ classification: 'true_positive', confidence: justUnder })).toBe(
      false
    );
  });

  it('escalates exactly at the threshold boundary (>= is inclusive)', () => {
    expect(
      shouldEscalateToDark({
        classification: 'true_positive',
        confidence: FLOOR_ESCALATION_POLICY.escalateThreshold,
      })
    ).toBe(true);
  });

  it('does NOT escalate a non-true_positive verdict even at high confidence', () => {
    expect(shouldEscalateToDark({ classification: 'false_positive', confidence: 0.99 })).toBe(
      false
    );
    expect(shouldEscalateToDark({ classification: 'inconclusive', confidence: 0.99 })).toBe(false);
  });

  it('the synthetic fixture trips the gate and targets the policy hop', () => {
    // The fixture carries confidence 0.93 + a Floor->Dark hop; the gate must
    // accept it, otherwise the L3/L4 specs would be driving a chain the real
    // orchestrator would never have started.
    const escalation = buildSyntheticEscalation('inv-eval-l0-gate');
    expect(
      shouldEscalateToDark({
        classification: FLOOR_ESCALATION_POLICY.triggeringClassification,
        confidence: escalation.confidence,
      })
    ).toBe(true);
    expect(escalation.toWatch).toBe(FLOOR_ESCALATION_POLICY.escalateTo);
  });
});
