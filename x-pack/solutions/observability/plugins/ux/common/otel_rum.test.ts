/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uxSearchIndex } from './otel_rum';

describe('uxSearchIndex', () => {
  it('returns OTel streams when the APM data view title is empty', () => {
    expect(uxSearchIndex()).toBe('traces-*.otel-*,logs-*.otel-*');
    expect(uxSearchIndex('')).toBe('traces-*.otel-*,logs-*.otel-*');
  });

  it('appends OTel streams to an APM-only pattern', () => {
    expect(uxSearchIndex('traces-apm*,apm-*')).toBe(
      'traces-apm*,apm-*,traces-*.otel-*,logs-*.otel-*'
    );
  });

  it('does not duplicate patterns already present', () => {
    expect(uxSearchIndex('traces-apm*,apm-*,traces-*.otel-*,logs-*.otel-*')).toBe(
      'traces-apm*,apm-*,traces-*.otel-*,logs-*.otel-*'
    );
  });
});
