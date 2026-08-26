/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type {
  CustomMetricExpressionParams,
  CustomThresholdExpressionMetric,
} from '../../../../common/custom_threshold_rule/types';
import { EQUATION_REGEX, validateCustomThreshold } from './validation';

const errorReason = 'this should appear as error reason';

jest.mock('@kbn/es-query', () => {
  return {
    buildEsQuery: jest.fn(() => {
      // eslint-disable-next-line no-throw-literal
      throw { shortMessage: errorReason };
    }),
  };
});

describe('Metric Threshold Validation', () => {
  describe('valid equations', () => {
    const validExpression = [
      '(A + B) / 100',
      '(A - B) * 100',
      'A > 1 ? A : B',
      'A <= 1 ? A : B',
      'A && B || C',
    ];
    validExpression.forEach((exp) => {
      it(exp, () => {
        expect(exp.match(EQUATION_REGEX)).toBeFalsy();
      });
    });
  });
  describe('invalid equations', () => {
    const validExpression = ['Math.round(A + B) / 100', '(A^2 - B) * 100'];
    validExpression.forEach((exp) => {
      it(exp, () => {
        expect(exp.match(EQUATION_REGEX)).toBeTruthy();
      });
    });
  });
  it('should throw an error when data view is not provided', () => {
    const res = validateCustomThreshold({
      uiSettings: {} as IUiSettingsClient,
      searchConfiguration: {},
      criteria: {
        metrics: [
          {
            name: 'Test',
            aggType: 'count',
            field: 'system.cpu.cores',
            filter: 'none valid filter',
          },
        ] as unknown as CustomThresholdExpressionMetric[],
      } as unknown as CustomMetricExpressionParams[],
    });
    expect(res.errors.searchConfiguration[0]).toBe('Data view is required.');
  });
  it('should throw an error when filter query is not valid with reason', () => {
    const res = validateCustomThreshold({
      uiSettings: {
        get: jest.fn(),
      } as unknown as IUiSettingsClient,
      searchConfiguration: {
        index: 'test*',
        query: {
          language: `kuery`,
          query: 'test:tet',
        },
      },
      criteria: {
        metrics: [
          {
            name: 'Test',
            aggType: 'count',
            field: 'system.cpu.cores',
            filter: 'none valid filter',
          },
        ] as unknown as CustomThresholdExpressionMetric[],
      } as unknown as CustomMetricExpressionParams[],
    });
    expect(res.errors.filterQuery[0]).toBe(`Filter query is invalid. ${errorReason}`);
  });

  describe('warning threshold', () => {
    const baseCriterion = {
      comparator: COMPARATORS.GREATER_THAN,
      threshold: [10],
      timeSize: 1,
      timeUnit: 'm',
      metrics: [
        {
          name: 'A',
          aggType: 'avg',
          field: 'system.cpu.user.pct',
        },
      ],
    } as unknown as CustomMetricExpressionParams;

    it('requires a warning threshold value once warningThreshold is set but empty', () => {
      const res = validateCustomThreshold({
        uiSettings: {} as IUiSettingsClient,
        searchConfiguration: {},
        criteria: [
          {
            ...baseCriterion,
            warningComparator: COMPARATORS.GREATER_THAN,
            warningThreshold: [] as number[],
          },
        ],
      });
      expect(res.errors['0'].warning.threshold0).toContain('Threshold is required.');
    });

    it('requires warning threshold values to be numbers', () => {
      const res = validateCustomThreshold({
        uiSettings: {} as IUiSettingsClient,
        searchConfiguration: {},
        criteria: [
          {
            ...baseCriterion,
            warningComparator: COMPARATORS.GREATER_THAN,
            warningThreshold: [undefined] as unknown as number[],
          },
        ],
      });
      expect(res.errors['0'].warning.threshold0).toContain(
        'Thresholds must contain a valid number.'
      );
    });

    it('produces no warning errors for a valid warning threshold', () => {
      const res = validateCustomThreshold({
        uiSettings: {} as IUiSettingsClient,
        searchConfiguration: {},
        criteria: [
          {
            ...baseCriterion,
            warningComparator: COMPARATORS.GREATER_THAN,
            warningThreshold: [5],
          },
        ],
      });
      expect(res.errors['0'].warning.threshold0).toHaveLength(0);
      expect(res.errors['0'].warning.threshold1).toHaveLength(0);
    });
  });
});
