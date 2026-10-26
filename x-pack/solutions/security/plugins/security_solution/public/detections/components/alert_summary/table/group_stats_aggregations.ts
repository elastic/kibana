/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NamedAggregation } from '@kbn/grouping';
import { RELATED_INTEGRATION } from '../../../constants';
import { DEFAULT_GROUP_STATS_AGGREGATION } from '../../alerts_table/alerts_grouping';
import {
  RULE_COUNT_AGGREGATION,
  SEVERITY_SUB_AGGREGATION,
} from '../../alerts_table/grouping_settings';

const RELATED_INTEGRATION_SUB_AGGREGATION = {
  relatedIntegrationSubAggregation: {
    terms: {
      field: RELATED_INTEGRATION,
    },
  },
};

/**
 * Returns aggregations to be used to calculate the statistics to be used in the`extraAction` property of the EuiAccordion component.
 * It handles custom renders for the following fields:
 * - relatedIntegration (a runTime field we're creating and using in the adhoc dataView)
 * - kibana.alert.severity
 * - kibana.alert.rule.name
 * And returns a default set of aggregation for all the other fields.
 *
 * These go hand in hand with groupingOptions and groupPanelRenderers.
 */
export const groupStatsAggregations = (field: string): NamedAggregation[] => {
  const aggMetrics: NamedAggregation[] = DEFAULT_GROUP_STATS_AGGREGATION('');

  switch (field) {
    case RELATED_INTEGRATION:
      aggMetrics.push(SEVERITY_SUB_AGGREGATION, RULE_COUNT_AGGREGATION);
      break;
    case 'kibana.alert.severity':
      aggMetrics.push(RELATED_INTEGRATION_SUB_AGGREGATION, RULE_COUNT_AGGREGATION);
      break;
    case 'kibana.alert.rule.name':
      aggMetrics.push(RELATED_INTEGRATION_SUB_AGGREGATION, SEVERITY_SUB_AGGREGATION);
      break;
    default:
      aggMetrics.push(
        RELATED_INTEGRATION_SUB_AGGREGATION,
        SEVERITY_SUB_AGGREGATION,
        RULE_COUNT_AGGREGATION
      );
  }
  return aggMetrics;
};
