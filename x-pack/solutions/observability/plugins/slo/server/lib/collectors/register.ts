/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { fetcher } from './fetcher';
import type { GetCompositeSoClient } from './fetcher';
import type { Usage } from './type';

export function registerSloUsageCollector(
  usageCollection: UsageCollectionSetup | undefined,
  logger: Logger,
  getCompositeSoClient: GetCompositeSoClient
): void {
  if (!usageCollection) {
    return;
  }

  const sloUsageCollector = usageCollection.makeUsageCollector<Usage>({
    type: 'slo',
    schema: {
      slo: {
        total: {
          type: 'long',
          _meta: {
            description: 'The total number of SLOs in the cluster',
          },
        },
        definitions: {
          total: {
            type: 'long',
            _meta: {
              description: 'The total number of SLO definitions in the cluster',
            },
          },
          total_with_ccs: {
            type: 'long',
            _meta: {
              description: 'The total number of SLO definitions using CCS in the cluster',
            },
          },
          total_with_groups: {
            type: 'long',
            _meta: {
              description: 'The total number of SLO definitions using groups in the cluster',
            },
          },
        },
        instances: {
          total: {
            type: 'long',
            _meta: {
              description: 'The total number of SLO instances in the cluster',
            },
          },
        },
        by_status: {
          enabled: {
            type: 'long',
            _meta: {
              description: 'The number of enabled SLOs in the cluster',
            },
          },
          disabled: {
            type: 'long',
            _meta: {
              description: 'The number of disabled SLOs in the cluster',
            },
          },
        },
        by_sli_type: {
          DYNAMIC_KEY: {
            type: 'long',
            _meta: {
              description: 'The number of SLOs by sli type in the cluster',
            },
          },
        },
        by_rolling_duration: {
          DYNAMIC_KEY: {
            type: 'long',
            _meta: {
              description: 'The number of SLOs by rolling duration in the cluster',
            },
          },
        },
        by_calendar_aligned_duration: {
          DYNAMIC_KEY: {
            type: 'long',
            _meta: {
              description: 'The number of SLOs by calendar aligned duration in the cluster',
            },
          },
        },
        by_budgeting_method: {
          occurrences: {
            type: 'long',
            _meta: {
              description: 'The number of SLOs by timeslices budgeting method in the cluster',
            },
          },
          timeslices: {
            type: 'long',
            _meta: {
              description: 'The number of SLOs by occurrences budgeting method in the cluster',
            },
          },
        },
      },
      composite: {
        definitions: {
          total: {
            type: 'long',
            _meta: {
              description: 'The total number of composite SLO definitions in the cluster',
            },
          },
        },
        by_status: {
          enabled: {
            type: 'long',
            _meta: {
              description: 'The number of enabled composite SLOs in the cluster',
            },
          },
          disabled: {
            type: 'long',
            _meta: {
              description: 'The number of disabled composite SLOs in the cluster',
            },
          },
        },
        by_budgeting_method: {
          occurrences: {
            type: 'long',
            _meta: {
              description:
                'The number of composite SLOs using the occurrences budgeting method in the cluster',
            },
          },
        },
        by_composite_method: {
          weightedAverage: {
            type: 'long',
            _meta: {
              description:
                'The number of composite SLOs using the weighted average composite method in the cluster',
            },
          },
        },
        members: {
          min: {
            type: 'long',
            _meta: {
              description: 'The minimum number of members in a composite SLO in the cluster',
            },
          },
          avg: {
            type: 'float',
            _meta: {
              description: 'The average number of members per composite SLO in the cluster',
            },
          },
          max: {
            type: 'long',
            _meta: {
              description: 'The maximum number of members in a composite SLO in the cluster',
            },
          },
          at_max_count: {
            type: 'long',
            _meta: {
              description:
                'The number of composite SLOs in the cluster that have reached the maximum number of members',
            },
          },
        },
      },
    },
    isReady: () => true,
    fetch: (context) => fetcher(context, logger, getCompositeSoClient),
  });

  // register usage collector
  usageCollection.registerCollector(sloUsageCollector);
}
