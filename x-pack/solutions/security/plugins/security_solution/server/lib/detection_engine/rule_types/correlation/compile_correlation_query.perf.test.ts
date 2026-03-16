/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';

import type { CorrelationConfig } from '../../rule_schema';
import { compileCorrelationQuery } from './compile_correlation_query';

const SELF_RULE_ID = 'self-rule-uuid-perf';

const generateRuleIds = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `rule-${i.toString().padStart(4, '0')}`);

const generateFieldNames = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `field_${i}`);

const makeConfig = (overrides: Partial<CorrelationConfig> = {}): CorrelationConfig => ({
  rules: ['rule-1', 'rule-2'],
  type: 'temporal',
  groupBy: ['host.name'],
  timespan: '5m',
  ...overrides,
});

describe('compileCorrelationQuery performance', () => {
  it.each([
    { rules: 5, fields: 2, label: 'normal' },
    { rules: 50, fields: 2, label: 'many rules' },
    { rules: 5, fields: 10, label: 'many fields' },
    { rules: 50, fields: 10, label: 'both large' },
  ])('compiles $label config in <10ms', ({ rules, fields }) => {
    const config = makeConfig({
      rules: generateRuleIds(rules),
      groupBy: generateFieldNames(fields),
    });

    const start = performance.now();
    const query = compileCorrelationQuery(config, SELF_RULE_ID);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
    expect(query).toContain('FROM .alerts-security.alerts-default');
  });

  it.each(['temporal', 'temporal_ordered', 'event_count', 'value_count'] as const)(
    'compiles %s type with 50 rules in <10ms',
    (type) => {
      const config = makeConfig({
        rules: generateRuleIds(50),
        type,
        groupBy: ['host.name', 'user.name'],
        ...(type === 'event_count' || type === 'value_count'
          ? {
              condition: {
                operator: 'gte' as const,
                value: 5,
                ...(type === 'value_count' ? { field: 'source.ip' } : {}),
              },
            }
          : {}),
      });

      const start = performance.now();
      const query = compileCorrelationQuery(config, SELF_RULE_ID);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);
    }
  );

  it('compiles 200 rules across 20 groupBy fields in <50ms', () => {
    const config = makeConfig({
      rules: generateRuleIds(200),
      groupBy: generateFieldNames(20),
    });

    const start = performance.now();
    const query = compileCorrelationQuery(config, SELF_RULE_ID);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
    expect(query).toContain('FROM .alerts-security.alerts-default');
    expect(query).toContain('WHERE rule_count >= 200');

    // eslint-disable-next-line no-console
    console.log(`200 rules x 20 fields: ${duration.toFixed(2)}ms, query length: ${query.length}`);
  });

  it('produces stable output across repeated invocations', () => {
    const config = makeConfig({
      rules: generateRuleIds(10),
      groupBy: ['host.name', 'user.name'],
    });

    const results = Array.from({ length: 100 }, () =>
      compileCorrelationQuery(config, SELF_RULE_ID)
    );

    const unique = new Set(results);
    expect(unique.size).toBe(1);
  });
});
