/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { SLO_ERROR_BUDGET_ID } from '../../../common/embeddables/error_budget/constants';
import { getErrorBudgetEmbeddableSchema } from './error_budget_schema';
import { getTransforms } from '../../../common/embeddables/error_budget/transforms/transforms';

/**
 * Registers the schema and transforms for the SLO Error Budget embeddable
 */
export const registerErrorBudgetEmbeddable = (embeddable: EmbeddableSetup): void => {
  embeddable.registerEmbeddableServerDefinition(SLO_ERROR_BUDGET_ID, {
    title: 'SLO error budget',
    getSchema: getErrorBudgetEmbeddableSchema,
    getTransforms,
  });
};
