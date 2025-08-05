/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllTimelines,
  deleteAllPrebuiltRuleAssets,
  createRuleAssetSavedObject,
  createPrebuiltRuleAssetSavedObjects,
  installPrebuiltRulesAndTimelines,
  getPrebuiltRulesAndTimelinesStatus,
  createHistoricalPrebuiltRuleAssetSavedObjects,
  getPrebuiltRulesStatus,
  installPrebuiltRules,
  getInstalledRules,
} from '../../../../utils';
import { deleteAllRules, deleteRule } from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');

  describe('@ess @serverless @skipInServerlessMKI Install from mocked prebuilt rule assets', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    describe('without historical versions', () => {
      const getRuleAssetSavedObjects = () => [
        createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
        createRuleAssetSavedObject({ rule_id: 'rule-2', version: 2 }),
        createRuleAssetSavedObject({ rule_id: 'rule-3', version: 3 }),
        createRuleAssetSavedObject({ rule_id: 'rule-4', version: 4 }),
      ];
      const RULES_COUNT = getRuleAssetSavedObjects().length;

      it('installs prebuilt rules', async () => {
        await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        const body = await installPrebuiltRules(es, supertest);

        expect(body.summary.succeeded).toBe(RULES_COUNT);
        expect(body.summary.failed).toBe(0);
        expect(body.summary.skipped).toBe(0);
      });

      it('installs correct prebuilt rule versions', async () => {
        await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        const body = await installPrebuiltRules(es, supertest);

        // Check that all prebuilt rules were actually installed and their versions match the latest
        expect(body.results.created).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ rule_id: 'rule-1', version: 1 }),
            expect.objectContaining({ rule_id: 'rule-2', version: 2 }),
            expect.objectContaining({ rule_id: 'rule-3', version: 3 }),
            expect.objectContaining({ rule_id: 'rule-4', version: 4 }),
          ])
        );
      });

      it('installs missing prebuilt rules', async () => {
        // Install all prebuilt detection rules
        await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        // Delete one of the installed rules
        await deleteRule(supertest, 'rule-1');

        // Check that one prebuilt rule is missing
        const statusResponse = await getPrebuiltRulesStatus(es, supertest);
        expect(statusResponse.stats.num_prebuilt_rules_to_install).toBe(1);

        // Call the install prebuilt rules again and check that the missing rule was installed
        const response = await installPrebuiltRules(es, supertest);
        expect(response.summary.succeeded).toBe(1);
      });

      describe('legacy (PUT /api/detection_engine/rules/prepackaged)', () => {
        it('installs prebuilt rules', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          const body = await installPrebuiltRulesAndTimelines(es, supertest);

          expect(body.rules_installed).toBe(RULES_COUNT);
          expect(body.rules_updated).toBe(0);
        });

        it('installs correct prebuilt rule versions', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Get installed rules
          const rulesResponse = await getInstalledRules(supertest);

          // Check that all prebuilt rules were actually installed and their versions match the latest
          expect(rulesResponse.total).toBe(RULES_COUNT);
          expect(rulesResponse.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ rule_id: 'rule-1', version: 1 }),
              expect.objectContaining({ rule_id: 'rule-2', version: 2 }),
              expect.objectContaining({ rule_id: 'rule-3', version: 3 }),
              expect.objectContaining({ rule_id: 'rule-4', version: 4 }),
            ])
          );
        });

        it('installs missing prebuilt rules', async () => {
          // Install all prebuilt detection rules
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Delete one of the installed rules
          await deleteRule(supertest, 'rule-1');

          // Check that one prebuilt rule is missing
          const statusResponse = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
          expect(statusResponse.rules_not_installed).toBe(1);

          // Call the install prebuilt rules again and check that the missing rule was installed
          const response = await installPrebuiltRulesAndTimelines(es, supertest);
          expect(response.rules_installed).toBe(1);
          expect(response.rules_updated).toBe(0);
        });
      });
    });

    describe('with historical versions', () => {
      const getRuleAssetSavedObjects = () => [
        createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
        createRuleAssetSavedObject({ rule_id: 'rule-1', version: 2 }),
        createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1 }),
        createRuleAssetSavedObject({ rule_id: 'rule-2', version: 2 }),
        createRuleAssetSavedObject({ rule_id: 'rule-2', version: 3 }),
      ];
      const RULES_COUNT = 2;

      it('should install prebuilt rules', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        const body = await installPrebuiltRules(es, supertest);

        expect(body.summary.succeeded).toBe(RULES_COUNT);
      });

      it('should install correct prebuilt rule versions', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        const response = await installPrebuiltRules(es, supertest);

        // Check that all prebuilt rules were actually installed and their versions match the latest
        expect(response.summary.succeeded).toBe(RULES_COUNT);
        expect(response.results.created).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ rule_id: 'rule-1', version: 2 }),
            expect.objectContaining({ rule_id: 'rule-2', version: 3 }),
          ])
        );
      });

      it('should not install prebuilt rules if they are up to date', async () => {
        // Install all prebuilt detection rules
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        // Check that all prebuilt rules were installed
        const statusResponse = await getPrebuiltRulesStatus(es, supertest);
        expect(statusResponse.stats.num_prebuilt_rules_to_install).toBe(0);

        // Call the install prebuilt rules again and check that no rules were installed
        const response = await installPrebuiltRules(es, supertest);
        expect(response.summary.succeeded).toBe(0);
        expect(response.summary.total).toBe(0);
      });

      it('should install missing prebuilt rules', async () => {
        // Install all prebuilt detection rules
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        // Delete one of the installed rules
        await deleteRule(supertest, 'rule-1');

        // Check that one prebuilt rule is missing
        const statusResponse = await getPrebuiltRulesStatus(es, supertest);
        expect(statusResponse.stats.num_prebuilt_rules_to_install).toBe(1);

        // Call the install prebuilt rules endpoint again and check that the missing rule was installed
        const response = await installPrebuiltRules(es, supertest);
        expect(response.summary.succeeded).toBe(1);
        expect(response.summary.total).toBe(1);
      });

      it('should NOT overwrite existing actions', async () => {
        // Install prebuilt detection rule
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
        ]);
        await installPrebuiltRulesAndTimelines(es, supertest);

        await securitySolutionApi
          .patchRule({
            body: {
              rule_id: 'rule-1',
              actions: [
                // use a pre-configured connector
                {
                  group: 'default',
                  id: 'my-test-email',
                  action_type_id: '.email',
                  params: {},
                },
              ],
            },
          })
          .expect(200);

        // Install new rule version
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 2 }),
        ]);

        // Install/update prebuilt rules again
        const response = await installPrebuiltRulesAndTimelines(es, supertest);
        expect(response.rules_installed).toBe(0);
        expect(response.rules_updated).toBe(1);

        const { body: prebuiltRule } = await securitySolutionApi.readRule({
          query: { rule_id: 'rule-1' },
        });

        // Check the actions field of existing prebuilt rules is not overwritten
        expect(prebuiltRule.actions).toEqual([
          expect.objectContaining({
            action_type_id: '.email',
            frequency: { notifyWhen: 'onActiveAlert', summary: true, throttle: null },
            group: 'default',
            id: 'my-test-email',
            params: {},
          }),
        ]);
      });

      it('should NOT overwrite existing exceptions lists', async () => {
        // Install prebuilt detection rule
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
        ]);
        await installPrebuiltRulesAndTimelines(es, supertest);

        await securitySolutionApi
          .patchRule({
            body: {
              rule_id: 'rule-1',
              exceptions_list: [
                {
                  id: 'some_uuid',
                  list_id: 'list_id_single',
                  namespace_type: 'single',
                  type: 'detection',
                },
              ],
            },
          })
          .expect(200);

        // Install new rule version
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 2 }),
        ]);

        // Install/update prebuilt rules again
        const response = await installPrebuiltRulesAndTimelines(es, supertest);
        expect(response.rules_installed).toBe(0);
        expect(response.rules_updated).toBe(1);

        const { body: prebuiltRule } = await securitySolutionApi.readRule({
          query: { rule_id: 'rule-1' },
        });

        // Check the exceptions_list field of existing prebuilt rules is not overwritten
        expect(prebuiltRule.exceptions_list).toEqual([
          expect.objectContaining({
            id: 'some_uuid',
            list_id: 'list_id_single',
            namespace_type: 'single',
            type: 'detection',
          }),
        ]);
      });

      describe('legacy (PUT /api/detection_engine/rules/prepackaged)', () => {
        it('should install prebuilt rules', async () => {
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          const body = await installPrebuiltRulesAndTimelines(es, supertest);

          expect(body.rules_installed).toBe(RULES_COUNT);
          expect(body.rules_updated).toBe(0);
        });

        it('should install correct prebuilt rule versions', async () => {
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Get installed rules
          const rulesResponse = await getInstalledRules(supertest);

          // Check that all prebuilt rules were actually installed and their versions match the latest
          expect(rulesResponse.total).toBe(RULES_COUNT);
          expect(rulesResponse.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ rule_id: 'rule-1', version: 2 }),
              expect.objectContaining({ rule_id: 'rule-2', version: 3 }),
            ])
          );
        });

        it('should not install prebuilt rules if they are up to date', async () => {
          // Install all prebuilt detection rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Check that all prebuilt rules were installed
          const statusResponse = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
          expect(statusResponse.rules_not_installed).toBe(0);

          // Call the install prebuilt rules again and check that no rules were installed
          const response = await installPrebuiltRulesAndTimelines(es, supertest);
          expect(response.rules_installed).toBe(0);
          expect(response.rules_updated).toBe(0);
        });

        it('should install missing prebuilt rules', async () => {
          // Install all prebuilt detection rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Delete one of the installed rules
          await deleteRule(supertest, 'rule-1');

          // Check that one prebuilt rule is missing
          const statusResponse = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
          expect(statusResponse.rules_not_installed).toBe(1);

          // Call the install prebuilt rules endpoint again and check that the missing rule was installed
          const response = await installPrebuiltRulesAndTimelines(es, supertest);
          expect(response.rules_installed).toBe(1);
          expect(response.rules_updated).toBe(0);
        });
      });
    });
  });
};
