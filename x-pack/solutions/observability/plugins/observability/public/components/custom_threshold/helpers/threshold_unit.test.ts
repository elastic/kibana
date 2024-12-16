/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Aggregators,
  CustomThresholdExpressionMetric,
} from '../../../../common/custom_threshold_rule/types';
import { convertToApiThreshold } from './threshold_unit';

describe('convertToApiThreshold', () => {
  test('previous: nonPercent, next: percent -> threshold / 100', () => {
    const previous: CustomThresholdExpressionMetric[] = [
      {
        name: 'A',
        aggType: Aggregators.COUNT,
      },
    ];
    const next: CustomThresholdExpressionMetric[] = [
      {
        name: 'A',
        field: 'system.cpu.system.pct',
        aggType: Aggregators.AVERAGE,
      },
    ];
    const threshold: number[] = [100];
    const expectedThreshold: number[] = [1];

    expect(convertToApiThreshold(previous, next, threshold)).toEqual(expectedThreshold);
  });

  test('previous: percent, next: nonPercent -> threshold * 100', () => {
    const previous: CustomThresholdExpressionMetric[] = [
      {
        name: 'A',
        field: 'system.cpu.system.pct',
        aggType: Aggregators.AVERAGE,
      },
    ];
    const next: CustomThresholdExpressionMetric[] = [
      {
        name: 'A',
        aggType: Aggregators.COUNT,
      },
    ];
    const threshold: number[] = [1];
    const expectedThreshold: number[] = [100];

    expect(convertToApiThreshold(previous, next, threshold)).toEqual(expectedThreshold);
  });

  test('previous: percent, next: percent -> no threshold change', () => {
    const previous: CustomThresholdExpressionMetric[] = [
      {
        name: 'A',
        field: 'system.cpu.system.pct',
        aggType: Aggregators.AVERAGE,
      },
    ];
    const next: CustomThresholdExpressionMetric[] = [
      {
        name: 'A',
        field: 'system.cpu.total.norm.pct',
        aggType: Aggregators.AVERAGE,
      },
    ];
    const threshold: number[] = [1];

    expect(convertToApiThreshold(previous, next, threshold)).toEqual(threshold);
  });

  test('previous: nonPercent, next: nonPercent -> no threshold change', () => {
    const previous: CustomThresholdExpressionMetric[] = [
      {
        name: 'A',
        field: 'host.disk.read.bytes',
        aggType: Aggregators.AVERAGE,
      },
    ];
    const next: CustomThresholdExpressionMetric[] = [
      {
        name: 'A',
        aggType: Aggregators.COUNT,
      },
    ];
    const threshold: number[] = [100];

    expect(convertToApiThreshold(previous, next, threshold)).toEqual(threshold);
  });

  test('multiple metrics (previous: one percent, next: one percent) -> no threshold change', () => {
    const previous: CustomThresholdExpressionMetric[] = [
      {
        name: 'A',
        field: 'host.disk.read.bytes',
        aggType: Aggregators.AVERAGE,
      },
      {
        name: 'B',
        field: 'system.cpu.system.pct',
        aggType: Aggregators.AVERAGE,
      },
    ];
    const next: CustomThresholdExpressionMetric[] = [
      {
        name: 'A',
        aggType: Aggregators.COUNT,
      },
      {
        name: 'B',
        field: 'system.cpu.system.pct',
        aggType: Aggregators.AVERAGE,
      },
    ];
    const threshold: number[] = [100];

    expect(convertToApiThreshold(previous, next, threshold)).toEqual(threshold);
  });

  test('multiple metrics (previous: ALL percent, next: some percent) -> threshold * 100', () => {
    const previous: CustomThresholdExpressionMetric[] = [
      {
        name: 'A',
        field: 'system.cpu.user.pct',
        aggType: Aggregators.AVERAGE,
      },
      {
        name: 'B',
        field: 'system.cpu.system.pct',
        aggType: Aggregators.AVERAGE,
      },
    ];
    const next: CustomThresholdExpressionMetric[] = [
      {
        name: 'A',
        aggType: Aggregators.COUNT,
      },
      {
        name: 'B',
        field: 'system.cpu.system.pct',
        aggType: Aggregators.AVERAGE,
      },
    ];
    const threshold: number[] = [1];
    const expectedThreshold: number[] = [100];

    expect(convertToApiThreshold(previous, next, threshold)).toEqual(expectedThreshold);
  });

  test('multiple metrics (previous: some percent, next: ALL percent) -> threshold / 100', () => {
    const previous: CustomThresholdExpressionMetric[] = [
      {
        name: 'A',
        aggType: Aggregators.COUNT,
      },
      {
        name: 'B',
        field: 'system.cpu.system.pct',
        aggType: Aggregators.AVERAGE,
      },
    ];
    const next: CustomThresholdExpressionMetric[] = [
      {
        name: 'A',
        field: 'system.cpu.user.pct',
        aggType: Aggregators.AVERAGE,
      },
      {
        name: 'B',
        field: 'system.cpu.system.pct',
        aggType: Aggregators.AVERAGE,
      },
    ];
    const threshold: number[] = [100];
    const expectedThreshold: number[] = [1];

    expect(convertToApiThreshold(previous, next, threshold)).toEqual(expectedThreshold);
  });
});
