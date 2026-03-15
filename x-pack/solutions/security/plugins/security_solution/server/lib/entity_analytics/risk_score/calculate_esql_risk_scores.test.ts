/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common';
import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { EntityType } from '../../../../common/search_strategy';
import { buildRiskScoreBucket, getCompositeQuery, getESQL } from './calculate_esql_risk_scores';
import type { CalculateScoresParams, RiskScoreBucket } from '../types';
import { RIEMANN_ZETA_S_VALUE, RIEMANN_ZETA_VALUE } from './constants';

describe('Calculate risk scores with ESQL', () => {
  describe('ESQL query', () => {
    describe('V1 (legacy, idBasedRiskScoringEnabled=false)', () => {
      it('matches snapshot', () => {
        const q = getESQL(
          EntityType.host,
          { lower: 'abel', upper: 'zuzanna' },
          10000,
          3500,
          undefined,
          false
        );
        expect(q).toMatchSnapshot();
      });

      it('uses KQL range filter and host.name identifier', () => {
        const q = getESQL(
          EntityType.host,
          { lower: 'abel', upper: 'zuzanna' },
          10000,
          3500,
          undefined,
          false
        );
        expect(q).toContain('KQL(');
        expect(q).toContain('host.name');
        expect(q).not.toContain('EVAL host_id');
      });
    });

    describe('V2 (entity store v2, idBasedRiskScoringEnabled=true)', () => {
      it('matches snapshot', () => {
        const q = getESQL(
          EntityType.host,
          { lower: 'host:abel', upper: 'host:zuzanna' },
          10000,
          3500,
          undefined,
          true
        );
        expect(q).toMatchSnapshot();
      });

      it('uses EVAL-based EUID identification instead of KQL', () => {
        const q = getESQL(
          EntityType.host,
          { lower: 'host:abel', upper: 'host:zuzanna' },
          10000,
          3500,
          undefined,
          true
        );
        expect(q).not.toContain('KQL(');
        expect(q).toContain('EVAL host_id');
        expect(q).toContain('BY host_id');
      });

      it('quotes range comparison values', () => {
        const q = getESQL(
          EntityType.user,
          { lower: 'user:alice', upper: 'user:zara' },
          10000,
          3500,
          undefined,
          true
        );
        expect(q).toContain('"user:alice"');
        expect(q).toContain('"user:zara"');
      });

      it('escapes special characters in V2 after_keys range bounds', () => {
        const q = getESQL(
          EntityType.host,
          {
            lower: 'host:ab"cd\\name',
            upper: 'host:xy\n\tz',
          },
          10000,
          3500,
          undefined,
          true
        );

        expect(q).toContain('host_id > "host:ab\\"cd\\\\name"');
        expect(q).toContain('host_id <= "host:xy\\n\\tz"');
      });
    });
  });

  describe('buildRiskScoreBucket', () => {
    const sampleInputs = [
      '{ "risk_score": "50", "time": "2021-08-23T18:00:05.000Z", "rule_name": "Test rule 5", "id": "test_id_5" }',
      '{ "risk_score": "40", "time": "2021-08-22T18:00:04.000Z", "rule_name": "Test rule 4", "id": "test_id_4" }',
      '{ "risk_score": "30", "time": "2021-08-21T18:00:03.000Z", "rule_name": "Test rule 3", "id": "test_id_3" }',
      '{ "risk_score": "20", "time": "2021-08-20T18:00:02.000Z", "rule_name": "Test rule 2", "id": "test_id_2" }',
      '{ "risk_score": "10", "time": "2021-08-19T18:00:01.000Z", "rule_name": "Test rule 1", "id": "test_id_1" }',
    ];

    it('V1: keys bucket by host.name when idBasedRiskScoringEnabled is false', () => {
      const esqlResultRow = [10, 100, sampleInputs, 'hostname'];

      const bucket = buildRiskScoreBucket(
        EntityType.host,
        '.alerts-security.alerts-default',
        false
      )(esqlResultRow as FieldValue[]);

      expect(bucket.key).toEqual({ 'host.name': 'hostname' });
    });

    it('V2: keys bucket by entity.id when idBasedRiskScoringEnabled is true', () => {
      const esqlResultRow = [10, 100, sampleInputs, 'host:abc123'];

      const bucket = buildRiskScoreBucket(
        EntityType.host,
        '.alerts-security.alerts-default',
        true
      )(esqlResultRow as FieldValue[]);

      expect(bucket.key).toEqual({ 'entity.id': 'host:abc123' });
    });

    it('V2: keys bucket by entity.id for user entity type', () => {
      const esqlResultRow = [5, 80, sampleInputs.slice(0, 1), 'user:alice'];

      const bucket = buildRiskScoreBucket(
        EntityType.user,
        '.alerts-security.alerts-default',
        true
      )(esqlResultRow as FieldValue[]);

      expect(bucket.key).toEqual({ 'entity.id': 'user:alice' });
    });

    it('V2: keys bucket by entity.id for service entity type', () => {
      const esqlResultRow = [3, 60, sampleInputs.slice(0, 1), 'service:my-svc'];

      const bucket = buildRiskScoreBucket(
        EntityType.service,
        '.alerts-security.alerts-default',
        true
      )(esqlResultRow as FieldValue[]);

      expect(bucket.key).toEqual({ 'entity.id': 'service:my-svc' });
    });

    it('V2: includes euid_fields when identitySourceFields is passed', () => {
      const identitySourceFields = euid.getEuidSourceFields(EntityType.host).identitySourceFields;
      // Row: count, score, inputs, ...identityValues, entity (BY column last)
      const idVals = ['eid-1', 'hid-2', 'server1', 'example.com', 'server1.example.com'];
      const esqlResultRow = [
        10,
        100,
        sampleInputs,
        ...idVals,
        'host:server1.example.com',
      ] as FieldValue[];

      const bucket = buildRiskScoreBucket(
        EntityType.host,
        '.alerts-security.alerts-default',
        true,
        identitySourceFields
      )(esqlResultRow);

      expect(bucket.key).toEqual({ 'entity.id': 'host:server1.example.com' });
      expect(bucket.euid_fields).toEqual({
        'host.entity.id': 'eid-1',
        'host.id': 'hid-2',
        'host.name': 'server1',
        'host.domain': 'example.com',
        'host.hostname': 'server1.example.com',
      });
    });

    it('parses esql results into RiskScoreBucket', () => {
      const alertCount = 10;
      const riskScore = 100;
      const entityValue = 'hostname';

      const esqlResultRow = [alertCount, riskScore, sampleInputs, entityValue];

      const bucket = buildRiskScoreBucket(
        EntityType.host,
        '.alerts-security.alerts-default',
        false
      )(esqlResultRow as FieldValue[]);

      const expected: RiskScoreBucket = {
        key: { 'host.name': entityValue },
        doc_count: alertCount,
        top_inputs: {
          doc_count: sampleInputs.length,
          risk_details: {
            value: {
              score: riskScore,
              normalized_score: riskScore / RIEMANN_ZETA_VALUE,
              notes: [],
              category_1_score: riskScore,
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
          '.alerts-security.alerts-default',
          false
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
          '.alerts-security.alerts-default',
          false
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
          '.alerts-security.alerts-default',
          false
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
          '.alerts-security.alerts-default',
          false
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
          '.alerts-security.alerts-default',
          false
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
          '.alerts-security.alerts-default',
          false
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
          '.alerts-security.alerts-default',
          false
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
          '.alerts-security.alerts-default',
          false
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
          '.alerts-security.alerts-default',
          false
        )(esqlResultRow as FieldValue[]);

        expect(bucket.top_inputs.risk_details.value.risk_inputs).toHaveLength(2);
        expect(bucket.top_inputs.risk_details.value.risk_inputs[0].rule_name).toBe(
          'Test "Quoted" Alert'
        );
        expect(bucket.top_inputs.risk_details.value.risk_inputs[1].rule_name).toBe('Plain Rule');
      });
    });
  });

  describe('getCompositeQuery', () => {
    const baseParams: CalculateScoresParams = {
      index: '.alerts-security.alerts-default',
      pageSize: 500,
      range: { start: 'now-15d', end: 'now' },
      runtimeMappings: {},
      weights: [],
      afterKeys: {},
      alertSampleSizePerShard: 10000,
      excludeAlertStatuses: [],
      excludeAlertTags: [],
    };

    it('V1: uses only params.runtimeMappings and EntityTypeToIdentifierField', () => {
      const query = getCompositeQuery([EntityType.host], [], baseParams, false);

      expect(query.runtime_mappings).toEqual({});

      const aggs = query.aggs as Record<string, unknown>;
      const hostAgg = aggs.host as {
        composite: { sources: Array<Record<string, { terms: { field: string } }>> };
      };
      const sourceField = Object.keys(hostAgg.composite.sources[0])[0];
      expect(sourceField).toBe('host.name');
    });

    it('V2: adds euid runtime mappings and uses internal id field', () => {
      const query = getCompositeQuery([EntityType.host], [], baseParams, true);

      expect(query.runtime_mappings).toHaveProperty('host_id');
      expect((query.runtime_mappings as Record<string, { type: string }>).host_id.type).toBe(
        'keyword'
      );

      const aggs = query.aggs as Record<string, unknown>;
      const hostAgg = aggs.host as {
        composite: { sources: Array<Record<string, { terms: { field: string } }>> };
      };
      const sourceField = Object.keys(hostAgg.composite.sources[0])[0];
      expect(sourceField).toBe('host_id');
    });

    it('V2: adds runtime mappings for multiple entity types', () => {
      const query = getCompositeQuery([EntityType.host, EntityType.user], [], baseParams, true);

      expect(query.runtime_mappings).toHaveProperty('host_id');
      expect(query.runtime_mappings).toHaveProperty('user_id');
    });

    it('V1: preserves existing runtime mappings without adding euid fields', () => {
      const paramsWithMappings = {
        ...baseParams,
        runtimeMappings: { custom_field: { type: 'keyword' as const, script: { source: '...' } } },
      };
      const query = getCompositeQuery([EntityType.host], [], paramsWithMappings, false);

      expect(query.runtime_mappings).toEqual(paramsWithMappings.runtimeMappings);
      expect(query.runtime_mappings).not.toHaveProperty('host_id');
    });
  });
});
