/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import {
  SAMPLE_PREBUILT_RULES_WITH_HISTORICAL_VERSIONS,
  combineArrayToNdJson,
  createHistoricalPrebuiltRuleAssetSavedObjects,
  deleteAllPrebuiltRuleAssets,
  fetchRule,
  getCustomQueryRuleParams,
  getInstalledRules,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');

  const importRules = async (rules: unknown[]) => {
    const buffer = Buffer.from(combineArrayToNdJson(rules));

    return securitySolutionApi
      .importRules({ query: {} })
      .attach('file', buffer, 'rules.ndjson')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(200);
  };

  const prebuiltRules = SAMPLE_PREBUILT_RULES_WITH_HISTORICAL_VERSIONS.map(
    (prebuiltRule) => prebuiltRule['security-rule']
  );
  const prebuiltRuleIds = [...new Set(prebuiltRules.map((rule) => rule.rule_id))];

  describe('@ess @serverless @skipInServerlessMKI import_rules', () => {
    before(async () => {
      await deleteAllPrebuiltRuleAssets(es, log);
      await createHistoricalPrebuiltRuleAssetSavedObjects(
        es,
        SAMPLE_PREBUILT_RULES_WITH_HISTORICAL_VERSIONS
      );
    });

    after(async () => {
      await deleteAllPrebuiltRuleAssets(es, log);
      await deleteAllRules(supertest, log);
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    describe('calculation of rule customization fields', () => {
      it('defaults a versionless custom rule to "version: 1"', async () => {
        const rule = getCustomQueryRuleParams({ rule_id: 'custom-rule', version: undefined });
        const { body } = await importRules([rule]);

        expect(body).toMatchObject({
          rules_count: 1,
          success: true,
          success_count: 1,
          errors: [],
        });

        const importedRule = await fetchRule(supertest, { ruleId: rule.rule_id! });
        expect(importedRule).toMatchObject({
          rule_id: rule.rule_id,
          version: 1,
          rule_source: { type: 'internal' },
          immutable: false,
        });
      });

      it('preserves a custom rule with a specified version', async () => {
        const rule = getCustomQueryRuleParams({ rule_id: 'custom-rule', version: 23 });
        const { body } = await importRules([rule]);

        expect(body).toMatchObject({
          rules_count: 1,
          success: true,
          success_count: 1,
          errors: [],
        });

        const importedRule = await fetchRule(supertest, { ruleId: rule.rule_id! });
        expect(importedRule).toMatchObject({
          rule_id: rule.rule_id,
          version: 23,
          rule_source: { type: 'internal' },
          immutable: false,
        });
      });

      it('rejects a versionless prebuilt rule', async () => {
        const rule = getCustomQueryRuleParams({ rule_id: prebuiltRuleIds[0], version: undefined });
        const { body } = await importRules([rule]);

        expect(body.errors).toHaveLength(1);
        expect(body.errors[0]).toMatchObject({
          error: {
            message: `Prebuilt rules must specify a "version" to be imported. [rule_id: ${prebuiltRuleIds[0]}]`,
            status_code: 400,
          },
        });
      });

      it('respects the version of a prebuilt rule', async () => {
        const rule = getCustomQueryRuleParams({ rule_id: prebuiltRuleIds[1], version: 9999 });
        const { body } = await importRules([rule]);

        expect(body).toMatchObject({
          rules_count: 1,
          success: true,
          success_count: 1,
          errors: [],
        });

        const importedRule = await fetchRule(supertest, { ruleId: rule.rule_id! });
        expect(importedRule).toMatchObject({
          rule_id: rule.rule_id,
          version: 9999,
          rule_source: { type: 'external', is_customized: true },
          immutable: true,
        });
      });

      it('imports a combination of prebuilt and custom rules', async () => {
        const rules = [
          getCustomQueryRuleParams({ rule_id: 'custom-rule', version: 23 }),
          getCustomQueryRuleParams({ rule_id: prebuiltRuleIds[0], version: 1234 }),
          getCustomQueryRuleParams({ rule_id: 'custom-rule-2', version: undefined }),
          prebuiltRules[3],
        ];
        const { body } = await importRules(rules);

        expect(body).toMatchObject({
          rules_count: 4,
          success: true,
          success_count: 4,
          errors: [],
        });

        const { data: importedRules } = await getInstalledRules(supertest);

        expect(importedRules).toHaveLength(4);
        expect(importedRules).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: 'custom-rule',
              version: 23,
              rule_source: { type: 'internal' },
              immutable: false,
            }),
            expect.objectContaining({
              rule_id: prebuiltRuleIds[0],
              version: 1234,
              rule_source: { type: 'external', is_customized: true },
              immutable: true,
            }),
            expect.objectContaining({
              rule_id: 'custom-rule-2',
              version: 1,
              rule_source: { type: 'internal' },
              immutable: false,
            }),
            expect.objectContaining({
              rule_id: prebuiltRules[3].rule_id,
              version: prebuiltRules[3].version,
              rule_source: { type: 'external', is_customized: false },
              immutable: true,
            }),
          ])
        );
      });
    });
  });
};
