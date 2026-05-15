/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { Lead, LeadGenerationDatasetExample, LeadGenerationTaskOutput } from '../types';

export const LEAD_GENERATION_BASIC_EVALUATOR_NAME = 'LeadGenerationBasic';

const isValidLead = (lead: unknown): lead is Lead => {
  if (typeof lead !== 'object' || lead === null) return false;
  const l = lead as Record<string, unknown>;
  return (
    typeof l.id === 'string' &&
    l.id.length > 0 &&
    typeof l.title === 'string' &&
    l.title.length > 0 &&
    typeof l.byline === 'string' &&
    typeof l.description === 'string' &&
    Array.isArray(l.entities) &&
    typeof l.priority === 'number' &&
    l.priority >= 1 &&
    l.priority <= 10 &&
    Array.isArray(l.observations) &&
    typeof l.executionUuid === 'string'
  );
};

/**
 * CODE evaluator: verifies that the pipeline ran without errors and every
 * returned lead has the expected shape. A zero-lead result from an empty
 * entity store is still scored 1 (the pipeline ran successfully).
 */
export const createLeadGenerationBasicEvaluator = (): Evaluator<
  LeadGenerationDatasetExample,
  LeadGenerationTaskOutput
> => ({
  name: LEAD_GENERATION_BASIC_EVALUATOR_NAME,
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const errors = output?.errors;
    if (errors && errors.length > 0) {
      return { score: 0, label: 'pipeline_error' };
    }

    const leads = output?.leads;
    if (!Array.isArray(leads)) {
      return { score: 0, label: 'missing_leads_array' };
    }

    const invalidLead = leads.find((l) => !isValidLead(l));
    if (invalidLead) {
      return { score: 0, label: 'invalid_lead_shape' };
    }

    return { score: 1, label: leads.length > 0 ? 'ok_with_leads' : 'ok_no_leads' };
  },
});
