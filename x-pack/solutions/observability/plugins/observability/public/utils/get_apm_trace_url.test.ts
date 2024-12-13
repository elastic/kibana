/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApmTraceUrl } from './get_apm_trace_url';

describe('getApmTraceUrl', () => {
  it('returns a trace url', () => {
    expect(getApmTraceUrl({ traceId: 'foo', rangeFrom: '123', rangeTo: '456' })).toEqual(
      '/link-to/trace/foo?rangeFrom=123&rangeTo=456'
    );
  });
});
