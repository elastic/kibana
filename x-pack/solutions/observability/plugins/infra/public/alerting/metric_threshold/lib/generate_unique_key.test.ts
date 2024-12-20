/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { COMPARATORS } from '@kbn/alerting-comparators';
import { Aggregators } from '../../../../common/alerting/metrics';
import { MetricExpression } from '../types';
import { generateUniqueKey } from './generate_unique_key';

describe('generateUniqueKey', () => {
  const mockedCriteria: Array<[MetricExpression, string]> = [
    [
      {
        aggType: Aggregators.COUNT,
        comparator: COMPARATORS.LESS_THAN,
        threshold: [2000, 5000],
        timeSize: 15,
        timeUnit: 'm',
      },
      'count<2000,5000',
    ],
    [
      {
        aggType: Aggregators.CUSTOM,
        comparator: COMPARATORS.GREATER_THAN_OR_EQUALS,
        threshold: [30],
        timeSize: 15,
        timeUnit: 'm',
      },
      'custom>=30',
    ],
    [
      {
        aggType: Aggregators.AVERAGE,
        comparator: COMPARATORS.LESS_THAN_OR_EQUALS,
        threshold: [500],
        timeSize: 15,
        timeUnit: 'm',
        metric: 'metric',
      },
      'avg(metric)<=500',
    ],
  ];
  it.each(mockedCriteria)('unique key of %p is %s', (input, output) => {
    const uniqueKey = generateUniqueKey(input);

    expect(uniqueKey).toBe(output);
  });
});
