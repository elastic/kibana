/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { getIndicatorQueryParams } from './get_indicator_query_params';

const transformSourceExclusion = { term: { 'labels.is_ioc_transform_source': 'true' } };

describe('getIndicatorQueryParams()', () => {
  const timeRange = { from: '2022-06-01T00:00:00.000Z', to: '2022-06-30T00:00:00.000Z' };

  it('excludes raw indicator copies stored by integration transforms', () => {
    const { query } = getIndicatorQueryParams({
      filters: [],
      filterQuery: { language: 'kuery', query: '' },
      timeRange,
    });

    expect(query.bool.must_not).toEqual([transformSourceExclusion]);
  });

  it('does not require the transform label, so unlabeled indicators still match', () => {
    const { query } = getIndicatorQueryParams({
      filters: [],
      filterQuery: { language: 'kuery', query: '' },
      timeRange,
    });

    expect(JSON.stringify([query.bool.must, query.bool.filter, query.bool.should])).not.toContain(
      'labels.is_ioc_transform_source'
    );
  });

  it('keeps user filters and the time range alongside the exclusion', () => {
    const userFilter: Filter = {
      meta: { negate: true },
      query: { match_phrase: { 'threat.indicator.type': 'file' } },
    };

    const { query } = getIndicatorQueryParams({
      filters: [userFilter],
      filterQuery: { language: 'kuery', query: '' },
      timeRange,
    });

    expect(query.bool.must_not).toEqual([
      { match_phrase: { 'threat.indicator.type': 'file' } },
      transformSourceExclusion,
    ]);
    expect(query.bool.filter).toEqual(
      expect.arrayContaining([
        { range: { '@timestamp': { gte: timeRange.from, lte: timeRange.to } } },
      ])
    );
  });
});
