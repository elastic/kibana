/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup, EmbeddableStateWithType } from '@kbn/embeddable-plugin/server';
import { SLO_BURN_RATE_EMBEDDABLE_ID } from '../../../common/embeddables/burn_rate/constants';
import { getBurnRateEmbeddableSchema } from './burn_rate_schema';
import { getTransforms } from '../../../common/embeddables/burn_rate/transforms/transforms';

/**
 * Reports SLO burn rate panel usage (panel count and referenced slo_id) into the dashboard
 * panel-usage collector's per-type `details` bucket. Called by the dashboard plugin's usage
 * collector via `factory.telemetry(state, stats)` once per saved panel of this embeddable type,
 * across every dashboard in the cluster.
 */
export const getBurnRateEmbeddableTelemetry = (
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
 * Registers the schema, transforms, and telemetry hook for the SLO Burn Rate embeddable
 */
export const registerBurnRateEmbeddable = (embeddable: EmbeddableSetup): void => {
  embeddable.registerEmbeddableServerDefinition(SLO_BURN_RATE_EMBEDDABLE_ID, {
    title: 'SLO burn rate',
    getSchema: getBurnRateEmbeddableSchema,
    getTransforms,
  });

  embeddable.registerEmbeddableFactory({
    id: SLO_BURN_RATE_EMBEDDABLE_ID,
    telemetry: getBurnRateEmbeddableTelemetry,
  });
};
