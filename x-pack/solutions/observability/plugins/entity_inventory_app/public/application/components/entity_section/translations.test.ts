/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEntityCountValue,
  getListWarningsTitle,
  getUnsupportedMetricText,
  SOURCE_ERRORS_TITLE,
  UNSUPPORTED_METRICS_TITLE,
  LIST_WARNINGS_TITLE,
} from './translations';

describe('getEntityCountValue', () => {
  it('formats the count of a full list with thousands separators', () => {
    expect(getEntityCountValue({ count: 1234, truncated: false })).toBe('1,234');
  });

  it('formats the count of a truncated list with thousands separators and a plus', () => {
    expect(getEntityCountValue({ count: 9999, truncated: true })).toBe('9,999+');
  });
});

describe('list warning copy', () => {
  it('names the metric, aggregation and engine for an unsupported metric', () => {
    expect(
      getUnsupportedMetricText({
        indexPattern: 'metrics-kubernetes.state_container-*',
        engine: 'FROM',
        column: 'k8s.container.restarts',
        field: 'kubernetes.container.status.restarts',
        agg: 'sum_rate',
      })
    ).toBe(
      'k8s.container.restarts (sum_rate) omitted under FROM on metrics-kubernetes.state_container-*'
    );
  });

  it('picks the tip title from which warnings are present', () => {
    expect(getListWarningsTitle({ hasErrors: true, hasUnsupportedMetrics: false })).toBe(
      SOURCE_ERRORS_TITLE
    );
    expect(getListWarningsTitle({ hasErrors: false, hasUnsupportedMetrics: true })).toBe(
      UNSUPPORTED_METRICS_TITLE
    );
    expect(getListWarningsTitle({ hasErrors: true, hasUnsupportedMetrics: true })).toBe(
      LIST_WARNINGS_TITLE
    );
  });
});
