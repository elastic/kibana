/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import { createESQLPanel } from './create_esql_panel';

/**
 * Generates an ESQL query for summary transform monitoring
 * Shows how many seconds ago the summary was last updated
 */
function generateSummaryUpdateQuery(sloId: string): string {
  return `FROM .slo-observability.summary-v3*
  | WHERE slo.id == "${sloId}" AND isTempDoc == false
  | STATS last_summary_update = MAX(summaryUpdatedAt)
  | EVAL seconds_ago = TO_INTEGER(DATE_DIFF("second", TO_DATETIME(last_summary_update), NOW()))
  | KEEP seconds_ago`;
}

/**
 * Generates a Lens panel showing how many seconds ago the summary was updated
 */
export function generateSummaryUpdatePanel(sloId: string): DashboardPanel {
  const indexPattern = '.slo-observability.summary-v3*';

  return createESQLPanel({
    esqlQuery: generateSummaryUpdateQuery(sloId),
    title: 'Last Summary Update (seconds ago)',
    description: 'Seconds ago the summary transform last updated',
    indexPattern,
    gridPosition: { x: 0, y: 24, w: 12, h: 10 },
    visualizationType: 'lnsMetric',
    columns: [
      {
        columnId: 'seconds_ago',
        fieldName: 'seconds_ago',
        label: 'seconds_ago',
        customLabel: false,
        meta: {
          type: 'number',
          esType: 'integer',
          sourceParams: {
            indexPattern,
            sourceField: 'seconds_ago',
          },
          params: {
            id: 'number',
          },
        },
        inMetricDimension: true,
      },
    ],
    visualizationConfig: {
      metricAccessor: 'seconds_ago',
    },
    includeTimeFieldInLayer: false,
  });
}
