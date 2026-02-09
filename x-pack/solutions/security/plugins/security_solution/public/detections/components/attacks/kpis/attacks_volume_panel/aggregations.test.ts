/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attacksVolumeAggregations } from './aggregations';

describe('attacksVolumeAggregations', () => {
  it('returns the correct aggregation structure with default size', () => {
    const agg = attacksVolumeAggregations();
    expect(agg).toEqual({
      attacks_volume: {
        terms: {
          field: 'kibana.alert.attack_ids',
          size: 10000,
        },
      },
    });
  });

  it('returns the correct aggregation structure with custom size', () => {
    const agg = attacksVolumeAggregations(500);
    expect(agg).toEqual({
      attacks_volume: {
        terms: {
          field: 'kibana.alert.attack_ids',
          size: 500,
        },
      },
    });
  });
});
