/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeState } from '@kbn/es-query';
import type { Condition } from '@kbn/streamlang';
import { buildFeatureDiscoverParams } from './discover_helpers';

const timeState = {
  timeRange: { from: 'now-15m', to: 'now' },
} as TimeState;

const filter: Condition = { field: 'log.level', eq: 'error' };

const source = { view_name: '$.nightshift.sources.default.nginx-errors' };

describe('buildFeatureDiscoverParams', () => {
  it('keeps the time range and filters with the feature condition', () => {
    const params = buildFeatureDiscoverParams(source, filter, timeState);

    expect(params.timeRange).toEqual({ from: 'now-15m', to: 'now' });
    expect(params.interval).toBe('auto');
    expect(params.query.esql).toContain('unmapped_fields');
    expect(params.query.esql).toContain('WHERE');
  });

  it('queries the view of the source', () => {
    const { query } = buildFeatureDiscoverParams(source, filter, timeState);

    expect(query.esql).toContain('FROM $.nightshift.sources.default.nginx-errors');
  });
});
