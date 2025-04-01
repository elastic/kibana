/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { fetcher } from './fetcher';
import type { Usage } from './type';

export function registerUsageCollector(usageCollection?: UsageCollectionSetup): void {
  if (!usageCollection) {
    return;
  }

  const usageCollector = usageCollection.makeUsageCollector<Usage>({
    type: 'investigation',
    schema: {
      investigation: {
        total: {
          type: 'long',
          _meta: {
            description: 'The total number of investigations in the cluster',
          },
        },
        by_status: {
          triage: {
            type: 'long',
            _meta: {
              description: 'The number of investigations in triage status in the cluster',
            },
          },
          active: {
            type: 'long',
            _meta: { description: 'The number of investigations in active status in the cluster' },
          },
          mitigated: {
            type: 'long',
            _meta: {
              description: 'The number of investigations in mitigated status in the cluster',
            },
          },
          resolved: {
            type: 'long',
            _meta: {
              description: 'The number of investigations in resolved status in the cluster',
            },
          },
          cancelled: {
            type: 'long',
            _meta: {
              description: 'The number of investigations in cancelled status in the cluster',
            },
          },
        },
        by_origin: {
          alert: {
            type: 'long',
            _meta: {
              description: 'The number of investigations created from alerts in the cluster',
            },
          },
          blank: {
            type: 'long',
            _meta: {
              description: 'The number of investigations created from scratch in the cluster',
            },
          },
        },
        items: {
          avg: {
            type: 'long',
            _meta: {
              description: 'The average number of items across all investigations in the cluster',
            },
          },
          p90: {
            type: 'long',
            _meta: {
              description:
                'The 90th percentile of the number of items across all investigations in the cluster',
            },
          },
          p95: {
            type: 'long',
            _meta: {
              description:
                'The 95th percentile of the number of items across all investigations in the cluster',
            },
          },
          max: {
            type: 'long',
            _meta: {
              description: 'The maximum number of items across all investigations in the cluster',
            },
          },
          min: {
            type: 'long',
            _meta: {
              description: 'The minimum number of items across all investigations in the cluster',
            },
          },
        },
        notes: {
          avg: {
            type: 'long',
            _meta: {
              description: 'The average number of notes across all investigations in the cluster',
            },
          },
          p90: {
            type: 'long',
            _meta: {
              description:
                'The 90th percentile of the number of notes across all investigations in the cluster',
            },
          },
          p95: {
            type: 'long',
            _meta: {
              description:
                'The 95th percentile of the number of notes across all investigations in the cluster',
            },
          },
          max: {
            type: 'long',
            _meta: {
              description: 'The maximum number of notes across all investigations in the cluster',
            },
          },
          min: {
            type: 'long',
            _meta: {
              description: 'The minimum number of notes across all investigations in the cluster',
            },
          },
        },
      },
    },
    isReady: () => true,
    fetch: fetcher,
  });

  // register usage collector
  usageCollection.registerCollector(usageCollector);
}
