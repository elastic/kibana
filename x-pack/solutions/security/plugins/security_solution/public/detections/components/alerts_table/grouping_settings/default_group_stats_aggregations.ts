/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NamedAggregation } from '@kbn/grouping';
import { DEFAULT_GROUP_STATS_AGGREGATION } from '../alerts_grouping';

export const SEVERITY_SUB_AGGREGATION = {
  severitiesSubAggregation: {
    terms: {
      field: 'kibana.alert.severity',
    },
  },
};
export const USER_COUNT_AGGREGATION = {
  usersCountAggregation: {
    cardinality: {
      field: 'user.name',
    },
  },
};
export const HOST_COUNT_AGGREGATION = {
  hostsCountAggregation: {
    cardinality: {
      field: 'host.name',
    },
  },
};
export const RULE_COUNT_AGGREGATION = {
  rulesCountAggregation: {
    cardinality: {
      field: 'kibana.alert.rule.rule_id',
    },
  },
};

/**
 * Returns aggregations to be used to calculate the statistics to be used in the `extraAction` property of the EUiAccordion component.
 * It handles custom renders for the following fields:
 * - kibana.alert.rule.name
 * - host.name
 * - user.name
 * - source.ip
 * And returns a default set of aggregation for all the other fields.
 *
 * This go hand in hand with defaultGroupingOptions, defaultGroupTitleRenderers and defaultGroupStatsRenderer.
 */
export const defaultGroupStatsAggregations = (field: string): NamedAggregation[] => {
  const aggMetrics: NamedAggregation[] = DEFAULT_GROUP_STATS_AGGREGATION('');

  switch (field) {
    case 'kibana.alert.rule.name':
      aggMetrics.push(
        {
          description: {
            terms: {
              field: 'kibana.alert.rule.description',
              size: 1,
            },
          },
        },
        SEVERITY_SUB_AGGREGATION,
        USER_COUNT_AGGREGATION,
        HOST_COUNT_AGGREGATION,
        {
          ruleTags: {
            terms: {
              field: 'kibana.alert.rule.tags',
            },
          },
        }
      );
      break;
    case 'host.name':
      aggMetrics.push(RULE_COUNT_AGGREGATION, SEVERITY_SUB_AGGREGATION, USER_COUNT_AGGREGATION);
      break;
    case 'user.name':
      aggMetrics.push(RULE_COUNT_AGGREGATION, SEVERITY_SUB_AGGREGATION, HOST_COUNT_AGGREGATION);
      break;
    case 'source.ip':
      aggMetrics.push(RULE_COUNT_AGGREGATION, SEVERITY_SUB_AGGREGATION, HOST_COUNT_AGGREGATION);
      break;
    default:
      aggMetrics.push(RULE_COUNT_AGGREGATION);
  }
  return aggMetrics;
};
