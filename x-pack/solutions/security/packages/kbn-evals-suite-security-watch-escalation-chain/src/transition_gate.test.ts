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
// decision that a real L0 must pin: the Floor -> Dark hop fires iff
//
//     classification == 'true_positive' AND confidence >= escalateThreshold
//
// This is exactly the layer-below decision that, if wrong, makes every L1/L3/L4
// score meaningless (the chain never starts, or starts on the wrong verdict).
//
// The predicate is production code (`./transition_gate`), and the policy it
// reads is bound — below — to the Floor worker's managed definition
// (`floor_alert_triage.yaml`): the triggering verdict must be one of the
// classifications that definition's structured output can emit, and the
// threshold must sit inside the confidence range it declares. Restating both
// the predicate and the expected numbers inside this file (as it used to) meant
// a change to the production contract left every assertion green.
//
// Deterministic, no LLM, no Kibana boot — the same T0 discipline as the gate
// tests in the pnd plugin.

import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { buildSyntheticEscalation, FLOOR_ESCALATION_POLICY } from './constants';
import { shouldEscalateToDark } from './transition_gate';

/**
 * The Floor worker's managed workflow definition, relative to the repo root.
 *
 * `watch_floor_orchestrator.yaml` — the file this gate's comment used to name as
 * its source — does not exist in this repository (`git grep` finds only the
 * comments referencing it). The orchestrator that would own the
 * `escalate_to_dark` step is not in-tree, so the binding that CAN be enforced
 * here is to the contract the predicate consumes: the Floor worker's declared
 * verdict schema.
 */
const FLOOR_DEFINITION_PATH = path.resolve(
  __dirname,
  '../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/floor_alert_triage.yaml'
);

interface FloorVerdictSchema {
  classificationEnum: string[];
  confidenceMinimum: number;
  confidenceMaximum: number;
}

const readFloorVerdictSchema = (): FloorVerdictSchema => {
  if (!fs.existsSync(FLOOR_DEFINITION_PATH)) {
    throw new Error(
      `Floor alert-triage managed definition not found at ${FLOOR_DEFINITION_PATH}. ` +
        `This gate binds FLOOR_ESCALATION_POLICY to that definition; if the file moved, update the path here.`
    );
  }

  const definition = parse(fs.readFileSync(FLOOR_DEFINITION_PATH, 'utf8')) as {
    steps?: Array<{
      type?: string;
      with?: {
        schema?: {
          properties?: {
            classification?: { enum?: string[] };
            confidence_score?: { minimum?: number; maximum?: number };
          };
        };
      };
    }>;
  };

  const step = (definition.steps ?? []).find((s) => s?.with?.schema?.properties?.classification);
  const properties = step?.with?.schema?.properties;
  const classificationEnum = properties?.classification?.enum;
  const confidenceMinimum = properties?.confidence_score?.minimum;
  const confidenceMaximum = properties?.confidence_score?.maximum;

  if (!classificationEnum || confidenceMinimum === undefined || confidenceMaximum === undefined) {
    throw new Error(
      'floor_alert_triage.yaml no longer declares a classification enum plus a confidence_score ' +
        'range; the Floor -> Dark gate cannot be bound to it any more.'
    );
  }

  return { classificationEnum, confidenceMinimum, confidenceMaximum };
};

const verdictsOtherThanTrigger = (): string[] =>
  readFloorVerdictSchema().classificationEnum.filter(
    (verdict) => verdict !== FLOOR_ESCALATION_POLICY.triggeringClassification
  );

describe('Watch escalation chain — L0 transition gate (Floor -> Dark)', () => {
  describe('bound to the Floor worker managed definition', () => {
    it('the triggering classification is one the Floor verdict schema can emit', () => {
      expect(readFloorVerdictSchema().classificationEnum).toContain(
        FLOOR_ESCALATION_POLICY.triggeringClassification
      );
    });

    it('the escalation threshold sits inside the declared confidence_score range', () => {
      const { confidenceMinimum, confidenceMaximum } = readFloorVerdictSchema();
      expect(FLOOR_ESCALATION_POLICY.escalateThreshold).toBeGreaterThanOrEqual(confidenceMinimum);
      expect(FLOOR_ESCALATION_POLICY.escalateThreshold).toBeLessThanOrEqual(confidenceMaximum);
    });

    it('the negative verdicts asserted below are real verdicts, not invented strings', () => {
      const { classificationEnum } = readFloorVerdictSchema();
      // Distinct from the triggering verdict, or the negative cases would be
      // asserting the positive case backwards.
      expect(verdictsOtherThanTrigger().length).toBeGreaterThan(0);
      for (const verdict of ['false_positive', 'inconclusive']) {
        expect(classificationEnum).toContain(verdict);
      }
    });
  });

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

  it('does NOT escalate any other verdict the Floor schema can emit, even at high confidence', () => {
    for (const verdict of verdictsOtherThanTrigger()) {
      expect(shouldEscalateToDark({ classification: verdict, confidence: 0.99 })).toBe(false);
    }
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
