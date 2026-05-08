/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAttacksVolumeAggregations } from './aggregations';
import { ATTACK_IDS_FIELD, MAX_ATTACKS_COUNT } from '../common/constants';

describe('getAttacksVolumeAggregations', () => {
  it('returns correct aggregation structure', () => {
    const aggs = getAttacksVolumeAggregations();

    expect(aggs).toEqual({
      attacks: {
        terms: {
          field: ATTACK_IDS_FIELD,
          size: MAX_ATTACKS_COUNT,
        },
      },
    });
  });
});
