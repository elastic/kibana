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
import { createFormatterForMetric } from './create_formatter_for_metric';

describe('createFormatterForMetric()', () => {
  it('should just work for count', () => {
    const metric: CustomThresholdExpressionMetric[] = [{ name: 'A', aggType: Aggregators.COUNT }];
    const format = createFormatterForMetric(metric);
    expect(format(1291929)).toBe('1,291,929');
  });
  it('should just work for numerics', () => {
    const metric: CustomThresholdExpressionMetric[] = [
      { name: 'A', aggType: Aggregators.AVERAGE, field: 'system.load.1' },
    ];
    const format = createFormatterForMetric(metric);
    expect(format(1000.2)).toBe('1,000.2');
  });
  it('should just work for percents', () => {
    const metric: CustomThresholdExpressionMetric[] = [
      { name: 'A', aggType: Aggregators.AVERAGE, field: 'system.cpu.total.pct' },
    ];
    const format = createFormatterForMetric(metric);
    expect(format(0.349)).toBe('34.9%');
  });
  it('should just work for bytes', () => {
    const metric: CustomThresholdExpressionMetric[] = [
      { name: 'A', aggType: Aggregators.AVERAGE, field: 'host.network.egress.bytes' },
    ];
    const format = createFormatterForMetric(metric);
    expect(format(103929292)).toBe('103.9 MB');
  });
});
