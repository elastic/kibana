/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLastValueAggBucket } from './create_last_value_aggregation';

describe('createLastValueAggBucket', () => {
  it('only requires the field to exist when there is no metric filter', () => {
    const aggs = createLastValueAggBucket('aggregatedValue_A', '@timestamp', 'metric');

    expect(aggs._aggregatedValue_A.filter).toEqual({
      bool: { must: [{ exists: { field: 'metric' } }] },
    });
  });

  it('combines the metric filter with the exists check', () => {
    const filterQuery = { term: { status: '500' } };
    const aggs = createLastValueAggBucket('aggregatedValue_A', '@timestamp', 'metric', filterQuery);

    expect(aggs._aggregatedValue_A.filter).toEqual({
      bool: { must: [{ exists: { field: 'metric' } }, filterQuery] },
    });
    expect(aggs._aggregatedValue_A.aggs).toEqual({
      last_value: {
        top_metrics: { metrics: { field: 'metric' }, sort: { '@timestamp': 'desc' } },
      },
    });
  });
});
