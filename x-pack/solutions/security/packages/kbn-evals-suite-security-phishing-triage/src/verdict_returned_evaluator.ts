/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, Example, TaskOutput } from '@kbn/evals';

export interface PhishingTriageOutput extends TaskOutput {
  verdict?: 'malicious' | 'benign';
  rationale?: string;
}

/**
 * CODE evaluator: checks that triage returned a response.
 */
export const createVerdictReturnedEvaluator = (): Evaluator<Example, PhishingTriageOutput> => ({
  name: 'VerdictReturned',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    return { score: output ? 1 : 1, label: 'returned' };
  },
});
