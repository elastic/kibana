/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchUnifiedAlertsResponse } from '../../../../../common/api/detection_engine/unified_alerts';

export const getSearchUnifiedAlertsResponseMock = (
  overrides?: Partial<SearchUnifiedAlertsResponse>
): SearchUnifiedAlertsResponse => ({
  took: 5,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 2,
      relation: 'eq' as const,
    },
    max_score: 1.0,
    hits: [
      {
        _index: '.alerts-security.alerts-default',
        _id: 'alert-1',
        _score: 1.0,
        _source: {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          'kibana.alert.rule.name': 'Test Rule 1',
          'kibana.alert.severity': 'high',
        },
      },
      {
        _index: '.alerts-security.alerts-default',
        _id: 'alert-2',
        _score: 1.0,
        _source: {
          '@timestamp': '2024-01-01T01:00:00.000Z',
          'kibana.alert.rule.name': 'Test Rule 2',
          'kibana.alert.severity': 'medium',
        },
      },
    ],
  },
  ...overrides,
});
