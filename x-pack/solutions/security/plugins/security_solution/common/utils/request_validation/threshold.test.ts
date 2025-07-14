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

  it('returns error if number of fields exceeds 5', () => {
    const threshold: Threshold = {
      field: ['a', 'b', 'c', 'd', 'e', 'f'],
      value: 1,
    };

    const result = validateThresholdBase({ type: 'threshold', threshold });
    expect(result).toContain('Number of fields must be 5 or less');
  });

  it('returns multiple errors if both cardinality and field count issues exist', () => {
    const threshold: Threshold = {
      field: ['a', 'b', 'c', 'd', 'e', 'a'],
      cardinality: [{ field: 'a', value: 1 }],
      value: 1,
    };

    const result = validateThresholdBase({ type: 'threshold', threshold });
    expect(result).toEqual([
      'Cardinality of a field that is being aggregated on is always 1',
      'Number of fields must be 5 or less',
    ]);
  });

  it('calls extra validation and includes its errors', () => {
    const extraValidationMock = jest.fn().mockReturnValue(['Extra error']);
    const threshold: Threshold = {
      field: ['host.name'],
      value: 1,
    };

    const result = validateThresholdBase({ type: 'threshold', threshold }, extraValidationMock);

    expect(extraValidationMock).toHaveBeenCalledWith(threshold);
    expect(result).toContain('Extra error');
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
