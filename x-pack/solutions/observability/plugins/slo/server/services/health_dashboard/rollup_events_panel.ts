/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import { createESQLPanel } from './create_esql_panel';

/**
 * Generates an ESQL query for rollup transform monitoring
 * Shows good vs bad events written by the rollup transform over time
 */
function generateTransformHealthQuery(sloId: string): string {
  return `FROM .slo-observability.sli-v3*
| WHERE slo.id == "${sloId}"
| STATS 
    good_events = SUM(slo.numerator),
    total_events = SUM(slo.denominator)
  BY time_bucket = BUCKET(@timestamp, 1 minute)
| EVAL bad_events = total_events - good_events
| EVAL time_bucket = TO_DATETIME(time_bucket)
| SORT time_bucket DESC
| LIMIT 100`;
}

/**
 * Generates a Lens panel for monitoring rollup transform output
 * Shows good vs bad events written by the rollup transform per minute
 */
export function generateTransformHealthPanel(sloId: string): DashboardPanel {
  return createESQLPanel({
    esqlQuery: generateTransformHealthQuery(sloId),
    title: 'Good vs Bad Events (Rollup Transform Output)',
    description: 'Good and bad events from the rollup transform output',
    indexPattern: '.slo-observability.sli-v3*',
    gridPosition: { x: 0, y: 12, w: 24, h: 12 },
    visualizationType: 'lnsXY',
    columns: [
      {
        columnId: 'time_bucket',
        fieldName: 'time_bucket',
        meta: {
          type: 'date',
          esType: 'date',
        },
      },
      {
        columnId: 'good_events',
        fieldName: 'good_events',
        meta: {
          type: 'number',
          esType: 'long',
        },
        inMetricDimension: true,
      },
      {
        columnId: 'bad_events',
        fieldName: 'bad_events',
        meta: {
          type: 'number',
          esType: 'long',
        },
        inMetricDimension: true,
      },
    ],
    visualizationConfig: {
      xAccessor: 'time_bucket',
      accessors: ['good_events', 'bad_events'],
      seriesType: 'bar_stacked',
    },
  });
}
