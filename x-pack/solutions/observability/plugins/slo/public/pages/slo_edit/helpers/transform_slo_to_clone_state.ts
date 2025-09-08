/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecursivePartial } from '@elastic/eui';
import type {
  CreateSLOInput,
  SLODefinitionResponse,
  SLOWithSummaryResponse,
} from '@kbn/slo-schema';

export function transformSloToCloneState(
  slo: SLOWithSummaryResponse | SLODefinitionResponse
): RecursivePartial<CreateSLOInput> {
  return {
    id: undefined,
    name: `[Copy] ${slo.name}`,
    description: slo.description,
    tags: slo.tags,
    objective: slo.objective,
    indicator: slo.indicator,
    settings: slo.settings,
    budgetingMethod: slo.budgetingMethod,
    timeWindow: slo.timeWindow,
    groupBy: slo.groupBy,
  };
}
