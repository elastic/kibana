/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../common/search_strategy';
import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { buildRiskScoreBucket, getESQL } from './calculate_esql_risk_scores';
import type { RiskScoreBucket } from '../types';
import { RIEMANN_ZETA_S_VALUE, RIEMANN_ZETA_VALUE } from './constants';

describe('Calculate risk scores with ESQL', () => {
  describe('ESQL query', () => {
    it('matches snapshot', () => {
      const q = getESQL(EntityType.host, { lower: 'abel', upper: 'zuzanna' }, 10000, 3500);
      expect(q).toMatchSnapshot();
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
  });
});
