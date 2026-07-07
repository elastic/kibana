/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup, EmbeddableStateWithType } from '@kbn/embeddable-plugin/server';
import { SLO_ERROR_BUDGET_ID } from '../../../common/embeddables/error_budget/constants';
import { getErrorBudgetEmbeddableSchema } from './error_budget_schema';
import { getTransforms } from '../../../common/embeddables/error_budget/transforms/transforms';

/**
 * Reports SLO error budget panel usage (panel count and referenced slo_id) into the dashboard
 * panel-usage collector's per-type `details` bucket. Called by the dashboard plugin's usage
 * collector via `factory.telemetry(state, stats)` once per saved panel of this embeddable type,
 * across every dashboard in the cluster.
 */
export const getErrorBudgetEmbeddableTelemetry = (
  state: EmbeddableStateWithType,
  stats: Record<string, number>
): Record<string, number> => {
  const outputStats = { ...stats };
  outputStats.total = (outputStats.total ?? 0) + 1;

  const sloId = (state as { slo_id?: unknown }).slo_id;
  if (typeof sloId === 'string') {
    const key = `slo_id.${sloId}`;
    outputStats[key] = (outputStats[key] ?? 0) + 1;
  }

  return outputStats;
};

/**
 * Registers the schema, transforms, and telemetry hook for the SLO Error Budget embeddable
 */
export const registerErrorBudgetEmbeddable = (embeddable: EmbeddableSetup): void => {
  embeddable.registerEmbeddableServerDefinition(SLO_ERROR_BUDGET_ID, {
    title: 'SLO error budget',
    getSchema: getErrorBudgetEmbeddableSchema,
    getTransforms,
  });

  embeddable.registerEmbeddableFactory({
    id: SLO_ERROR_BUDGET_ID,
    telemetry: getErrorBudgetEmbeddableTelemetry,
  });
};
