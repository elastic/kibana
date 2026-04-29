/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { COMPARATORS } from '@kbn/alerting-comparators';
import { createConditionScript } from './create_condition_script';

interface ConditionScriptParams {
  threshold?: number;
  threshold0?: number;
  threshold1?: number;
}

const evaluateConditionScript = (
  source: string,
  params: ConditionScriptParams,
  value: number
): number => {
  switch (source) {
    case 'params.value >= params.threshold0 && params.value <= params.threshold1 ? 1 : 0': {
      if (params.threshold0 == null || params.threshold1 == null) {
        throw new Error('Missing between threshold params');
      }
      return value >= params.threshold0 && value <= params.threshold1 ? 1 : 0;
    }
    case 'params.value >= params.threshold0 && params.value <= params.threshold1 ? 0 : 1': {
      if (params.threshold0 == null || params.threshold1 == null) {
        throw new Error('Missing not-between threshold params');
      }
      return value >= params.threshold0 && value <= params.threshold1 ? 0 : 1;
    }
    default:
      throw new Error(`Unsupported script source: ${source}`);
  }
};

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

  it('should include both boundaries for between inclusive comparator', () => {
    const script = createConditionScript([10, 20], COMPARATORS.BETWEEN_INCLUSIVE, 'cpu');

    expect(evaluateConditionScript(script.source, script.params, 0.1)).toBe(1);
    expect(evaluateConditionScript(script.source, script.params, 0.2)).toBe(1);
    expect(evaluateConditionScript(script.source, script.params, 0.09)).toBe(0);
    expect(evaluateConditionScript(script.source, script.params, 0.21)).toBe(0);
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

  it('should exclude both boundaries for not between inclusive comparator', () => {
    const script = createConditionScript([10, 20], COMPARATORS.NOT_BETWEEN_INCLUSIVE, 'cpu');

    expect(evaluateConditionScript(script.source, script.params, 0.1)).toBe(0);
    expect(evaluateConditionScript(script.source, script.params, 0.2)).toBe(0);
    expect(evaluateConditionScript(script.source, script.params, 0.09)).toBe(1);
    expect(evaluateConditionScript(script.source, script.params, 0.21)).toBe(1);
  });
});
