/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorrelationConfig } from '../../rule_schema';
import { compileCorrelationQuery, buildEnrichmentIndices } from './compile_correlation_query';

const SELF_RULE_ID = 'self-rule-uuid-000';
const DEFAULT_SPACE = 'default';

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
  expect(query).toContain('VALUES(kibana.alert.uuid)');
  expect(query).toContain('VALUES(kibana.alert.rule.name)');
  expect(query).toContain('MAX(kibana.alert.risk_score)');
  expect(query).toContain('VALUES(kibana.alert.severity)');
};

describe('compileCorrelationQuery', () => {
  describe('temporal correlation', () => {
    it('compiles a basic temporal query with 2 rules and 1 group_by field', () => {
      const query = compileCorrelationQuery(makeConfig(), SELF_RULE_ID, DEFAULT_SPACE);

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
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain('BY host.name, user.name, source.ip');
    });

    it('includes the self-guard filter', () => {
      const query = compileCorrelationQuery(makeConfig(), SELF_RULE_ID, DEFAULT_SPACE);
      expect(query).toContain(`kibana.alert.rule.uuid != "${SELF_RULE_ID}"`);
    });

    it('uses IN for multiple rules', () => {
      const query = compileCorrelationQuery(
        makeConfig({ rules: ['a', 'b', 'c'] }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain('kibana.alert.rule.uuid IN ("a", "b", "c")');
      expect(query).toContain('WHERE rule_count >= 3');
    });

    it('does not contain SORT', () => {
      const query = compileCorrelationQuery(makeConfig(), SELF_RULE_ID, DEFAULT_SPACE);
      expect(query).not.toContain('SORT');
    });
  });

  describe('temporal_ordered correlation', () => {
    const orderedConfig = makeConfig({ type: 'temporal_ordered' });

    it('compiles with SORT @timestamp ASC', () => {
      const query = compileCorrelationQuery(orderedConfig, SELF_RULE_ID, DEFAULT_SPACE);

      assertCommonShape(query);
      expect(query).toContain('SORT @timestamp ASC');
    });

    it('uses first_seen / last_seen instead of min_time / max_time', () => {
      const query = compileCorrelationQuery(orderedConfig, SELF_RULE_ID, DEFAULT_SPACE);

      expect(query).toContain('first_seen = MIN(@timestamp)');
      expect(query).toContain('last_seen = MAX(@timestamp)');
      expect(query).not.toContain('min_time');
      expect(query).not.toContain('max_time');
    });

    it('applies rule_count threshold equal to the number of rules', () => {
      const query = compileCorrelationQuery(
        makeConfig({ type: 'temporal_ordered', rules: ['x', 'y', 'z'] }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain('WHERE rule_count >= 3');
    });
  });

  describe('event_count correlation', () => {
    it('uses default condition (> 1) when no condition is provided', () => {
      const query = compileCorrelationQuery(
        makeConfig({ type: 'event_count' }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

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
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain(`WHERE event_count ${symbol} 10`);
    });

    it('does not contain COUNT_DISTINCT', () => {
      const query = compileCorrelationQuery(
        makeConfig({ type: 'event_count' }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

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
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      assertCommonShape(query);
      expect(query).toContain('distinct_values = COUNT_DISTINCT(source.ip)');
      expect(query).toContain('WHERE distinct_values > 3');
    });

    it('defaults to kibana.alert.uuid when no field is specified', () => {
      const query = compileCorrelationQuery(
        makeConfig({ type: 'value_count' }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain('COUNT_DISTINCT(kibana.alert.uuid)');
    });

    it('applies the condition operator and value', () => {
      const query = compileCorrelationQuery(
        makeConfig({
          type: 'value_count',
          condition: { operator: 'gte', value: 5, field: 'user.name' },
        }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain('WHERE distinct_values >= 5');
    });
  });

  describe('edge cases', () => {
    it('uses == for a single rule', () => {
      const query = compileCorrelationQuery(
        makeConfig({ rules: ['only-rule'] }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain('kibana.alert.rule.uuid == "only-rule"');
      expect(query).not.toContain('IN (');
    });

    it('handles many rules (5+)', () => {
      const rules = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];
      const query = compileCorrelationQuery(makeConfig({ rules }), SELF_RULE_ID, DEFAULT_SPACE);

      expect(query).toContain('kibana.alert.rule.uuid IN ("r1", "r2", "r3", "r4", "r5", "r6")');
      expect(query).toContain('WHERE rule_count >= 6');
    });

    it('quotes rule IDs that contain special characters', () => {
      const query = compileCorrelationQuery(
        makeConfig({ rules: ['rule/with-special.chars', 'another:rule'] }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain('"rule/with-special.chars"');
      expect(query).toContain('"another:rule"');
    });

    it('escapes quotes and backslashes in rule IDs', () => {
      const query = compileCorrelationQuery(
        makeConfig({ rules: ['rule"with"quotes', 'rule\\with\\backslashes'] }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain('"rule\\"with\\"quotes"');
      expect(query).toContain('"rule\\\\with\\\\backslashes"');
    });

    it('escapes the selfRuleId in the self-guard', () => {
      const query = compileCorrelationQuery(makeConfig(), 'self"injected', DEFAULT_SPACE);

      expect(query).toContain('kibana.alert.rule.uuid != "self\\"injected"');
    });

    it('validates groupBy field names', () => {
      expect(() =>
        compileCorrelationQuery(
          makeConfig({ groupBy: ['host.name; DROP TABLE'] }),
          SELF_RULE_ID,
          DEFAULT_SPACE
        )
      ).toThrow('Invalid field name');
    });

    it('throws for an unsupported correlation type', () => {
      expect(() =>
        compileCorrelationQuery(
          makeConfig({ type: 'unsupported' as CorrelationConfig['type'] }),
          SELF_RULE_ID,
          DEFAULT_SPACE
        )
      ).toThrow('Unsupported correlation type: unsupported');
    });

    it('throws for an unknown operator', () => {
      expect(() =>
        compileCorrelationQuery(
          makeConfig({
            type: 'event_count',
            condition: { operator: 'invalid' as 'gt', value: 1 },
          }),
          SELF_RULE_ID,
          DEFAULT_SPACE
        )
      ).toThrow('Unknown operator: invalid');
    });

    it('includes LIMIT when maxGroups is provided', () => {
      const query = compileCorrelationQuery(makeConfig(), SELF_RULE_ID, DEFAULT_SPACE, 101);
      expect(query).toContain('| LIMIT 101');
    });

    it('omits LIMIT when maxGroups is not provided', () => {
      const query = compileCorrelationQuery(makeConfig(), SELF_RULE_ID, DEFAULT_SPACE);
      expect(query).not.toContain('LIMIT');
    });

    it('floors non-integer maxGroups to a safe integer', () => {
      const query = compileCorrelationQuery(makeConfig(), SELF_RULE_ID, DEFAULT_SPACE, 10.7);
      expect(query).toContain('| LIMIT 10');
    });

    it('clamps maxGroups of 0 to minimum of 1', () => {
      const query = compileCorrelationQuery(makeConfig(), SELF_RULE_ID, DEFAULT_SPACE, 0);
      expect(query).toContain('| LIMIT 1');
    });

    it('compiles temporal query with remote clusters', () => {
      const query = compileCorrelationQuery(
        makeConfig({ remoteClusters: ['cluster-west'] }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain(
        'FROM .alerts-security.alerts-default, cluster-west:.alerts-security.alerts-default METADATA _id, _index'
      );
    });

    it('compiles query with multiple remote clusters', () => {
      const query = compileCorrelationQuery(
        makeConfig({ remoteClusters: ['cluster-west', 'cluster-east'] }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain(
        'FROM .alerts-security.alerts-default, cluster-west:.alerts-security.alerts-default, cluster-east:.alerts-security.alerts-default METADATA _id, _index'
      );
    });

    it('validates remote cluster names', () => {
      expect(() =>
        compileCorrelationQuery(
          makeConfig({ remoteClusters: ['valid-cluster', 'invalid cluster!'] }),
          SELF_RULE_ID,
          DEFAULT_SPACE
        )
      ).toThrow('Invalid remote cluster name');
    });

    it('compiles query without remote indices when remoteClusters is empty', () => {
      const query = compileCorrelationQuery(
        makeConfig({ remoteClusters: [] }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain('FROM .alerts-security.alerts-default METADATA _id, _index');
      expect(query).not.toContain('cluster');
    });

    it('compiles query without remote indices when remoteClusters is undefined', () => {
      const query = compileCorrelationQuery(makeConfig(), SELF_RULE_ID, DEFAULT_SPACE);

      expect(query).toContain('FROM .alerts-security.alerts-default METADATA _id, _index');
    });

    it('throws when groupBy is empty', () => {
      expect(() =>
        compileCorrelationQuery(makeConfig({ groupBy: [] }), SELF_RULE_ID, DEFAULT_SPACE)
      ).toThrow('Correlation rules require at least one groupBy field');
    });
  });

  describe('cross-space correlation', () => {
    it('compiles query with target spaces', () => {
      const query = compileCorrelationQuery(
        makeConfig({ targetSpaces: ['soc'] }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain(
        'FROM .alerts-security.alerts-default, .alerts-security.alerts-soc METADATA _id, _index'
      );
    });

    it('compiles query with multiple target spaces', () => {
      const query = compileCorrelationQuery(
        makeConfig({ targetSpaces: ['soc', 'finance'] }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain(
        'FROM .alerts-security.alerts-default, .alerts-security.alerts-soc, .alerts-security.alerts-finance METADATA _id, _index'
      );
    });

    it('compiles query with target spaces and remote clusters combined', () => {
      const query = compileCorrelationQuery(
        makeConfig({ targetSpaces: ['soc'], remoteClusters: ['west'] }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain(
        'FROM .alerts-security.alerts-default, .alerts-security.alerts-soc, west:.alerts-security.alerts-default, west:.alerts-security.alerts-soc METADATA _id, _index'
      );
    });

    it('validates space IDs', () => {
      expect(() =>
        compileCorrelationQuery(
          makeConfig({ targetSpaces: ['valid-space', 'INVALID SPACE!'] }),
          SELF_RULE_ID,
          DEFAULT_SPACE
        )
      ).toThrow('Invalid space ID');
    });

    it('handles empty targetSpaces array', () => {
      const query = compileCorrelationQuery(
        makeConfig({ targetSpaces: [] }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain('FROM .alerts-security.alerts-default METADATA _id, _index');
    });

    it('deduplicates when targetSpaces includes the current space', () => {
      const query = compileCorrelationQuery(
        makeConfig({ targetSpaces: ['default', 'soc'] }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );

      expect(query).toContain(
        'FROM .alerts-security.alerts-default, .alerts-security.alerts-soc METADATA _id, _index'
      );
      const fromMatch = query.match(/\.alerts-security\.alerts-default/g);
      expect(fromMatch).toHaveLength(1);
    });

    it('uses the correct space index for non-default spaces', () => {
      const query = compileCorrelationQuery(makeConfig(), SELF_RULE_ID, 'soc');

      expect(query).toContain('FROM .alerts-security.alerts-soc METADATA _id, _index');
      expect(query).not.toContain('.alerts-security.alerts-default');
    });
  });

  describe('buildEnrichmentIndices', () => {
    it('returns the current space index when no target spaces', () => {
      expect(buildEnrichmentIndices('default')).toEqual(['.alerts-security.alerts-default']);
    });

    it('returns array of indices with target spaces', () => {
      expect(buildEnrichmentIndices('default', ['soc', 'finance'])).toEqual([
        '.alerts-security.alerts-default',
        '.alerts-security.alerts-soc',
        '.alerts-security.alerts-finance',
      ]);
    });

    it('deduplicates when target spaces includes the current space', () => {
      expect(buildEnrichmentIndices('default', ['default', 'soc'])).toEqual([
        '.alerts-security.alerts-default',
        '.alerts-security.alerts-soc',
      ]);
    });

    it('validates space IDs', () => {
      expect(() => buildEnrichmentIndices('default', ['INVALID!'])).toThrow('Invalid space ID');
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
      const query = compileCorrelationQuery(makeConfig({ type }), SELF_RULE_ID, DEFAULT_SPACE);
      expect(query).toContain('FROM .alerts-security.alerts-default METADATA _id, _index');
    });

    it.each(types)('"%s" includes the self-guard filter', (type) => {
      const query = compileCorrelationQuery(makeConfig({ type }), SELF_RULE_ID, DEFAULT_SPACE);
      expect(query).toContain(`kibana.alert.rule.uuid != "${SELF_RULE_ID}"`);
    });

    it.each(types)('"%s" uses VALUES for alert_ids and rule_names', (type) => {
      const query = compileCorrelationQuery(makeConfig({ type }), SELF_RULE_ID, DEFAULT_SPACE);
      expect(query).toContain('alert_ids = VALUES(kibana.alert.uuid)');
      expect(query).toContain('rule_names = VALUES(kibana.alert.rule.name)');
    });

    it.each(types)('"%s" includes MAX(kibana.alert.risk_score)', (type) => {
      const query = compileCorrelationQuery(makeConfig({ type }), SELF_RULE_ID, DEFAULT_SPACE);
      expect(query).toContain('max_risk = MAX(kibana.alert.risk_score)');
    });

    it.each(types)('"%s" includes VALUES(kibana.alert.severity)', (type) => {
      const query = compileCorrelationQuery(makeConfig({ type }), SELF_RULE_ID, DEFAULT_SPACE);
      expect(query).toContain('severity_list = VALUES(kibana.alert.severity)');
    });

    it.each(types)('"%s" applies the timespan filter', (type) => {
      const query = compileCorrelationQuery(
        makeConfig({ type, timespan: '10m' }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );
      expect(query).toContain('@timestamp >= NOW() - 10m');
    });

    it.each(types)('"%s" includes remote clusters in FROM clause when configured', (type) => {
      const query = compileCorrelationQuery(
        makeConfig({ type, remoteClusters: ['remote1'] }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );
      expect(query).toContain(
        'FROM .alerts-security.alerts-default, remote1:.alerts-security.alerts-default METADATA _id, _index'
      );
    });

    it.each(types)('"%s" includes target spaces in FROM clause when configured', (type) => {
      const query = compileCorrelationQuery(
        makeConfig({ type, targetSpaces: ['soc'] }),
        SELF_RULE_ID,
        DEFAULT_SPACE
      );
      expect(query).toContain(
        'FROM .alerts-security.alerts-default, .alerts-security.alerts-soc METADATA _id, _index'
      );
    });
  });
});
