/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import { z } from '@kbn/zod';
import { ALL_VALUE } from '@kbn/slo-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { SLO_ERROR_BUDGET_SUPPORTED_TRIGGERS } from '../../../common/embeddables/error_budget/constants';

const ErrorBudgetCustomSchema = z.object({
  slo_id: z.string().meta({
    description: 'The ID of the SLO to display the error budget for',
  }),
  slo_instance_id: z.string().default(ALL_VALUE).meta({
    description:
      'ID of the SLO instance. Set when the SLO uses group_by; identifies which instance to show. Defaults to * (all instances).',
  }),
});

export const getErrorBudgetEmbeddableSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) => {
  return z
    .object({
      ...ErrorBudgetCustomSchema.shape,
      ...getDrilldownsSchema(SLO_ERROR_BUDGET_SUPPORTED_TRIGGERS).shape,
      ...serializedTitlesSchema.shape,
    })
    .meta({
      id: 'slo-error-budget-embeddable',
      description: 'SLO Error Budget embeddable schema',
    });
};

export type ErrorBudgetCustomState = z.output<typeof ErrorBudgetCustomSchema>;
export type ErrorBudgetEmbeddableState = z.output<
  ReturnType<typeof getErrorBudgetEmbeddableSchema>
>;
