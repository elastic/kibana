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
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  deletePrebuiltRulesFleetPackage,
  fetchRule,
  getCustomQueryRuleParams,
  getInstalledRules,
  getPrebuiltRulesAndTimelinesStatus,
  installPrebuiltRules,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');
  const retryService = getService('retry');

  const importRules = async (rules: unknown[], overwrite?: boolean) => {
    const buffer = Buffer.from(combineArrayToNdJson(rules));

    return securitySolutionApi
      .importRules({
        query: { overwrite },
      })
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
      it('imports a rule with overwrite flag set to true', async () => {
        await installPrebuiltRules(es, supertest);
        const rule = getCustomQueryRuleParams({ rule_id: prebuiltRuleIds[0], version: 1 });
        const { body } = await importRules([rule], true);

        expect(body).toMatchObject({
          rules_count: 1,
          success: true,
          success_count: 1,
          errors: [],
        });
      });

      it('rejects a rule with an existing rule_id when overwrite flag set to false', async () => {
        await installPrebuiltRules(es, supertest);
        const rule = getCustomQueryRuleParams({ rule_id: prebuiltRuleIds[0], version: 1 });
        const { body } = await importRules([rule]);

        expect(body.errors).toHaveLength(1);
        expect(body.errors[0]).toMatchObject({
          error: {
            message: `rule_id: \"rule-1\" already exists`,
            status_code: 409,
          },
        });
      });

      it('imports a custom rule with a matching prebuilt rule_id and version', async () => {
        const rule = getCustomQueryRuleParams({
          rule_id: prebuiltRules[0].rule_id,
          version: prebuiltRules[0].version,
        });
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
          rule_source: { type: 'external' },
          immutable: true,
        });
      });

      it('imports a custom rule with a matching custom rule_id and version', async () => {
        const customRuleId = 'custom-rule-id';
        await securitySolutionApi
          .createRule({ body: getCustomQueryRuleParams({ rule_id: customRuleId, version: 1 }) })
          .expect(200);

        const rule = getCustomQueryRuleParams({
          rule_id: customRuleId,
          version: 1,
        });
        const { body } = await importRules([rule], true);

        expect(body).toMatchObject({
          rules_count: 1,
          success: true,
          success_count: 1,
          errors: [],
        });

        const importedRule = await fetchRule(supertest, { ruleId: customRuleId });
        expect(importedRule).toMatchObject({
          rule_id: customRuleId,
          version: 1,
          rule_source: { type: 'internal' },
          immutable: false,
        });
      });

      it('imports a new custom rule missing a version field', async () => {
        const rule = getCustomQueryRuleParams({ rule_id: 'custom-rule', version: undefined });
        const { body } = await importRules([rule], true);

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

      it('imports an existing custom rule missing a version field', async () => {
        await securitySolutionApi
          .createRule({ body: getCustomQueryRuleParams({ rule_id: 'custom-rule', version: 23 }) })
          .expect(200);

        const rule = getCustomQueryRuleParams({ rule_id: 'custom-rule', version: undefined });
        const { body } = await importRules([rule], true);

        expect(body).toMatchObject({
          rules_count: 1,
          success: true,
          success_count: 1,
          errors: [],
        });

        const importedRule = await fetchRule(supertest, { ruleId: 'custom-rule' });
        expect(importedRule).toMatchObject({
          rule_id: 'custom-rule',
          version: 1,
          rule_source: { type: 'internal' },
          immutable: false,
        });
      });

      it('imports a prebuilt rule with a non-existing rule_id', async () => {
        const rule = createRuleAssetSavedObject({ rule_id: 'wacky-rule-id', version: 1234 })[
          'security-rule'
        ];
        const { body } = await importRules([rule]);

        expect(body).toMatchObject({
          rules_count: 1,
          success: true,
          success_count: 1,
          errors: [],
        });

        const importedRule = await fetchRule(supertest, { ruleId: 'wacky-rule-id' });
        expect(importedRule).toMatchObject({
          rule_id: 'wacky-rule-id',
          version: 1234,
          rule_source: { type: 'internal' },
          immutable: false,
        });
      });

      it('rejects a versionless prebuilt rule', async () => {
        const rule = getCustomQueryRuleParams({ rule_id: prebuiltRuleIds[0], version: undefined }); // Uses the `getCustomQueryRuleParams` util intead of the `createRuleAssetSavedObject` util because we are forcing an invalid rule body according to the Zod schema
        const { body } = await importRules([rule]);

        expect(body.errors).toHaveLength(1);
        expect(body.errors[0]).toMatchObject({
          error: {
            message: `Prebuilt rules must specify a "version" to be imported. [rule_id: ${prebuiltRuleIds[0]}]`,
            status_code: 400,
          },
        });
      });

      it('rejects a prebuilt rule without a rule_id', async () => {
        const rule = getCustomQueryRuleParams({ rule_id: undefined, version: 1 });
        const { body } = await importRules([rule]);

        expect(body.errors).toHaveLength(1);
        expect(body.errors[0]).toMatchObject({
          error: {
            message: `rule_id: Required`,
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
          rule_source: { type: 'external', is_customized: false },
          immutable: true,
        });
      });

      it('imports a combination of prebuilt and custom rules', async () => {
        const rules = [
          getCustomQueryRuleParams({ rule_id: 'custom-rule', version: 23 }),
          getCustomQueryRuleParams({ rule_id: 'custom-rule-2', version: undefined }),
          // Unmodified prebuilt rule with matching rule_id and version
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 2 })['security-rule'],
          // Customized prebuilt rule with a matching rule_id and version
          createRuleAssetSavedObject({
            rule_id: 'rule-1',
            version: 2,
            name: 'Customized prebuilt rule',
          })['security-rule'],
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
              rule_id: 'custom-rule-2',
              version: 1,
              rule_source: { type: 'internal' },
              immutable: false,
            }),
            expect.objectContaining({
              rule_id: 'rule-1',
              version: 2,
              rule_source: { type: 'external', is_customized: true },
              immutable: true,
            }),
            expect.objectContaining({
              rule_id: 'rule-2',
              version: 2,
              rule_source: { type: 'external', is_customized: false },
              immutable: true,
            }),
          ])
        );
      });

      // TODO: Fix the test setup https://github.com/elastic/kibana/pull/206893#discussion_r1966170712
      it.skip('imports prebuilt rules when the rules package is not installed', async () => {
        await deletePrebuiltRulesFleetPackage({ supertest, es, log, retryService }); // First we delete the rule package

        const { body } = await importRules([prebuiltRules[0]]); // Then we import a rule which should cause the rule package to be redownloaded

        expect(body).toMatchObject({
          rules_count: 1,
          success: true,
          success_count: 1,
          errors: [],
        });

        const status = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
        expect(status.rules_installed).toEqual(1); // The rule package is now redownloaded and recognizes the rule_id as an installed rule
      });
    });
  });
};
