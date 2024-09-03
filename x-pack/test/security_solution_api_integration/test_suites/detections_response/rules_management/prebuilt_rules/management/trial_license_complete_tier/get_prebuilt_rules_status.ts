/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllPrebuiltRuleAssets,
  getPrebuiltRulesStatus,
  getSimpleRule,
  createRuleAssetSavedObject,
  createPrebuiltRuleAssetSavedObjects,
  installPrebuiltRules,
  upgradePrebuiltRules,
  createHistoricalPrebuiltRuleAssetSavedObjects,
  getPrebuiltRulesAndTimelinesStatus,
  installPrebuiltRulesAndTimelines,
} from '../../../../utils';
import {
  deleteAllRules,
  createRule,
  deleteRule,
} from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  // Failing: See https://github.com/elastic/kibana/issues/190960
  // Failing: See https://github.com/elastic/kibana/issues/190952
  describe.skip('@ess @serverless @skipInServerlessMKI Prebuilt Rules status', () => {
    describe('get_prebuilt_rules_status', () => {
      beforeEach(async () => {
        await deleteAllPrebuiltRuleAssets(es, log);
        await deleteAllRules(supertest, log);
      });

      it('should return empty structure when no prebuilt rule assets', async () => {
        const { stats } = await getPrebuiltRulesStatus(es, supertest);
        expect(stats).toMatchObject({
          num_prebuilt_rules_installed: 0,
          num_prebuilt_rules_to_install: 0,
          num_prebuilt_rules_to_upgrade: 0,
          num_prebuilt_rules_total_in_package: 0,
        });
      });

      it('should not update the prebuilt rule status when a custom rule is added', async () => {
        await createRule(supertest, log, getSimpleRule());

        const { stats } = await getPrebuiltRulesStatus(es, supertest);
        expect(stats).toMatchObject({
          num_prebuilt_rules_installed: 0,
          num_prebuilt_rules_to_install: 0,
          num_prebuilt_rules_to_upgrade: 0,
          num_prebuilt_rules_total_in_package: 0,
        });
      });

      describe(`rule package without historical versions`, () => {
        const getRuleAssetSavedObjects = () => [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 2 }),
          createRuleAssetSavedObject({ rule_id: 'rule-3', version: 3 }),
          createRuleAssetSavedObject({ rule_id: 'rule-4', version: 4 }),
        ];
        const RULES_COUNT = 4;

        it('should return the number of rules available to install', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          const { stats } = await getPrebuiltRulesStatus(es, supertest);
          expect(stats).toMatchObject({
            num_prebuilt_rules_installed: 0,
            num_prebuilt_rules_to_install: RULES_COUNT,
            num_prebuilt_rules_to_upgrade: 0,
            num_prebuilt_rules_total_in_package: RULES_COUNT,
          });
        });

        it('should return the number of installed prebuilt rules after installing them', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          const { stats } = await getPrebuiltRulesStatus(es, supertest);
          expect(stats).toMatchObject({
            num_prebuilt_rules_installed: RULES_COUNT,
            num_prebuilt_rules_to_install: 0,
            num_prebuilt_rules_to_upgrade: 0,
            num_prebuilt_rules_total_in_package: RULES_COUNT,
          });
        });

        it('should notify the user again that a rule is available for install after it is deleted', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);
          await deleteRule(supertest, 'rule-1');

          const { stats } = await getPrebuiltRulesStatus(es, supertest);
          expect(stats).toMatchObject({
            num_prebuilt_rules_installed: RULES_COUNT - 1,
            num_prebuilt_rules_to_install: 1,
            num_prebuilt_rules_to_upgrade: 0,
            num_prebuilt_rules_total_in_package: RULES_COUNT,
          });
        });

        it('should return available rule updates', async () => {
          const ruleAssetSavedObjects = getRuleAssetSavedObjects();
          await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);
          await installPrebuiltRules(es, supertest);

          // Clear previous rule assets
          await deleteAllPrebuiltRuleAssets(es, log);
          // Increment the version of one of the installed rules and create the new rule assets
          ruleAssetSavedObjects[0]['security-rule'].version += 1;
          await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);

          const { stats } = await getPrebuiltRulesStatus(es, supertest);
          expect(stats).toMatchObject({
            num_prebuilt_rules_installed: RULES_COUNT,
            num_prebuilt_rules_to_install: 0,
            num_prebuilt_rules_to_upgrade: 1,
            num_prebuilt_rules_total_in_package: RULES_COUNT,
          });
        });

        it('should not return any available update if rule has been successfully upgraded', async () => {
          const ruleAssetSavedObjects = getRuleAssetSavedObjects();
          await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);
          await installPrebuiltRules(es, supertest);

          // Clear previous rule assets
          await deleteAllPrebuiltRuleAssets(es, log);
          // Increment the version of one of the installed rules and create the new rule assets
          ruleAssetSavedObjects[0]['security-rule'].version += 1;
          await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);
          // Upgrade all rules
          await upgradePrebuiltRules(es, supertest);

          const { stats } = await getPrebuiltRulesStatus(es, supertest);
          expect(stats).toMatchObject({
            num_prebuilt_rules_installed: RULES_COUNT,
            num_prebuilt_rules_to_install: 0,
            num_prebuilt_rules_to_upgrade: 0,
            num_prebuilt_rules_total_in_package: RULES_COUNT,
          });
        });

        it('should not return any updates if none are available', async () => {
          const ruleAssetSavedObjects = getRuleAssetSavedObjects();
          await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);
          await installPrebuiltRules(es, supertest);

          // Clear previous rule assets
          await deleteAllPrebuiltRuleAssets(es, log);
          // Recreate the rules without bumping any versions
          await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);

          const { stats } = await getPrebuiltRulesStatus(es, supertest);
          expect(stats).toMatchObject({
            num_prebuilt_rules_installed: RULES_COUNT,
            num_prebuilt_rules_to_install: 0,
            num_prebuilt_rules_to_upgrade: 0,
            num_prebuilt_rules_total_in_package: RULES_COUNT,
          });
        });
      });

      describe(`rule package with historical versions`, () => {
        const getRuleAssetSavedObjects = () => [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 2 }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1 }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 2 }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 3 }),
        ];
        const RULES_COUNT = 2;

        it('should return the number of rules available to install', async () => {
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());

          const { stats } = await getPrebuiltRulesStatus(es, supertest);
          expect(stats).toMatchObject({
            num_prebuilt_rules_installed: 0,
            num_prebuilt_rules_to_install: RULES_COUNT,
            num_prebuilt_rules_to_upgrade: 0,
            num_prebuilt_rules_total_in_package: RULES_COUNT,
          });
        });

        it('should return the number of installed prebuilt rules after installing them', async () => {
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          const { stats } = await getPrebuiltRulesStatus(es, supertest);
          expect(stats).toMatchObject({
            num_prebuilt_rules_installed: RULES_COUNT,
            num_prebuilt_rules_to_install: 0,
            num_prebuilt_rules_to_upgrade: 0,
            num_prebuilt_rules_total_in_package: RULES_COUNT,
          });
        });

        it('should notify the user again that a rule is available for install after it is deleted', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);
          await deleteRule(supertest, 'rule-1');

          const { stats } = await getPrebuiltRulesStatus(es, supertest);
          expect(stats).toMatchObject({
            num_prebuilt_rules_installed: RULES_COUNT - 1,
            num_prebuilt_rules_to_install: 1,
            num_prebuilt_rules_to_upgrade: 0,
            num_prebuilt_rules_total_in_package: RULES_COUNT,
          });
        });

        it('should return available rule updates when previous historical versions available', async () => {
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Add a new version of one of the installed rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({ rule_id: 'rule-1', version: 3 }),
          ]);

          const { stats } = await getPrebuiltRulesStatus(es, supertest);
          expect(stats).toMatchObject({
            num_prebuilt_rules_installed: RULES_COUNT,
            num_prebuilt_rules_to_install: 0,
            num_prebuilt_rules_to_upgrade: 1,
            num_prebuilt_rules_total_in_package: RULES_COUNT,
          });
        });

        it('should return available rule updates when previous historical versions unavailable', async () => {
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Delete the previous versions of rule assets
          await deleteAllPrebuiltRuleAssets(es, log);

          // Add a new rule version
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({ rule_id: 'rule-1', version: 3 }),
          ]);

          const { stats } = await getPrebuiltRulesStatus(es, supertest);
          expect(stats).toMatchObject({
            num_prebuilt_rules_installed: RULES_COUNT,
            num_prebuilt_rules_to_install: 0,
            num_prebuilt_rules_to_upgrade: 1,
            // Two prebuilt rules have been installed, but only 1 rule asset
            // is made available after deleting the previous versions
            num_prebuilt_rules_total_in_package: 1,
          });
        });

        it('should not return available rule updates after rule has been upgraded', async () => {
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Delete the previous versions of rule assets
          await deleteAllPrebuiltRuleAssets(es, log);

          // Add a new rule version
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({ rule_id: 'rule-1', version: 3 }),
          ]);

          // Upgrade the rule
          await upgradePrebuiltRules(es, supertest);

          const { stats } = await getPrebuiltRulesStatus(es, supertest);
          expect(stats).toMatchObject({
            num_prebuilt_rules_installed: RULES_COUNT,
            num_prebuilt_rules_to_install: 0,
            num_prebuilt_rules_to_upgrade: 0,
            // Two prebuilt rules have been installed, but only 1 rule asset
            // is made available after deleting the previous versions
            num_prebuilt_rules_total_in_package: 1,
          });
        });
      });
    });

    describe('get_prebuilt_rules_status - legacy', () => {
      beforeEach(async () => {
        await deleteAllPrebuiltRuleAssets(es, log);
        await deleteAllRules(supertest, log);
      });

      it('should return empty structure when no rules package installed', async () => {
        const body = await getPrebuiltRulesAndTimelinesStatus(es, supertest);

        expect(body).toMatchObject({
          rules_custom_installed: 0,
          rules_installed: 0,
          rules_not_installed: 0,
          rules_not_updated: 0,
        });
      });

      it('should show that one custom rule is installed when a custom rule is added', async () => {
        await createRule(supertest, log, getSimpleRule());

        const body = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
        expect(body).toMatchObject({
          rules_custom_installed: 1,
          rules_installed: 0,
          rules_not_installed: 0,
          rules_not_updated: 0,
        });
      });

      describe(`rule package without historical versions`, () => {
        const getRuleAssetSavedObjects = () => [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 2 }),
          createRuleAssetSavedObject({ rule_id: 'rule-3', version: 3 }),
          createRuleAssetSavedObject({ rule_id: 'rule-4', version: 4 }),
        ];
        const RULES_COUNT = 4;

        it('should return the number of rules available to install', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          const body = await getPrebuiltRulesAndTimelinesStatus(es, supertest);

          expect(body).toMatchObject({
            rules_custom_installed: 0,
            rules_installed: 0,
            rules_not_installed: RULES_COUNT,
            rules_not_updated: 0,
          });
        });

        it('should return the number of installed prebuilt rules after installing them', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);

          const body = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
          expect(body).toMatchObject({
            rules_custom_installed: 0,
            rules_installed: RULES_COUNT,
            rules_not_installed: 0,
            rules_not_updated: 0,
          });
        });

        it('should notify the user again that a rule is available for install after it is deleted', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);
          await deleteRule(supertest, 'rule-1');

          const body = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
          expect(body).toMatchObject({
            rules_custom_installed: 0,
            rules_installed: RULES_COUNT - 1,
            rules_not_installed: 1,
            rules_not_updated: 0,
          });
        });

        it('should return available rule updates', async () => {
          const ruleAssetSavedObjects = getRuleAssetSavedObjects();
          await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Clear previous rule assets
          await deleteAllPrebuiltRuleAssets(es, log);
          // Increment the version of one of the installed rules and create the new rule assets
          ruleAssetSavedObjects[0]['security-rule'].version += 1;
          await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);

          const body = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
          expect(body).toMatchObject({
            rules_custom_installed: 0,
            rules_installed: RULES_COUNT,
            rules_not_installed: 0,
            rules_not_updated: 1,
          });
        });

        it('should not return any updates if none are available', async () => {
          const ruleAssetSavedObjects = getRuleAssetSavedObjects();
          await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Clear previous rule assets
          await deleteAllPrebuiltRuleAssets(es, log);
          // Recreate the rules without bumping any versions
          await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);

          const body = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
          expect(body).toMatchObject({
            rules_custom_installed: 0,
            rules_installed: RULES_COUNT,
            rules_not_installed: 0,
            rules_not_updated: 0,
          });
        });
      });

      describe(`rule package with historical versions`, () => {
        const getRuleAssetSavedObjects = () => [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 2 }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1 }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 2 }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 3 }),
        ];
        const RULES_COUNT = 2;

        it('should return the number of rules available to install', async () => {
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          const body = await getPrebuiltRulesAndTimelinesStatus(es, supertest);

          expect(body).toMatchObject({
            rules_custom_installed: 0,
            rules_installed: 0,
            rules_not_installed: RULES_COUNT,
            rules_not_updated: 0,
          });
        });

        it('should return the number of installed prebuilt rules after installing them', async () => {
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);

          const body = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
          expect(body).toMatchObject({
            rules_custom_installed: 0,
            rules_installed: RULES_COUNT,
            rules_not_installed: 0,
            rules_not_updated: 0,
          });
        });

        it('should notify the user again that a rule is available for install after it is deleted', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);
          await deleteRule(supertest, 'rule-1');

          const body = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
          expect(body).toMatchObject({
            rules_custom_installed: 0,
            rules_installed: RULES_COUNT - 1,
            rules_not_installed: 1,
            rules_not_updated: 0,
          });
        });

        it('should return available rule updates when previous historical versions available', async () => {
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Add a new version of one of the installed rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({ rule_id: 'rule-1', version: 3 }),
          ]);

          const body = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
          expect(body).toMatchObject({
            rules_custom_installed: 0,
            rules_installed: RULES_COUNT,
            rules_not_installed: 0,
            rules_not_updated: 1,
          });
        });

        it('should return available rule updates when previous historical versions unavailable', async () => {
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Delete the previous versions of rule assets
          await deleteAllPrebuiltRuleAssets(es, log);

          // Add a new rule version
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({ rule_id: 'rule-1', version: 3 }),
          ]);

          const body = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
          expect(body).toMatchObject({
            rules_custom_installed: 0,
            rules_installed: RULES_COUNT,
            rules_not_installed: 0,
            rules_not_updated: 1,
          });
        });
      });
    });
  });
};
