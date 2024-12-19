/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SpaceHealthState } from '../../../../../../../../common/api/detection_engine/rule_monitoring';
import { getRuleStatsAggregation, normalizeRuleStatsAggregation } from './rule_stats';

export const getSpaceHealthAggregation = (): Record<
  string,
  estypes.AggregationsAggregationContainer
> => {
  return getRuleStatsAggregation();
};

export const normalizeSpaceHealthAggregationResult = (
  aggregations: Record<string, unknown>
): SpaceHealthState => {
  return normalizeRuleStatsAggregation(aggregations);
};
