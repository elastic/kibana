/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { useGetUrlParams } from '../../../hooks';
import { buildErrorFilterParams } from './use_error_filter_params';

describe('buildErrorFilterParams', () => {
  it('serializes schedules for the error APIs', () => {
    const params = buildErrorFilterParams({
      dateRangeStart: 'now-24h',
      dateRangeEnd: 'now',
      schedules: ['3', '10'],
    } as ReturnType<typeof useGetUrlParams>);

    expect(params.schedules).toBe(JSON.stringify(['3', '10']));
  });
});
