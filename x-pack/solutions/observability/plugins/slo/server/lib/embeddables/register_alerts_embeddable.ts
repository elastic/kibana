/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup, EmbeddableStateWithType } from '@kbn/embeddable-plugin/server';
import { SLO_ALERTS_EMBEDDABLE_ID } from '../../../common/embeddables/alerts/constants';
import { getAlertsEmbeddableSchema } from './alerts_schema';
import { getTransforms } from '../../../common/embeddables/alerts/transforms/transforms';

/**
 * Reports SLO alerts panel usage (panel count and each referenced slo_id) into the dashboard
 * panel-usage collector's per-type `details` bucket. Called by the dashboard plugin's usage
 * collector via `factory.telemetry(state, stats)` once per saved panel of this embeddable type,
 * across every dashboard in the cluster. Unlike the other SLO embeddables, a single Alerts panel
 * can reference multiple SLOs, so each one is counted.
 */
export const getAlertsEmbeddableTelemetry = (
  state: EmbeddableStateWithType,
  stats: Record<string, number>
): Record<string, number> => {
  const outputStats = { ...stats };
  outputStats.total = (outputStats.total ?? 0) + 1;

  const slos = (state as { slos?: unknown }).slos;
  if (Array.isArray(slos)) {
    for (const sloItem of slos) {
      const sloId = (sloItem as { slo_id?: unknown } | undefined)?.slo_id;
      if (typeof sloId === 'string') {
        const key = `slo_id.${sloId}`;
        outputStats[key] = (outputStats[key] ?? 0) + 1;
      }
    }
  }

  return outputStats;
};

/**
 * Registers the schema, transforms, and telemetry hook for the SLO Alerts embeddable
 */
export const registerAlertsEmbeddable = (embeddable: EmbeddableSetup): void => {
  embeddable.registerEmbeddableServerDefinition(SLO_ALERTS_EMBEDDABLE_ID, {
    title: 'SLO alerts',
    getSchema: getAlertsEmbeddableSchema,
    getTransforms,
  });

  embeddable.registerEmbeddableFactory({
    id: SLO_ALERTS_EMBEDDABLE_ID,
    telemetry: getAlertsEmbeddableTelemetry,
  });
};
