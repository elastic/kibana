/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAttacksListAggregations } from './aggregations';
import { ATTACK_IDS_FIELD, MAX_ATTACKS_COUNT } from '../common/constants';
import { dsl } from '../../utils/dsl';

describe('getAttacksListAggregations', () => {
  it('returns correct aggregation structure', () => {
    const pageIndex = 1;
    const pageSize = 10;
    const aggs = getAttacksListAggregations(pageIndex, pageSize);

    expect(aggs).toEqual({
      attacks: {
        terms: {
          field: ATTACK_IDS_FIELD,
          size: MAX_ATTACKS_COUNT,
        },
        aggs: {
          pagination: {
            bucket_sort: {
              from: 10,
              size: 10,
              sort: [
                {
                  'attackRelatedAlerts>_count': {
                    order: 'desc',
                  },
                },
              ],
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
  });
});
