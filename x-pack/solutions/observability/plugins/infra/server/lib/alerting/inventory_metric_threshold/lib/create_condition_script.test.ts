/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { COMPARATORS } from '@kbn/alerting-comparators';
import { createConditionScript } from './create_condition_script';

describe('createConditionScript', () => {
  it('should convert tx threshold from bits to byte', () => {
    expect(createConditionScript([8], COMPARATORS.GREATER_THAN_OR_EQUALS, 'tx')).toEqual({
      params: {
        threshold: 1,
      },
      source: 'params.value >= params.threshold ? 1 : 0',
    });
  });

  it('should create between inclusive condition script', () => {
    expect(createConditionScript([10, 20], COMPARATORS.BETWEEN_INCLUSIVE, 'cpu')).toEqual({
      params: {
        threshold0: 0.1,
        threshold1: 0.2,
      },
      source: 'params.value >= params.threshold0 && params.value <= params.threshold1 ? 1 : 0',
    });
  });

  it('should create not between inclusive condition script', () => {
    expect(createConditionScript([10, 20], COMPARATORS.NOT_BETWEEN_INCLUSIVE, 'cpu')).toEqual({
      params: {
        threshold0: 0.1,
        threshold1: 0.2,
      },
      source: 'params.value >= params.threshold0 && params.value <= params.threshold1 ? 0 : 1',
    });
  });
});
