/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../common/search_strategy';
import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import {
  buildEuidRuntimeMappingWithStoredFieldFastPath,
  buildRiskScoreBucket,
  getBaseScoreESQL,
  getESQL,
  getResolutionCompositeQuery,
  getResolutionScoreESQLByIds,
} from './calculate_esql_risk_scores';
import type { RiskScoreBucket } from '../types';
import { RIEMANN_ZETA_S_VALUE, RIEMANN_ZETA_VALUE } from './constants';

describe('Calculate risk scores with ESQL', () => {
  describe('ESQL query', () => {
    it('matches snapshot', () => {
      const q = getESQL(EntityType.host, { lower: 'abel', upper: 'zuzanna' }, 10000, 3500);
      expect(q).toMatchSnapshot();
    });

    it('builds resolution composite query for lookup index pagination', () => {
      const query = getResolutionCompositeQuery(
        '.entity_analytics.risk_score.lookup-default',
        1000,
        {
          resolution_target_id: 'user:foo',
        }
      );

      expect(query).toEqual({
        index: '.entity_analytics.risk_score.lookup-default',
        size: 0,
        query: {
          term: {
            relationship_type: 'entity.relationships.resolution.resolved_to',
          },
        },
        aggs: {
          by_resolution_target: {
            composite: {
              size: 1000,
              sources: [{ resolution_target_id: { terms: { field: 'resolution_target_id' } } }],
              after: { resolution_target_id: 'user:foo' },
            },
          },
        },
      });
    });

    it('scopes query to targetEntityIds when they are provided', () => {
      const query = getResolutionCompositeQuery(
        '.entity_analytics.risk_score.lookup-default',
        1000,
        undefined,
        ['user:target-1', 'user:target-2']
      );

      expect(query.query).toEqual({
        terms: { resolution_target_id: ['user:target-1', 'user:target-2'] },
      });
    });

    it('falls back to relationship_type term query when targetEntityIds is undefined', () => {
      const query = getResolutionCompositeQuery(
        '.entity_analytics.risk_score.lookup-default',
        1000
      );

      expect(query.query).toEqual({
        term: { relationship_type: 'entity.relationships.resolution.resolved_to' },
      });
    });

    it('builds resolution ESQL query for explicit resolution target ids', () => {
      const query = getResolutionScoreESQLByIds(
        EntityType.user,
        ['user:target-a', 'user:target-z'],
        5000,
        1000,
        '.alerts-security.alerts-default',
        '.entity_analytics.risk_score.lookup-default'
      );

      expect(query).toContain(
        'LOOKUP JOIN .entity_analytics.risk_score.lookup-default ON entity_id'
      );
      expect(query).toContain('resolution_target_id IN ("user:target-a", "user:target-z")');
      expect(query).toContain('BY resolution_target_id');
      expect(query).toContain('contributing_entities_raw = VALUES(entity_with_rel)');
    });

    it('escapes quote and backslash characters in resolution target ID list', () => {
      const query = getResolutionScoreESQLByIds(
        EntityType.user,
        ['user:target-a', 'user:with"quote\\slash@okta'],
        5000,
        1000,
        '.alerts-security.alerts-default',
        '.entity_analytics.risk_score.lookup-default'
      );

      expect(query).toContain('"user:target-a"');
      expect(query).toContain('"user:with\\"quote\\\\slash@okta"');
    });

    it.each([
      ['NUL', '\u0000'],
      ['LF', '\u000A'],
      ['CR', '\u000D'],
      ['LS', '\u2028'],
      ['PS', '\u2029'],
    ])('throws when resolution target id list contains %s control character', (_label, char) => {
      expect(() =>
        getResolutionScoreESQLByIds(
          EntityType.user,
          ['user:target-a', `user:bad${char}@okta`],
          5000,
          1000,
          '.alerts-security.alerts-default',
          '.entity_analytics.risk_score.lookup-default'
        )
      ).toThrow('Entity ID contains an unsupported control character');
    });

    it('escapes quote and backslash characters in getBaseScoreESQL bounds', () => {
      const query = getBaseScoreESQL(
        EntityType.host,
        { lower: 'host:edge"with-quote', upper: 'host:edge\\with-slash' },
        10000,
        3500,
        '.alerts-security.alerts-default'
      );

      expect(query).toContain('entity_id > "host:edge\\"with-quote"');
      expect(query).toContain('entity_id <= "host:edge\\\\with-slash"');
    });

    it.each([
      ['NUL', '\u0000'],
      ['LF', '\u000A'],
      ['CR', '\u000D'],
      ['LS', '\u2028'],
      ['PS', '\u2029'],
    ])('throws when getBaseScoreESQL bounds contain %s control character', (_label, char) => {
      expect(() =>
        getBaseScoreESQL(
          EntityType.host,
          { lower: 'host:abel', upper: `host:bad${char}` },
          10000,
          3500,
          '.alerts-security.alerts-default'
        )
      ).toThrow('Entity ID contains an unsupported control character');
    });
  });

  describe('stored-EUID fast path', () => {
    describe('buildEuidRuntimeMappingWithStoredFieldFastPath', () => {
      it('reads the stored kibana.alert.entity.id array first and short-circuits on a type-prefixed match', () => {
        const mapping = buildEuidRuntimeMappingWithStoredFieldFastPath(EntityType.host);

        expect(mapping.type).toBe('keyword');
        const { source } = mapping.script;
        expect(source).toContain("doc.containsKey('kibana.alert.entity.id')");
        expect(source).toContain("for (def __id : doc['kibana.alert.entity.id'])");
        expect(source).toContain("__id.startsWith('host:')");
        expect(source).toContain('emit(__id); return;');
        // The full Painless derivation remains as the fallback for alerts written before the stamp.
        expect(source).toContain('String ___euid = ___euid_rt_eval(doc);');
      });

      it('guards the fast path with the entity type prefix for user', () => {
        const { script } = buildEuidRuntimeMappingWithStoredFieldFastPath(EntityType.user);

        expect(script.source).toContain("__id.startsWith('user:')");
        expect(script.source).not.toContain("__id.startsWith('host:')");
      });

      it('does not gate the fallback derivation on postAggFilter', () => {
        const { script } = buildEuidRuntimeMappingWithStoredFieldFastPath(EntityType.user);

        // `entity.id exists` is the postAggFilter-only arm, so its absence proves the gate was dropped.
        expect(script.source).not.toContain(`doc.containsKey('entity.id')`);
        // documentsFilter still applies.
        expect(script.source).toContain(`doc.containsKey('user.name')`);
      });
    });

    describe('storedEuidCoalesceClause', () => {
      it('emits the coalesce clause in getBaseScoreESQL for host, scanning all three array positions', () => {
        const query = getBaseScoreESQL(
          EntityType.host,
          { lower: 'host:a', upper: 'host:z' },
          10000,
          3500,
          '.alerts-security.alerts-default'
        );

        expect(query).toContain(
          'EVAL entity_id = CASE(STARTS_WITH(MV_FIRST(MV_SLICE(kibana.alert.entity.id, 0, 0)), "host:")'
        );
        expect(query).toContain('MV_SLICE(kibana.alert.entity.id, 1, 1)');
        expect(query).toContain('MV_SLICE(kibana.alert.entity.id, 2, 2)');
      });

      it('emits the coalesce clause in getBaseScoreESQL for user', () => {
        const query = getBaseScoreESQL(
          EntityType.user,
          { lower: 'user:a', upper: 'user:z' },
          10000,
          3500,
          '.alerts-security.alerts-default'
        );

        expect(query).toContain(
          'STARTS_WITH(MV_FIRST(MV_SLICE(kibana.alert.entity.id, 0, 0)), "user:")'
        );
      });

      it('emits the coalesce clause in getResolutionScoreESQLByIds for host and user', () => {
        const hostQuery = getResolutionScoreESQLByIds(
          EntityType.host,
          ['host:target-a'],
          5000,
          1000,
          '.alerts-security.alerts-default',
          '.entity_analytics.risk_score.lookup-default'
        );
        expect(hostQuery).toContain(
          'STARTS_WITH(MV_FIRST(MV_SLICE(kibana.alert.entity.id, 0, 0)), "host:")'
        );

        const userQuery = getResolutionScoreESQLByIds(
          EntityType.user,
          ['user:target-a'],
          5000,
          1000,
          '.alerts-security.alerts-default',
          '.entity_analytics.risk_score.lookup-default'
        );
        expect(userQuery).toContain(
          'STARTS_WITH(MV_FIRST(MV_SLICE(kibana.alert.entity.id, 0, 0)), "user:")'
        );
      });
    });
  });

  describe('buildRiskScoreBucket', () => {
    it('parses esql results into RiskScoreBucket', () => {
      const inputs = [
        '{ "risk_score": "50", "time": "2021-08-23T18:00:05.000Z", "rule_name": "Test rule 5", "id": "test_id_5" }',
        '{ "risk_score": "40", "time": "2021-08-22T18:00:04.000Z", "rule_name": "Test rule 4", "id": "test_id_4" }',
        '{ "risk_score": "30", "time": "2021-08-21T18:00:03.000Z", "rule_name": "Test rule 3", "id": "test_id_3" }',
        '{ "risk_score": "20", "time": "2021-08-20T18:00:02.000Z", "rule_name": "Test rule 2", "id": "test_id_2" }',
        '{ "risk_score": "10", "time": "2021-08-19T18:00:01.000Z", "rule_name": "Test rule 1", "id": "test_id_1" }',
      ];
      const alertCount = 10;
      const riskScore = 100;
      const entityValue = 'hostname';

      const esqlResultRow = [alertCount, riskScore, inputs, entityValue];

      const bucket = buildRiskScoreBucket(
        EntityType.host,
        '.alerts-security.alerts-default'
      )(esqlResultRow as FieldValue[]);

      const expected: RiskScoreBucket = {
        key: { 'host.name': entityValue },
        doc_count: alertCount,
        top_inputs: {
          doc_count: inputs.length,
          risk_details: {
            value: {
              score: riskScore,
              normalized_score: riskScore / RIEMANN_ZETA_VALUE,
              notes: [],
              category_1_score: riskScore, // Don't normalize here - will be normalized in calculate_risk_scores.ts
              category_1_count: alertCount,
              risk_inputs: [
                {
                  index: '.alerts-security.alerts-default',
                  score: 50,
                  time: '2021-08-23T18:00:05.000Z',
                  rule_name: 'Test rule 5',
                  id: 'test_id_5',
                  contribution: 50 / 1 ** RIEMANN_ZETA_S_VALUE / RIEMANN_ZETA_VALUE,
                },
                {
                  index: '.alerts-security.alerts-default',
                  score: 40,
                  time: '2021-08-22T18:00:04.000Z',
                  rule_name: 'Test rule 4',
                  id: 'test_id_4',
                  contribution: 40 / 2 ** RIEMANN_ZETA_S_VALUE / RIEMANN_ZETA_VALUE,
                },
                {
                  index: '.alerts-security.alerts-default',
                  score: 30,
                  time: '2021-08-21T18:00:03.000Z',
                  rule_name: 'Test rule 3',
                  id: 'test_id_3',
                  contribution: 30 / 3 ** RIEMANN_ZETA_S_VALUE / RIEMANN_ZETA_VALUE,
                },
                {
                  index: '.alerts-security.alerts-default',
                  score: 20,
                  time: '2021-08-20T18:00:02.000Z',
                  rule_name: 'Test rule 2',
                  id: 'test_id_2',
                  contribution: 20 / 4 ** RIEMANN_ZETA_S_VALUE / RIEMANN_ZETA_VALUE,
                },
                {
                  index: '.alerts-security.alerts-default',
                  score: 10,
                  time: '2021-08-19T18:00:01.000Z',
                  rule_name: 'Test rule 1',
                  id: 'test_id_1',
                  contribution: 10 / 5 ** RIEMANN_ZETA_S_VALUE / RIEMANN_ZETA_VALUE,
                },
              ],
            },
          },
        },
      };

      expect(bucket).toEqual(expected);
    });

    /*  The below tests are a result of https://github.com/elastic/sdh-security-team/issues/1529 */

    describe('Rule name and category special characters', () => {
      it('decodes Base64 encoded rule_name and category', () => {
        // Simulate ESQL TO_BASE64 output
        const ruleNameWithQuotes = 'Test "Quoted" Alert';
        const categoryWithBackslash = 'signal\\test';
        const ruleNameB64 = Buffer.from(ruleNameWithQuotes, 'utf-8').toString('base64');
        const categoryB64 = Buffer.from(categoryWithBackslash, 'utf-8').toString('base64');

        const inputs = [
          `{ "risk_score": "75", "time": "2021-08-23T18:00:05.000Z", "index": ".alerts-security.alerts-default", "rule_name_b64": "${ruleNameB64}", "category_b64": "${categoryB64}", "id": "test_id_1" }`,
        ];
        const alertCount = 1;
        const riskScore = 75;
        const entityValue = 'hostname';

        const esqlResultRow = [alertCount, riskScore, inputs, entityValue];

        const bucket = buildRiskScoreBucket(
          EntityType.host,
          '.alerts-security.alerts-default'
        )(esqlResultRow as FieldValue[]);

        expect(bucket.top_inputs.risk_details.value.risk_inputs[0].rule_name).toBe(
          ruleNameWithQuotes
        );
        expect(bucket.top_inputs.risk_details.value.risk_inputs[0].category).toBe(
          categoryWithBackslash
        );
      });

      it('handles rule names with double quotes', () => {
        const ruleName = 'Alert: "Suspicious Activity" Detected';
        const ruleNameB64 = Buffer.from(ruleName, 'utf-8').toString('base64');

        const inputs = [
          `{ "risk_score": "80", "time": "2021-08-23T18:00:05.000Z", "index": ".alerts-security.alerts-default", "rule_name_b64": "${ruleNameB64}", "category_b64": "c2lnbmFs", "id": "test_id_1" }`,
        ];

        const esqlResultRow = [1, 80, inputs, 'hostname'];
        const bucket = buildRiskScoreBucket(
          EntityType.host,
          '.alerts-security.alerts-default'
        )(esqlResultRow as FieldValue[]);

        expect(bucket.top_inputs.risk_details.value.risk_inputs[0].rule_name).toBe(ruleName);
      });

      it('handles rule names with backslashes', () => {
        const ruleName = 'C:\\Windows\\System32\\malware.exe';
        const ruleNameB64 = Buffer.from(ruleName, 'utf-8').toString('base64');

        const inputs = [
          `{ "risk_score": "90", "time": "2021-08-23T18:00:05.000Z", "index": ".alerts-security.alerts-default", "rule_name_b64": "${ruleNameB64}", "category_b64": "c2lnbmFs", "id": "test_id_1" }`,
        ];

        const esqlResultRow = [1, 90, inputs, 'hostname'];
        const bucket = buildRiskScoreBucket(
          EntityType.host,
          '.alerts-security.alerts-default'
        )(esqlResultRow as FieldValue[]);

        expect(bucket.top_inputs.risk_details.value.risk_inputs[0].rule_name).toBe(ruleName);
      });

      it('handles rule names with newlines and tabs', () => {
        const ruleName = 'Multi\nLine\tRule';
        const ruleNameB64 = Buffer.from(ruleName, 'utf-8').toString('base64');

        const inputs = [
          `{ "risk_score": "85", "time": "2021-08-23T18:00:05.000Z", "index": ".alerts-security.alerts-default", "rule_name_b64": "${ruleNameB64}", "category_b64": "c2lnbmFs", "id": "test_id_1" }`,
        ];

        const esqlResultRow = [1, 85, inputs, 'hostname'];
        const bucket = buildRiskScoreBucket(
          EntityType.host,
          '.alerts-security.alerts-default'
        )(esqlResultRow as FieldValue[]);

        expect(bucket.top_inputs.risk_details.value.risk_inputs[0].rule_name).toBe(ruleName);
      });

      it('handles rule names with mixed special characters', () => {
        const ruleName = 'Alert: "Path\\To\\File"\nWith Newline\tAnd Tab';
        const category = 'Category with "quotes" and \\backslashes\\';
        const ruleNameB64 = Buffer.from(ruleName, 'utf-8').toString('base64');
        const categoryB64 = Buffer.from(category, 'utf-8').toString('base64');

        const inputs = [
          `{ "risk_score": "95", "time": "2021-08-23T18:00:05.000Z", "index": ".alerts-security.alerts-default", "rule_name_b64": "${ruleNameB64}", "category_b64": "${categoryB64}", "id": "test_id_1" }`,
        ];

        const esqlResultRow = [1, 95, inputs, 'hostname'];
        const bucket = buildRiskScoreBucket(
          EntityType.host,
          '.alerts-security.alerts-default'
        )(esqlResultRow as FieldValue[]);

        expect(bucket.top_inputs.risk_details.value.risk_inputs[0].rule_name).toBe(ruleName);
        expect(bucket.top_inputs.risk_details.value.risk_inputs[0].category).toBe(category);
      });

      it('handles Unicode characters', () => {
        const ruleName = 'Alert: 你好世界 🔥 Émojis';
        const ruleNameB64 = Buffer.from(ruleName, 'utf-8').toString('base64');

        const inputs = [
          `{ "risk_score": "70", "time": "2021-08-23T18:00:05.000Z", "index": ".alerts-security.alerts-default", "rule_name_b64": "${ruleNameB64}", "category_b64": "c2lnbmFs", "id": "test_id_1" }`,
        ];

        const esqlResultRow = [1, 70, inputs, 'hostname'];
        const bucket = buildRiskScoreBucket(
          EntityType.host,
          '.alerts-security.alerts-default'
        )(esqlResultRow as FieldValue[]);

        expect(bucket.top_inputs.risk_details.value.risk_inputs[0].rule_name).toBe(ruleName);
      });
    });

    describe('Backward compatibility', () => {
      it('handles old format without Base64 encoding (rule_name without _b64 suffix)', () => {
        const inputs = [
          '{ "risk_score": "50", "time": "2021-08-23T18:00:05.000Z", "index": ".alerts-security.alerts-default", "rule_name": "Old Format Rule", "category": "signal", "id": "test_id_1" }',
        ];
        const alertCount = 1;
        const riskScore = 50;
        const entityValue = 'hostname';

        const esqlResultRow = [alertCount, riskScore, inputs, entityValue];

        const bucket = buildRiskScoreBucket(
          EntityType.host,
          '.alerts-security.alerts-default'
        )(esqlResultRow as FieldValue[]);

        expect(bucket.top_inputs.risk_details.value.risk_inputs[0].rule_name).toBe(
          'Old Format Rule'
        );
        expect(bucket.top_inputs.risk_details.value.risk_inputs[0].category).toBe('signal');
      });

      it('prefers Base64 encoded fields over plain fields when both exist', () => {
        const correctRuleName = 'Rule Name like this would make life so much easier';
        const ruleNameB64 = Buffer.from(correctRuleName, 'utf-8').toString('base64');

        const inputs = [
          `{ "risk_score": "60", "time": "2021-08-23T18:00:05.000Z", "index": ".alerts-security.alerts-default", "rule_name": "Wrong Name", "rule_name_b64": "${ruleNameB64}", "category": "wrong", "category_b64": "Y29ycmVjdA==", "id": "test_id_1" }`,
        ];

        const esqlResultRow = [1, 60, inputs, 'hostname'];
        const bucket = buildRiskScoreBucket(
          EntityType.host,
          '.alerts-security.alerts-default'
        )(esqlResultRow as FieldValue[]);

        expect(bucket.top_inputs.risk_details.value.risk_inputs[0].rule_name).toBe(correctRuleName);
        expect(bucket.top_inputs.risk_details.value.risk_inputs[0].category).toBe('correct');
      });
    });

    describe('Multiple inputs with mixed formats', () => {
      it('handles array of inputs with both Base64 and plain text', () => {
        const ruleNameB64 = Buffer.from('Test "Quoted" Alert', 'utf-8').toString('base64');
        const inputs = [
          `{ "risk_score": "75", "time": "2021-08-23T18:00:05.000Z", "index": ".alerts-security.alerts-default", "rule_name_b64": "${ruleNameB64}", "category_b64": "c2lnbmFs", "id": "test_id_1" }`,
          '{ "risk_score": "50", "time": "2021-08-22T18:00:04.000Z", "index": ".alerts-security.alerts-default", "rule_name": "Plain Rule", "category": "signal", "id": "test_id_2" }',
        ];

        const esqlResultRow = [2, 125, inputs, 'hostname'];
        const bucket = buildRiskScoreBucket(
          EntityType.host,
          '.alerts-security.alerts-default'
        )(esqlResultRow as FieldValue[]);

        expect(bucket.top_inputs.risk_details.value.risk_inputs).toHaveLength(2);
        expect(bucket.top_inputs.risk_details.value.risk_inputs[0].rule_name).toBe(
          'Test "Quoted" Alert'
        );
        expect(bucket.top_inputs.risk_details.value.risk_inputs[1].rule_name).toBe('Plain Rule');
      });
    });
  });
});
