/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { ATTACK_IDS_FIELD, MAX_ATTACKS_COUNT } from '../common/constants';
import { dsl } from '../../utils/dsl';

export const getAttacksListAggregations = (
  pageIndex: number,
  pageSize: number
): Record<string, estypes.AggregationsAggregationContainer> => ({
  attacks: {
    terms: {
      field: ATTACK_IDS_FIELD,
      size: MAX_ATTACKS_COUNT,
    },
    aggs: {
      pagination: {
        bucket_sort: {
          sort: [{ 'attackRelatedAlerts>_count': { order: 'desc' } }],
          from: pageIndex * pageSize,
          size: pageSize,
        },
      },
      attackRelatedAlerts: { filter: dsl.isNotAttack() },
    },
  },
  total_attacks: {
    cardinality: {
      field: ATTACK_IDS_FIELD,
    },
  },
});
