/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup, EmbeddableStateWithType } from '@kbn/embeddable-plugin/server';
import { SLO_OVERVIEW_EMBEDDABLE_ID } from '../../../common/embeddables/overview/constants';
import { getOverviewEmbeddableSchema } from './schema';
import { getTransforms } from '../../../common/embeddables/overview/transforms/transforms';

/**
 * Reports SLO overview panel usage (panel count and, for single-SLO panels, the referenced
 * slo_id) into the dashboard panel-usage collector's per-type `details` bucket. Called by the
 * dashboard plugin's usage collector via `factory.telemetry(state, stats)` once per saved panel
 * of this embeddable type, across every dashboard in the cluster.
 */
export const getOverviewEmbeddableTelemetry = (
  state: EmbeddableStateWithType,
  stats: Record<string, number>
): Record<string, number> => {
  const outputStats = { ...stats };
  outputStats.total = (outputStats.total ?? 0) + 1;

  const overviewMode = (state as { overview_mode?: unknown }).overview_mode;
  const sloId = (state as { slo_id?: unknown }).slo_id;

  if (overviewMode === 'single' && typeof sloId === 'string') {
    const key = `slo_id.${sloId}`;
    outputStats[key] = (outputStats[key] ?? 0) + 1;
  } else if (overviewMode === 'groups') {
    outputStats.groups = (outputStats.groups ?? 0) + 1;
  }

  return outputStats;
};

/**
 * Registers the schema, transforms, and telemetry hook for the SLO Overview embeddable
 */
export const registerOverviewEmbeddable = (embeddable: EmbeddableSetup): void => {
  embeddable.registerEmbeddableServerDefinition(SLO_OVERVIEW_EMBEDDABLE_ID, {
    title: 'SLO overview',
    getSchema: getOverviewEmbeddableSchema,
    getTransforms,
  });

  embeddable.registerEmbeddableFactory({
    id: SLO_OVERVIEW_EMBEDDABLE_ID,
    telemetry: getOverviewEmbeddableTelemetry,
  });
};
