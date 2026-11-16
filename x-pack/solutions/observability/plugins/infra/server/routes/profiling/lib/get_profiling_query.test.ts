/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery } from '@kbn/observability-plugin/server';
import { getProfilingQuery } from './get_profiling_query';

describe('getProfilingQuery', () => {
  it('filters the profiling events by the kuery and the time range in seconds', () => {
    expect(
      getProfilingQuery({ kuery: 'host.name : "host-1"', from: 1000000, to: 1900000 })
    ).toEqual({
      bool: {
        filter: [
          ...kqlQuery('host.name : "host-1"'),
          { range: { '@timestamp': { gte: '1000', lt: '1900', format: 'epoch_second' } } },
        ],
      },
    });
  });
});
