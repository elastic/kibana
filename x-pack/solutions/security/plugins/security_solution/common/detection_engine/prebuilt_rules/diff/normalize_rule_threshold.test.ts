/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeRuleThreshold } from './normalize_rule_threshold';

describe('normalizeRuleThreshold', () => {
  it('returns threshold without cardinality field when array is empty', () => {
    const normalizedField = normalizeRuleThreshold({
      value: 30,
      field: ['field'],
      cardinality: [],
    });

    expect(normalizedField).toEqual({ value: 30, field: ['field'] });
  });

  it('returns cardinality field when it is populated', () => {
    const normalizedField = normalizeRuleThreshold({
      value: 30,
      field: ['field'],
      cardinality: [{ value: 20, field: 'field-cardinality' }],
    });

    expect(normalizedField).toEqual({
      value: 30,
      field: ['field'],
      cardinality: [{ value: 20, field: 'field-cardinality' }],
    });
  });
});
