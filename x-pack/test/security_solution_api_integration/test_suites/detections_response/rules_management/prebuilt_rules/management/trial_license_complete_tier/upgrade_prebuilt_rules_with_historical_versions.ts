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
  installPrebuiltRulesAndTimelines,
  getPrebuiltRulesAndTimelinesStatus,
  createHistoricalPrebuiltRuleAssetSavedObjects,
  getPrebuiltRulesStatus,
  installPrebuiltRules,
  upgradePrebuiltRules,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI upgrade prebuilt rules from package with historical versions with mock rule assets', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    describe(`rule package with historical versions`, () => {
      const getRuleAssetSavedObjects = () => [
        createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
        createRuleAssetSavedObject({ rule_id: 'rule-1', version: 2 }),
        createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1 }),
        createRuleAssetSavedObject({ rule_id: 'rule-2', version: 2 }),
        createRuleAssetSavedObject({ rule_id: 'rule-2', version: 3 }),
      ];

      describe('using legacy endpoint', () => {
        it('should upgrade outdated prebuilt rules when previous historical versions available', async () => {
          // Install all prebuilt detection rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Add a new version of one of the installed rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({ rule_id: 'rule-1', version: 3 }),
          ]);

          // Check that one prebuilt rule status shows that one rule is outdated
          const statusResponse = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
          expect(statusResponse.rules_not_updated).toBe(1);

          // Call the install prebuilt rules again and check that the outdated rule was updated
          const response = await installPrebuiltRulesAndTimelines(es, supertest);
          expect(response.rules_installed).toBe(0);
          expect(response.rules_updated).toBe(1);

          const _statusResponse = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
          expect(_statusResponse.rules_not_installed).toBe(0);
          expect(_statusResponse.rules_not_updated).toBe(0);
        });

        it('should upgrade outdated prebuilt rules when previous historical versions unavailable', async () => {
          // Install all prebuilt detection rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Clear previous rule assets
          await deleteAllPrebuiltRuleAssets(es, log);

          // Add a new rule version
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({ rule_id: 'rule-1', version: 3 }),
          ]);

          // Check that one prebuilt rule status shows that one rule is outdated
          const statusResponse = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
          expect(statusResponse.rules_not_updated).toBe(1);
          expect(statusResponse.rules_not_installed).toBe(0);

          // Call the install prebuilt rules again and check that the outdated rule was updated
          const response = await installPrebuiltRulesAndTimelines(es, supertest);
          expect(response.rules_installed).toBe(0);
          expect(response.rules_updated).toBe(1);

          const _statusResponse = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
          expect(_statusResponse.rules_not_updated).toBe(0);
          expect(_statusResponse.rules_not_installed).toBe(0);
        });
      });

      describe('using current endpoint', () => {
        it('should upgrade outdated prebuilt rules when previous historical versions available', async () => {
          // Install all prebuilt detection rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Add a new version of one of the installed rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({ rule_id: 'rule-1', version: 3 }),
          ]);

          // Check that the prebuilt rule status shows that one rule is outdated
          const statusResponse = await getPrebuiltRulesStatus(es, supertest);
          expect(statusResponse.stats.num_prebuilt_rules_to_upgrade).toBe(1);

          // Call the upgrade prebuilt rules endpoint and check that the outdated rule was updated
          const response = await upgradePrebuiltRules(es, supertest);
          expect(response.summary.succeeded).toBe(1);
          expect(response.summary.total).toBe(1);

          const status = await getPrebuiltRulesStatus(es, supertest);
          expect(status.stats.num_prebuilt_rules_to_install).toBe(0);
          expect(status.stats.num_prebuilt_rules_to_upgrade).toBe(0);
        });

        it('should upgrade outdated prebuilt rules when previous historical versions unavailable', async () => {
          // Install all prebuilt detection rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Clear previous rule assets
          await deleteAllPrebuiltRuleAssets(es, log);

          // Add a new rule version
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({ rule_id: 'rule-1', version: 3 }),
          ]);

          // Check that the prebuilt rule status shows that one rule is outdated
          const statusResponse = await getPrebuiltRulesStatus(es, supertest);
          expect(statusResponse.stats.num_prebuilt_rules_to_upgrade).toBe(1);
          expect(statusResponse.stats.num_prebuilt_rules_to_install).toBe(0);

          // Call the upgrade prebuilt rules endpoint and check that the outdated rule was updated
          const response = await upgradePrebuiltRules(es, supertest);
          expect(response.summary.succeeded).toBe(1);
          expect(response.summary.total).toBe(1);

          const status = await getPrebuiltRulesStatus(es, supertest);
          expect(status.stats.num_prebuilt_rules_to_install).toBe(0);
          expect(status.stats.num_prebuilt_rules_to_upgrade).toBe(0);
        });
      });
    });
  });
};
