/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';

export interface PerformanceMeasurement {
  name: string;
  value: number;
  unit: 'ms' | 'MiBy' | 'count' | 'ratio';
  tags?: readonly string[];
}

export interface RiskScorePerformanceEvent {
  calculationRunId: string;
  namespace: string;
  entityType?: string;
  stage: string;
  status: 'success' | 'error' | 'aborted' | 'skipped';
  durationMs: number;
  measurements: PerformanceMeasurement[];
}

export const RISK_SCORE_PERFORMANCE_EVENT: EventTypeOpts<RiskScorePerformanceEvent> = {
  eventType: 'risk_score_maintainer_performance',
  schema: {
    calculationRunId: {
      type: 'keyword',
      _meta: { description: 'Calculation ID shared with scoring logs and documents' },
    },
    namespace: { type: 'keyword', _meta: { description: 'Kibana space where scoring ran' } },
    entityType: { type: 'keyword', _meta: { optional: true, description: 'Entity type scored' } },
    stage: { type: 'keyword', _meta: { description: 'Fixed stage name or process window' } },
    status: { type: 'keyword', _meta: { description: 'Stage outcome' } },
    durationMs: { type: 'float', _meta: { description: 'Stage duration in milliseconds' } },
    measurements: {
      type: 'array',
      items: {
        properties: {
          name: { type: 'keyword', _meta: { description: 'Fixed measurement name' } },
          value: { type: 'float', _meta: { description: 'Measured numeric value' } },
          tags: {
            type: 'array',
            items: { type: 'keyword', _meta: { description: 'Timing operation tag' } },
            _meta: { optional: true, description: 'Code-defined timing operation dimensions' },
          },
          unit: {
            type: 'keyword',
            _meta: { description: 'Measurement unit: ms, MiBy, count or ratio' },
          },
        },
      },
      _meta: { description: 'Bounded resource and timing aggregates' },
    },
  },
};
