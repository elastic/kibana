/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uxSearchIndex } from './otel_rum';

describe('uxSearchIndex', () => {
  it('returns only OTel RUM streams', () => {
    expect(uxSearchIndex()).toBe('traces-*.otel-*,logs-*.otel-*');
    expect(uxSearchIndex('')).toBe('traces-*.otel-*,logs-*.otel-*');
  });

  it('ignores the APM data view (classic apm / metrics / logs-apm)', () => {
    expect(
      uxSearchIndex(
        'apm-*,logs-*.otel-*,logs-apm*,metrics-*.otel-*,metrics-apm*,traces-*.otel-*,traces-apm*'
      )
    ).toBe('traces-*.otel-*,logs-*.otel-*');
  });
});
