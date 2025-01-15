/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPARATORS } from '@kbn/alerting-comparators';
import {
  Aggregators,
  CustomMetricExpressionParams,
} from '../../../../../common/custom_threshold_rule/types';

export const criteriaMultipleConditions: CustomMetricExpressionParams[] = [
  {
    metrics: [
      {
        name: 'A',
        aggType: Aggregators.AVERAGE,
        field: 'system.is.a.good.puppy.dog',
      },
      {
        name: 'B',
        aggType: Aggregators.AVERAGE,
        field: 'system.is.a.bad.kitty',
      },
    ],
    timeUnit: 'm',
    timeSize: 1,
    threshold: [1],
    comparator: COMPARATORS.GREATER_THAN,
  },
  {
    metrics: [
      {
        name: 'A',
        aggType: Aggregators.AVERAGE,
        field: 'system.is.a.good.puppy.dog',
      },
      {
        name: 'B',
        aggType: Aggregators.AVERAGE,
        field: 'system.is.a.bad.kitty',
      },
    ],
    timeUnit: 'm',
    timeSize: 1,
    threshold: [4],
    comparator: COMPARATORS.GREATER_THAN,
  },
];

export const criteriaMultipleConditionsWithIsBetween: CustomMetricExpressionParams[] = [
  {
    metrics: [
      {
        name: 'A',
        aggType: Aggregators.AVERAGE,
        field: 'system.is.a.good.puppy.dog',
      },
      {
        name: 'B',
        aggType: Aggregators.AVERAGE,
        field: 'system.is.a.bad.kitty',
      },
    ],
    timeUnit: 'm',
    timeSize: 1,
    threshold: [1, 2],
    comparator: COMPARATORS.BETWEEN,
  },
  {
    metrics: [
      {
        name: 'A',
        aggType: Aggregators.AVERAGE,
        field: 'system.is.a.good.puppy.dog',
      },
      {
        name: 'B',
        aggType: Aggregators.AVERAGE,
        field: 'system.is.a.bad.kitty',
      },
    ],
    timeUnit: 'm',
    timeSize: 1,
    threshold: [4],
    comparator: COMPARATORS.GREATER_THAN,
  },
];
