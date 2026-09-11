/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { CHANGE_TYPES, SUPPRESSION_CAPABLE_RULE_TYPES, type ChangeType } from './constants';
import type { RuleTuningProposal } from './workflow_task';

const asProposal = (output: unknown): RuleTuningProposal => output as RuleTuningProposal;
const asExpected = (expected: unknown): { change_type?: ChangeType } | undefined =>
  expected as { change_type?: ChangeType } | undefined;

/**
 * Primary metric: did the workflow's `diagnose_rule` step pick the golden tuning path?
 * Binary per example; the mean across the dataset is the model's tuning-decision accuracy.
 */
export const changeTypeAccuracy: Evaluator = {
  name: 'ChangeTypeAccuracy',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const predicted = asProposal(output).change_type;
    const goldenLabel = asExpected(expected)?.change_type;
    const correct = predicted != null && predicted === goldenLabel;

    return {
      score: correct ? 1 : 0,
      label: predicted ?? 'none',
      explanation: `predicted="${predicted ?? 'none'}" expected="${goldenLabel ?? 'none'}"`,
      metadata: { predicted: predicted ?? null, expected: goldenLabel ?? null },
    };
  },
};

/**
 * Guardrail: the structured output must be a well-formed proposal — a `change_type` from the
 * workflow's enum and, per path, the payload fields the matching `can_apply_*` gate requires.
 * Catches schema drift and failed executions independently of whether the path was correct.
 *
 * This evaluator encodes the same fail-closed contract the workflow's classify_proposal step
 * enforces, so a model that emits e.g. `change_type: suppression` on a machine_learning rule
 * scores 0 here even before the runtime gate falls through to manual.
 */
export const validProposal: Evaluator = {
  name: 'ValidProposal',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const proposal = asProposal(output);
    const ruleType = (metadata as { ruleType?: string } | undefined)?.ruleType;

    const changeTypeValid =
      proposal.change_type != null &&
      (CHANGE_TYPES as readonly string[]).includes(proposal.change_type);

    let payloadValid = true;
    switch (proposal.change_type) {
      case 'exception':
        payloadValid =
          Array.isArray(proposal.exception_entries) && proposal.exception_entries.length > 0;
        break;
      case 'query':
        payloadValid =
          typeof proposal.proposed_query === 'string' && proposal.proposed_query !== '';
        break;
      case 'suppression':
        // `ruleType == null ||` here would make the whole rule-type precondition vacuous:
        // any example whose metadata lost ruleType would pass suppression validation for
        // free, which is exactly the gate/schema drift this evaluator exists to catch.
        // An unknown rule type cannot be validated, so it is not valid.
        payloadValid =
          Array.isArray(proposal.suppression_group_by) &&
          proposal.suppression_group_by.length > 0 &&
          ruleType != null &&
          (SUPPRESSION_CAPABLE_RULE_TYPES as readonly string[]).includes(ruleType);
        break;
      case 'risk_score':
        payloadValid =
          typeof proposal.proposed_risk_score === 'number' &&
          proposal.proposed_risk_score >= 0 &&
          proposal.proposed_risk_score <= 100 &&
          proposal.proposed_severity != null;
        break;
      case 'disable':
      case 'manual':
      default:
        break;
    }

    const valid = changeTypeValid && payloadValid;

    return {
      score: valid ? 1 : 0,
      label: valid ? 'valid' : 'invalid',
      metadata: { changeTypeValid, payloadValid, ruleType: ruleType ?? null },
    };
  },
};
