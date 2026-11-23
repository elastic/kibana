/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type {
  CustomMetricExpressionParams,
  CustomThresholdExpressionMetric,
} from '../../../../common/custom_threshold_rule/types';
import { Aggregators } from '../../../../common/custom_threshold_rule/types';
import { EQUATION_REGEX, validateCustomThreshold } from './validation';

const errorReason = 'this should appear as error reason';

jest.mock('@kbn/es-query', () => {
  return {
    // Resolved on call, not while the mock is created: requiring the real module here runs in the
    // middle of a circular import chain and gets a partially loaded module.
    fromKueryExpression: (query: string) =>
      jest.requireActual('@kbn/es-query').fromKueryExpression(query),
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

  describe('metric KQL filter', () => {
    const validate = (metric: Partial<CustomThresholdExpressionMetric>) =>
      validateCustomThreshold({
        uiSettings: { get: jest.fn() } as unknown as IUiSettingsClient,
        searchConfiguration: { index: 'test*' },
        criteria: [
          { metrics: [{ name: 'A', ...metric }] },
        ] as unknown as CustomMetricExpressionParams[],
      }).errors[0].metrics.A;

    it.each(Object.values(Aggregators))(
      'reports a syntax error for an invalid filter on %s',
      (aggType) => {
        expect(validate({ aggType, field: 'metric', filter: 'status: (' }).filter).toEqual(
          expect.any(String)
        );
      }
    );

    it.each([Aggregators.COUNT, Aggregators.AVERAGE, Aggregators.RATE, Aggregators.LAST_VALUE])(
      'does not report an error for a valid filter on %s',
      (aggType) => {
        expect(validate({ aggType, field: 'metric', filter: 'status: 500' })).toBeUndefined();
      }
    );
  });
});
