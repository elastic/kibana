/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  getCustomQueryRuleParams,
  getEqlRuleParams,
  getEsqlRuleParams,
  getMLRuleParams,
  getNewTermsRuleParams,
  getThreatMatchRuleParams,
  getThresholdRuleParams,
  importRulesWithSuccess,
} from '../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI import rules by type', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    const cases = [
      {
        type: 'query',
        rule: getCustomQueryRuleParams({
          rule_id: 'import-type-query',
          enabled: false,
        }),
        expected: { query: '*:*' },
      },
      {
        type: 'threshold',
        rule: getThresholdRuleParams({
          rule_id: 'import-type-threshold',
          enabled: false,
        }),
        expected: {
          threshold: {
            field: [],
            value: 1,
          },
        },
      },
      {
        type: 'eql',
        rule: getEqlRuleParams({
          rule_id: 'import-type-eql',
          enabled: false,
        }),
        expected: {
          language: 'eql',
          query: 'any where true',
        },
      },
      {
        type: 'threat_match',
        rule: getThreatMatchRuleParams({
          rule_id: 'import-type-threat-match',
          enabled: false,
        }),
        expected: {
          threat_query: '*:*',
          threat_index: ['logs_ti*'],
        },
      },
      {
        type: 'new_terms',
        rule: getNewTermsRuleParams({
          rule_id: 'import-type-new-terms',
          enabled: false,
        }),
        expected: {
          new_terms_fields: ['user.name'],
          history_window_start: 'now-7d',
        },
      },
      {
        type: 'esql',
        rule: getEsqlRuleParams({
          rule_id: 'import-type-esql',
          enabled: false,
        }),
        expected: {
          language: 'esql',
          query: 'from logs-* | limit 0',
        },
      },
      {
        type: 'machine_learning',
        rule: getMLRuleParams({
          rule_id: 'import-type-ml',
          enabled: false,
        }),
        expected: {
          machine_learning_job_id: ['some_job_id'],
          anomaly_threshold: 44,
        },
      },
    ] as const;

    for (const { type, rule, expected } of cases) {
      it(`imports a ${type} rule and reads it back`, async () => {
        await importRulesWithSuccess({
          getService,
          rules: [rule],
          overwrite: false,
        });

        const { body } = await detectionsApi
          .readRule({
            query: { rule_id: rule.rule_id },
          })
          .expect(200);

        expect(body).toMatchObject({
          type,
          rule_id: rule.rule_id,
          enabled: false,
          ...expected,
        });
      });
    }
  });
};
