/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDecisionTreePlanSystemPrompt } from '@kbn/nightshift-decision-trees';

const MAX_PRIOR_MERMAID_CHARS = 60_000;
const MAX_RATIONALE_CHARS = 7_900;
const MAX_ACTIONS_CHARS = 4_000;

export interface PrepareDecisionTreeTurnInput {
  symptom: string;
  priorMermaid?: string;
  rationale: string;
  propose: boolean;
  actionsSummary?: string;
}

export interface PrepareDecisionTreeTurnResult {
  skipped: boolean;
  mode: 'extract' | 'reinforce';
  message: string;
}

/** Builds the structured-output prompt for one reinforce turn. A blank symptom or rationale skips. */
export const prepareDecisionTreeTurn = ({
  symptom,
  priorMermaid = '',
  rationale,
  propose,
  actionsSummary = '',
}: PrepareDecisionTreeTurnInput): PrepareDecisionTreeTurnResult => {
  const trimmedSymptom = symptom.trim();
  const trimmedRationale = rationale.trim();
  if (!trimmedSymptom || !trimmedRationale) {
    return { skipped: true, mode: 'extract', message: '' };
  }

  const prior = priorMermaid.trim();
  const mode = prior.length > 0 ? 'reinforce' : 'extract';
  const priorSection = prior
    ? prior.slice(0, MAX_PRIOR_MERMAID_CHARS)
    : 'None. Extract a new tree from this run.';
  const actions = actionsSummary.trim().slice(0, MAX_ACTIONS_CHARS) || 'None';

  const message = [
    buildDecisionTreePlanSystemPrompt(mode),
    '',
    `The symptom slug for this tree is \`${trimmedSymptom}\`. Use that slug. Do not put a host name, alert id, or investigation id in the tree.`,
    '',
    '## Existing decision tree',
    '',
    priorSection,
    '',
    '## Completed forensic analysis',
    '',
    `Containment proposed: ${propose ? 'yes' : 'no'}`,
    `Recommended actions: ${actions}`,
    '',
    'Assessment:',
    trimmedRationale.slice(0, MAX_RATIONALE_CHARS),
    '',
    'Return the updated tree. `decision_tree_mermaid` must be a `flowchart TD` diagram and must not be wrapped in code fences.',
  ].join('\n');

  return { skipped: false, mode, message };
};
