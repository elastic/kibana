/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorrelationConfig } from '../../rule_schema';
import { compileCorrelationQuery } from './compile_correlation_query';

const SELF_RULE_ID = 'self-rule-uuid-000';

const makeConfig = (overrides: Partial<CorrelationConfig> = {}): CorrelationConfig => ({
  rules: ['rule-1', 'rule-2'],
  type: 'temporal',
  groupBy: ['host.name'],
  timespan: '5m',
  ...overrides,
});

const assertCommonShape = (query: string) => {
  expect(query).toContain('FROM .alerts-security.alerts-default METADATA _id, _index');
  expect(query).toContain(`kibana.alert.rule.uuid != "${SELF_RULE_ID}"`);
  expect(query).toContain('MV_APPEND(kibana.alert.uuid)');
  expect(query).toContain('MV_APPEND(kibana.alert.rule.name)');
  expect(query).toContain('MAX(kibana.alert.risk_score)');
  expect(query).toContain('MV_APPEND(kibana.alert.severity)');
};

describe('compileCorrelationQuery', () => {
  describe('temporal correlation', () => {
    it('compiles a basic temporal query with 2 rules and 1 group_by field', () => {
      const query = compileCorrelationQuery(makeConfig(), SELF_RULE_ID);

      assertCommonShape(query);
      expect(query).toContain('kibana.alert.rule.uuid IN ("rule-1", "rule-2")');
      expect(query).toContain('BY host.name');
      expect(query).toContain('@timestamp >= NOW() - 5m');
      expect(query).toContain('rule_count = COUNT_DISTINCT(kibana.alert.rule.uuid)');
      expect(query).toContain('min_time = MIN(@timestamp)');
      expect(query).toContain('max_time = MAX(@timestamp)');
      expect(query).toContain('WHERE rule_count >= 2');
    });

    it('handles multiple group_by fields', () => {
      const query = compileCorrelationQuery(
        makeConfig({ groupBy: ['host.name', 'user.name', 'source.ip'] }),
        SELF_RULE_ID
      );

      expect(query).toContain('BY host.name, user.name, source.ip');
    });

    it('includes the self-guard filter', () => {
      const query = compileCorrelationQuery(makeConfig(), SELF_RULE_ID);
      expect(query).toContain(`kibana.alert.rule.uuid != "${SELF_RULE_ID}"`);
    });

    it('uses IN for multiple rules', () => {
      const query = compileCorrelationQuery(makeConfig({ rules: ['a', 'b', 'c'] }), SELF_RULE_ID);

      expect(query).toContain('kibana.alert.rule.uuid IN ("a", "b", "c")');
      expect(query).toContain('WHERE rule_count >= 3');
    });

    it('does not contain SORT', () => {
      const query = compileCorrelationQuery(makeConfig(), SELF_RULE_ID);
      expect(query).not.toContain('SORT');
    });
  });

  describe('temporal_ordered correlation', () => {
    const orderedConfig = makeConfig({ type: 'temporal_ordered' });

    it('compiles with SORT @timestamp ASC', () => {
      const query = compileCorrelationQuery(orderedConfig, SELF_RULE_ID);

      assertCommonShape(query);
      expect(query).toContain('SORT @timestamp ASC');
    });

    it('uses first_seen / last_seen instead of min_time / max_time', () => {
      const query = compileCorrelationQuery(orderedConfig, SELF_RULE_ID);

      expect(query).toContain('first_seen = MIN(@timestamp)');
      expect(query).toContain('last_seen = MAX(@timestamp)');
      expect(query).not.toContain('min_time');
      expect(query).not.toContain('max_time');
    });

    it('applies rule_count threshold equal to the number of rules', () => {
      const query = compileCorrelationQuery(
        makeConfig({ type: 'temporal_ordered', rules: ['x', 'y', 'z'] }),
        SELF_RULE_ID
      );

      expect(query).toContain('WHERE rule_count >= 3');
    });
  });

  describe('event_count correlation', () => {
    it('uses default condition (> 1) when no condition is provided', () => {
      const query = compileCorrelationQuery(makeConfig({ type: 'event_count' }), SELF_RULE_ID);

      assertCommonShape(query);
      expect(query).toContain('event_count = COUNT(*)');
      expect(query).toContain('WHERE event_count > 1');
    });

    it.each<{ operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq'; symbol: string }>([
      { operator: 'gt', symbol: '>' },
      { operator: 'gte', symbol: '>=' },
      { operator: 'lt', symbol: '<' },
      { operator: 'lte', symbol: '<=' },
      { operator: 'eq', symbol: '==' },
      { operator: 'neq', symbol: '!=' },
    ])('maps "$operator" to "$symbol"', ({ operator, symbol }) => {
      const query = compileCorrelationQuery(
        makeConfig({
          type: 'event_count',
          condition: { operator, value: 10 },
        }),
        SELF_RULE_ID
      );

      expect(query).toContain(`WHERE event_count ${symbol} 10`);
    });

    it('does not contain COUNT_DISTINCT', () => {
      const query = compileCorrelationQuery(makeConfig({ type: 'event_count' }), SELF_RULE_ID);

      expect(query).not.toContain('COUNT_DISTINCT');
    });
  });

  describe('value_count correlation', () => {
    it('uses the specified field in COUNT_DISTINCT', () => {
      const query = compileCorrelationQuery(
        makeConfig({
          type: 'value_count',
          condition: { operator: 'gt', value: 3, field: 'source.ip' },
        }),
        SELF_RULE_ID
      );

      assertCommonShape(query);
      expect(query).toContain('distinct_values = COUNT_DISTINCT(source.ip)');
      expect(query).toContain('WHERE distinct_values > 3');
    });

    it('defaults to kibana.alert.uuid when no field is specified', () => {
      const query = compileCorrelationQuery(makeConfig({ type: 'value_count' }), SELF_RULE_ID);

      expect(query).toContain('COUNT_DISTINCT(kibana.alert.uuid)');
    });

    it('applies the condition operator and value', () => {
      const query = compileCorrelationQuery(
        makeConfig({
          type: 'value_count',
          condition: { operator: 'gte', value: 5, field: 'user.name' },
        }),
        SELF_RULE_ID
      );

      expect(query).toContain('WHERE distinct_values >= 5');
    });
  });

  describe('edge cases', () => {
    it('uses == for a single rule', () => {
      const query = compileCorrelationQuery(makeConfig({ rules: ['only-rule'] }), SELF_RULE_ID);

      expect(query).toContain('kibana.alert.rule.uuid == "only-rule"');
      expect(query).not.toContain('IN (');
    });

    it('handles many rules (5+)', () => {
      const rules = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];
      const query = compileCorrelationQuery(makeConfig({ rules }), SELF_RULE_ID);

      expect(query).toContain('kibana.alert.rule.uuid IN ("r1", "r2", "r3", "r4", "r5", "r6")');
      expect(query).toContain('WHERE rule_count >= 6');
    });

    it('quotes rule IDs that contain special characters', () => {
      const query = compileCorrelationQuery(
        makeConfig({ rules: ['rule/with-special.chars', 'another:rule'] }),
        SELF_RULE_ID
      );

      expect(query).toContain('"rule/with-special.chars"');
      expect(query).toContain('"another:rule"');
    });

    it('throws for an unsupported correlation type', () => {
      expect(() =>
        compileCorrelationQuery(
          makeConfig({ type: 'unsupported' as CorrelationConfig['type'] }),
          SELF_RULE_ID
        )
      ).toThrow('Unsupported correlation type: unsupported');
    });
  });

  describe('common assertions across all query types', () => {
    const types: CorrelationConfig['type'][] = [
      'temporal',
      'temporal_ordered',
      'event_count',
      'value_count',
    ];

    it.each(types)('"%s" targets .alerts-security.alerts-default with METADATA', (type) => {
      const query = compileCorrelationQuery(makeConfig({ type }), SELF_RULE_ID);
      expect(query).toContain('FROM .alerts-security.alerts-default METADATA _id, _index');
    });

    it.each(types)('"%s" includes the self-guard filter', (type) => {
      const query = compileCorrelationQuery(makeConfig({ type }), SELF_RULE_ID);
      expect(query).toContain(`kibana.alert.rule.uuid != "${SELF_RULE_ID}"`);
    });

    it.each(types)('"%s" uses MV_APPEND for alert_ids and rule_names', (type) => {
      const query = compileCorrelationQuery(makeConfig({ type }), SELF_RULE_ID);
      expect(query).toContain('alert_ids = MV_APPEND(kibana.alert.uuid)');
      expect(query).toContain('rule_names = MV_APPEND(kibana.alert.rule.name)');
    });

    it.each(types)('"%s" includes MAX(kibana.alert.risk_score)', (type) => {
      const query = compileCorrelationQuery(makeConfig({ type }), SELF_RULE_ID);
      expect(query).toContain('max_risk = MAX(kibana.alert.risk_score)');
    });

    it.each(types)('"%s" includes MV_APPEND(kibana.alert.severity)', (type) => {
      const query = compileCorrelationQuery(makeConfig({ type }), SELF_RULE_ID);
      expect(query).toContain('severity_list = MV_APPEND(kibana.alert.severity)');
    });

    it.each(types)('"%s" applies the timespan filter', (type) => {
      const query = compileCorrelationQuery(makeConfig({ type, timespan: '10m' }), SELF_RULE_ID);
      expect(query).toContain('@timestamp >= NOW() - 10m');
    });
  });
});
