/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { SLO_ERROR_BUDGET_SUPPORTED_TRIGGERS } from '../../../common/embeddables/error_budget/constants';

const ErrorBudgetCustomSchema = schema.object({
  slo_id: schema.string({
    meta: { description: 'The ID of the SLO to display the error budget for' },
  }),
  slo_instance_id: schema.maybe(
    schema.string({
      meta: {
        description:
          'ID of the SLO instance. Set when the SLO uses group_by; identifies which instance to show.',
      },
    })
  ),
});

export const getErrorBudgetEmbeddableSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) => {
  return schema.object(
    {
      ...ErrorBudgetCustomSchema.getPropSchemas(),
      ...getDrilldownsSchema(SLO_ERROR_BUDGET_SUPPORTED_TRIGGERS).getPropSchemas(),
      ...serializedTitlesSchema.getPropSchemas(),
    },
    {
      meta: {
        id: 'slo-error-budget-embeddable',
        description: 'SLO Error Budget embeddable schema',
      },
    }
  );
};

export type ErrorBudgetCustomState = TypeOf<typeof ErrorBudgetCustomSchema>;
export type ErrorBudgetEmbeddableState = TypeOf<ReturnType<typeof getErrorBudgetEmbeddableSchema>>;
