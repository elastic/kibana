/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  Aggregators,
  CustomThresholdExpressionMetric,
} from '../../../common/custom_threshold_rule/types';
import { getBufferThreshold, getLensOperationFromRuleMetric, lensFieldFormatter } from './helpers';
const useCases = [
  [
    {
      aggType: Aggregators.SUM,
      field: 'system.cpu.user.pct',
      filter: '',
      name: '',
    },
    {
      operation: 'sum',
      operationWithField: 'sum("system.cpu.user.pct")',
      sourceField: '"system.cpu.user.pct"',
    },
  ],
  [
    {
      aggType: Aggregators.MAX,
      field: 'system.cpu.user.pct',
      filter: '',
      name: '',
    },
    {
      operation: 'max',
      operationWithField: 'max("system.cpu.user.pct")',
      sourceField: '"system.cpu.user.pct"',
    },
  ],
  [
    {
      aggType: Aggregators.MIN,
      field: 'system.cpu.user.pct',
      filter: '',
      name: '',
    },
    {
      operation: 'min',
      operationWithField: 'min("system.cpu.user.pct")',
      sourceField: '"system.cpu.user.pct"',
    },
  ],
  [
    {
      aggType: Aggregators.AVERAGE,
      field: 'system.cpu.user.pct',
      filter: '',
      name: '',
    },
    {
      operation: 'average',
      operationWithField: 'average("system.cpu.user.pct")',
      sourceField: '"system.cpu.user.pct"',
    },
  ],
  [
    {
      aggType: Aggregators.COUNT,
      field: '',
      filter: 'system.cpu.user.pct: *',
      name: '',
    },
    {
      operation: 'count',
      operationWithField: `count(kql='system.cpu.user.pct: *')`,
      sourceField: '""',
    },
  ],
  [
    {
      aggType: Aggregators.COUNT,
      field: '',
      filter: `container.name:container's name-1`,
      name: '',
    },
    {
      operation: 'count',
      operationWithField: `count(kql='container.name:container\\'s name-1')`,
      sourceField: '""',
    },
  ],
  [
    {
      aggType: Aggregators.COUNT,
      field: '',
      filter: 'host.name: host-*',
      name: '',
    },
    {
      operation: 'count',
      operationWithField: `count(kql='host.name: host-*')`,
      sourceField: '""',
    },
  ],
  [
    {
      aggType: Aggregators.CARDINALITY,
      field: 'system.cpu.user.pct',
      filter: '',
      name: '',
    },
    {
      operation: 'unique_count',
      operationWithField: 'unique_count("system.cpu.user.pct")',
      sourceField: '"system.cpu.user.pct"',
    },
  ],
  [
    {
      aggType: Aggregators.CARDINALITY,
      field: 'field.name/with/slashes',
      filter: '',
      name: '',
    },
    {
      operation: 'unique_count',
      operationWithField: 'unique_count("field.name/with/slashes")',
      sourceField: '"field.name/with/slashes"',
    },
  ],
  [
    {
      aggType: Aggregators.P95,
      field: 'system.cpu.user.pct',
      filter: '',
      name: '',
    },
    {
      operation: 'percentile',
      operationWithField: 'percentile("system.cpu.user.pct", percentile=95)',
      sourceField: '"system.cpu.user.pct"',
    },
  ],
  [
    {
      aggType: Aggregators.P99,
      field: 'system.cpu.user.pct',
      filter: '',
      name: '',
    },
    {
      operation: 'percentile',
      operationWithField: 'percentile("system.cpu.user.pct", percentile=99)',
      sourceField: '"system.cpu.user.pct"',
    },
  ],
  [
    {
      aggType: Aggregators.RATE,
      field: 'system.network.in.bytes',
      filter: '',
      name: '',
    },
    {
      operation: 'counter_rate',
      operationWithField: `counter_rate(max("system.network.in.bytes"), kql='')`,
      sourceField: '"system.network.in.bytes"',
    },
  ],
  [
    {
      aggType: Aggregators.RATE,
      field: 'system.network.in.bytes',
      filter: 'host.name : "foo"',
      name: '',
    },
    {
      operation: 'counter_rate',
      operationWithField: `counter_rate(max("system.network.in.bytes"), kql='host.name : "foo"')`,
      sourceField: '"system.network.in.bytes"',
    },
  ],
];

test.each(useCases)('returns the correct operation from %p. =>  %p', (metric, expectedValue) => {
  return expect(getLensOperationFromRuleMetric(metric as CustomThresholdExpressionMetric)).toEqual(
    expectedValue
  );
});

describe('getBufferThreshold', () => {
  const testData = [
    { threshold: undefined, buffer: '0.00' },
    { threshold: 0.1, buffer: '0.12' },
    { threshold: 0.01, buffer: '0.02' },
    { threshold: 0.001, buffer: '0.01' },
    { threshold: 0.00098, buffer: '0.01' },
    { threshold: 130, buffer: '143.00' },
  ];

  it.each(testData)('getBufferThreshold($threshold) = $buffer', ({ threshold, buffer }) => {
    expect(getBufferThreshold(threshold)).toBe(buffer);
  });
});

describe('lensFieldFormatter', () => {
  const testData = [
    { metrics: [{ field: 'system.bytes' }], format: 'bits' },
    { metrics: [{ field: 'system.pct' }], format: 'percent' },
    { metrics: [{ field: 'system.host.cores' }], format: 'number' },
    { metrics: [{ field: undefined }], format: 'number' },
  ];
  it.each(testData)('getBufferThreshold($threshold) = $buffer', ({ metrics, format }) => {
    expect(lensFieldFormatter(metrics as unknown as CustomThresholdExpressionMetric[])).toBe(
      format
    );
  });
});
