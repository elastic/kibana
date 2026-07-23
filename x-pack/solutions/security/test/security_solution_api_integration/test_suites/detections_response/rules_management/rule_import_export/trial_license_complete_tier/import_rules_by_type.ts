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
      },
      {
        type: 'threshold',
        rule: getThresholdRuleParams({
          rule_id: 'import-type-threshold',
          enabled: false,
        }),
      },
      {
        type: 'eql',
        rule: getEqlRuleParams({
          rule_id: 'import-type-eql',
          enabled: false,
        }),
      },
      {
        type: 'threat_match',
        rule: getThreatMatchRuleParams({
          rule_id: 'import-type-threat-match',
          enabled: false,
        }),
      },
      {
        type: 'new_terms',
        rule: getNewTermsRuleParams({
          rule_id: 'import-type-new-terms',
          enabled: false,
        }),
      },
      {
        type: 'esql',
        rule: getEsqlRuleParams({
          rule_id: 'import-type-esql',
          enabled: false,
        }),
      },
      {
        type: 'machine_learning',
        rule: getMLRuleParams({
          rule_id: 'import-type-ml',
          enabled: false,
        }),
      },
    ] as const;

    for (const { type, rule } of cases) {
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

        expect(body.type).toBe(type);
        expect(body.rule_id).toBe(rule.rule_id);
        expect(body.enabled).toBe(false);
      });
    }
  });
};
