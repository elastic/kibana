/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { StoredSLOSettings } from '../domain/models';

export function excludeStaleSummaryFilter(
  settings: StoredSLOSettings,
  kqlFilter: string,
  hideStale?: boolean
): estypes.QueryDslQueryContainer[] {
  if (kqlFilter.includes('summaryUpdatedAt') || !settings.staleThresholdInHours || !hideStale) {
    return [];
  }
  return [
    {
      bool: {
        should: [
          { term: { isTempDoc: true } },
          {
            range: {
              summaryUpdatedAt: {
                gte: `now-${settings.staleThresholdInHours}h`,
              },
            },
          },
        ],
      },
    },
  ];
}
