/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { SLOSettings } from '../../domain/models';

interface Props {
  settings: SLOSettings;
  kqlFilter?: string;
  forceExclude?: boolean;
}

export function excludeStaleSummaryFilter({
  settings,
  kqlFilter,
  forceExclude = false,
}: Props): estypes.QueryDslQueryContainer[] {
  if (!forceExclude || kqlFilter?.includes('summaryUpdatedAt')) {
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
