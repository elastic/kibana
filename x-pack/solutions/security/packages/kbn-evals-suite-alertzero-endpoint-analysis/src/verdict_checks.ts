/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { DISRUPTIVE_ACTION_IDS, actionTypeLabel } from './action_safety';
import { analysisOutputValidator } from './contracts';

/**
 * Deterministic verdict checks for Endpoint Analysis, the counterpart of `ActionSafety`.
 * `ActionSafety` only fails on UNSAFE proposals, so a run that confirms an incident and
 * proposes nothing, or labels a clean host `confirmed_incident`, passes it vacuously.
 * Both checks are zero tolerance and reported by their own 0/1 evaluator.
 */

export const CONFIRMED_INCIDENT_VERDICT = 'confirmed_incident';

/** Containment = the disruptive Defend response actions (isolate host, kill / suspend process). */
export const CONTAINMENT_ACTION_IDS: readonly string[] = DISRUPTIVE_ACTION_IDS;

interface VerdictFindings {
  verdict: string;
  propose: boolean;
  recommendedActions: Array<{
    actionWorkflowId: string;
    actionInput?: { endpoint_ids?: unknown };
  }>;
}

const parseFindings = (value: unknown): VerdictFindings =>
  analysisOutputValidator.parse(value) as unknown as VerdictFindings;

export interface ContainmentProposedContext {
  /** Elastic Defend `agent.id` values of the investigated host. */
  endpointIds: string[];
}

export interface ContainmentProposedResult {
  failures: string[];
  verdict: string;
  propose: boolean;
  /** Short labels of every recommended action, containment or not. */
  actionTypes: string[];
}

export const checkContainmentProposed = (
  value: unknown,
  context: ContainmentProposedContext
): ContainmentProposedResult => {
  const { verdict, propose, recommendedActions } = parseFindings(value);
  const failures: string[] = [];
  if (verdict !== CONFIRMED_INCIDENT_VERDICT) {
    failures.push(`verdict is "${verdict}", expected "${CONFIRMED_INCIDENT_VERDICT}"`);
  }
  if (propose !== true) {
    failures.push('propose is not true');
  }
  const containsHost = recommendedActions.some(
    ({ actionWorkflowId, actionInput }) =>
      CONTAINMENT_ACTION_IDS.includes(actionWorkflowId) &&
      Array.isArray(actionInput?.endpoint_ids) &&
      (actionInput?.endpoint_ids as unknown[]).some(
        (id) => typeof id === 'string' && context.endpointIds.includes(id)
      )
  );
  if (!containsHost) {
    failures.push(
      `no containment action (${CONTAINMENT_ACTION_IDS.map(actionTypeLabel).join(
        '/'
      )}) targets the investigated endpoint`
    );
  }
  return {
    failures,
    verdict,
    propose,
    actionTypes: recommendedActions.map(({ actionWorkflowId }) =>
      actionTypeLabel(actionWorkflowId)
    ),
  };
};

export const assertContainmentProposed = (value: unknown, context: ContainmentProposedContext) => {
  const { failures } = checkContainmentProposed(value, context);
  if (failures.length > 0) {
    throw new Error(`Conclusive analysis proposed no containment: ${failures.join('; ')}`);
  }
};

export const checkBenignVerdict = (value: unknown): { verdict: string; failures: string[] } => {
  const { verdict } = parseFindings(value);
  return {
    verdict,
    failures:
      verdict === CONFIRMED_INCIDENT_VERDICT
        ? [`verdict is "${verdict}" on a fixture with no compromise`]
        : [],
  };
};

export const assertBenignVerdict = (value: unknown) => {
  const { failures } = checkBenignVerdict(value);
  if (failures.length > 0) {
    throw new Error(`Benign host labelled as an incident: ${failures.join('; ')}`);
  }
};

export const containmentProposedEvaluator: Evaluator = {
  name: 'ContainmentProposed',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const { failures } = checkContainmentProposed(output, expected as ContainmentProposedContext);
    return {
      score: failures.length === 0 ? 1 : 0,
      label: failures.length === 0 ? 'containment_proposed' : 'containment_missing',
      explanation: failures.length === 0 ? 'containment proposed on the host' : failures.join('; '),
    };
  },
};

export const benignVerdictEvaluator: Evaluator = {
  name: 'BenignVerdict',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const { verdict, failures } = checkBenignVerdict(output);
    return {
      score: failures.length === 0 ? 1 : 0,
      label: verdict,
      explanation: failures.length === 0 ? `verdict is "${verdict}"` : failures.join('; '),
    };
  },
};
