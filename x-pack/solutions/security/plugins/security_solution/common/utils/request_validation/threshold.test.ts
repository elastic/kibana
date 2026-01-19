/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateThresholdBase } from './threshold';
import type { Threshold } from '../../api/detection_engine';

describe('validateThresholdBase', () => {
  it('returns no errors for non-threshold rule type', () => {
    const result = validateThresholdBase({ type: 'query' });
    expect(result).toEqual([]);
  });

  it('returns error if type is threshold and threshold is missing', () => {
    const result = validateThresholdBase({ type: 'threshold' });
    expect(result).toEqual(['when "type" is "threshold", "threshold" is required']);
  });

  it('returns error if cardinality field matches one of the aggregated fields', () => {
    const threshold: Threshold = {
      field: ['user.name'],
      cardinality: [{ field: 'user.name', value: 1 }],
      value: 1,
    };

    const result = validateThresholdBase({ type: 'threshold', threshold });
    expect(result).toContain('Cardinality of a field that is being aggregated on is always 1');
  });

  it('returns no errors for valid threshold', () => {
    const threshold: Threshold = {
      field: ['host.name'],
      cardinality: [{ field: 'user.id', value: 1 }],
      value: 1,
    };

    const result = validateThresholdBase({ type: 'threshold', threshold });
    expect(result).toEqual([]);
  });
});
