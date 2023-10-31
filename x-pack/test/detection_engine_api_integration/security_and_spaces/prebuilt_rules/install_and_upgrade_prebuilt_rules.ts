/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  deleteAllRules,
  deleteAllTimelines,
  deleteRule,
  getPrebuiltRulesAndTimelinesStatus,
} from '../../utils';
import {
  createHistoricalPrebuiltRuleAssetSavedObjects,
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
} from '../../utils/prebuilt_rules/create_prebuilt_rule_saved_objects';
import { deleteAllPrebuiltRuleAssets } from '../../utils/prebuilt_rules/delete_all_prebuilt_rule_assets';
import { installPrebuiltRulesAndTimelines } from '../../utils/prebuilt_rules/install_prebuilt_rules_and_timelines';
import { installPrebuiltRules } from '../../utils/prebuilt_rules/install_prebuilt_rules';
import { getPrebuiltRulesStatus } from '../../utils/prebuilt_rules/get_prebuilt_rules_status';
import { upgradePrebuiltRules } from '../../utils/prebuilt_rules/upgrade_prebuilt_rules';
import { getInstalledRules } from '../../utils/prebuilt_rules/get_installed_rules';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('install and upgrade prebuilt rules with mock rule assets', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es);
      await deleteAllPrebuiltRuleAssets(es);
    });

    describe(`rule package without historical versions`, () => {
      const getRuleAssetSavedObjects = () => [
        createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
        createRuleAssetSavedObject({ rule_id: 'rule-2', version: 2 }),
        createRuleAssetSavedObject({ rule_id: 'rule-3', version: 3 }),
        createRuleAssetSavedObject({ rule_id: 'rule-4', version: 4 }),
      ];
      const RULES_COUNT = 4;

      describe('using legacy endpoint', () => {
        it('should install prebuilt rules', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          const body = await installPrebuiltRulesAndTimelines(es, supertest);

          expect(body.rules_installed).toBe(RULES_COUNT);
          expect(body.rules_updated).toBe(0);
        });

        it('should install correct prebuilt rule versions', async () => {
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

        it('should install missing prebuilt rules', async () => {
          // Install all prebuilt detection rules
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Delete one of the installed rules
          await deleteRule(supertest, 'rule-1');

          // Check that one prebuilt rule is missing
          const statusResponse = await getPrebuiltRulesAndTimelinesStatus(supertest);
          expect(statusResponse.rules_not_installed).toBe(1);

          // Call the install prebuilt rules again and check that the missing rule was installed
          const response = await installPrebuiltRulesAndTimelines(es, supertest);
          expect(response.rules_installed).toBe(1);
          expect(response.rules_updated).toBe(0);
        });

        it('should update outdated prebuilt rules', async () => {
          // Install all prebuilt detection rules
          const ruleAssetSavedObjects = getRuleAssetSavedObjects();
          await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Clear previous rule assets
          await deleteAllPrebuiltRuleAssets(es);
          // Increment the version of one of the installed rules and create the new rule assets
          ruleAssetSavedObjects[0]['security-rule'].version += 1;
          await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);

          // Check that one prebuilt rule status shows that one rule is outdated
          const statusResponse = await getPrebuiltRulesAndTimelinesStatus(supertest);
          expect(statusResponse.rules_not_updated).toBe(1);

          // Call the install prebuilt rules again and check that the outdated rule was updated
          const response = await installPrebuiltRulesAndTimelines(es, supertest);
          expect(response.rules_installed).toBe(0);
          expect(response.rules_updated).toBe(1);
        });

        it('should not install prebuilt rules if they are up to date', async () => {
          // Install all prebuilt detection rules
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Check that all prebuilt rules were installed
          const statusResponse = await getPrebuiltRulesAndTimelinesStatus(supertest);
          expect(statusResponse.rules_not_installed).toBe(0);
          expect(statusResponse.rules_not_updated).toBe(0);

          // Call the install prebuilt rules again and check that no rules were installed
          const response = await installPrebuiltRulesAndTimelines(es, supertest);
          expect(response.rules_installed).toBe(0);
          expect(response.rules_updated).toBe(0);
        });
      });

      describe('using current endpoint', () => {
        it('should install prebuilt rules', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          const body = await installPrebuiltRules(es, supertest);

          expect(body.summary.succeeded).toBe(RULES_COUNT);
          expect(body.summary.failed).toBe(0);
          expect(body.summary.skipped).toBe(0);
        });

        it('should install correct prebuilt rule versions', async () => {
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

        it('should install missing prebuilt rules', async () => {
          // Install all prebuilt detection rules
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Delete one of the installed rules
          await deleteRule(supertest, 'rule-1');

          // Check that one prebuilt rule is missing
          const statusResponse = await getPrebuiltRulesStatus(supertest);
          expect(statusResponse.stats.num_prebuilt_rules_to_install).toBe(1);

          // Call the install prebuilt rules again and check that the missing rule was installed
          const response = await installPrebuiltRules(es, supertest);
          expect(response.summary.succeeded).toBe(1);
        });

        it('should update outdated prebuilt rules', async () => {
          // Install all prebuilt detection rules
          const ruleAssetSavedObjects = getRuleAssetSavedObjects();
          await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);
          await installPrebuiltRules(es, supertest);

          // Clear previous rule assets
          await deleteAllPrebuiltRuleAssets(es);
          // Increment the version of one of the installed rules and create the new rule assets
          ruleAssetSavedObjects[0]['security-rule'].version += 1;
          await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);

          // Check that one prebuilt rule status shows that one rule is outdated
          const statusResponse = await getPrebuiltRulesStatus(supertest);
          expect(statusResponse.stats.num_prebuilt_rules_to_install).toBe(0);
          expect(statusResponse.stats.num_prebuilt_rules_to_upgrade).toBe(1);

          // Call the install prebuilt rules again and check that the outdated rule was updated
          const response = await upgradePrebuiltRules(es, supertest);
          expect(response.summary.succeeded).toBe(1);
          expect(response.summary.skipped).toBe(0);
        });

        it('should not install prebuilt rules if they are up to date', async () => {
          // Install all prebuilt detection rules
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Check that all prebuilt rules were installed
          const statusResponse = await getPrebuiltRulesStatus(supertest);
          expect(statusResponse.stats.num_prebuilt_rules_to_install).toBe(0);
          expect(statusResponse.stats.num_prebuilt_rules_to_upgrade).toBe(0);

          // Call the install prebuilt rules again and check that no rules were installed
          const installResponse = await installPrebuiltRules(es, supertest);
          expect(installResponse.summary.succeeded).toBe(0);
          expect(installResponse.summary.skipped).toBe(0);

          // Call the upgrade prebuilt rules endpoint and check that no rules were updated
          const upgradeResponse = await upgradePrebuiltRules(es, supertest);
          expect(upgradeResponse.summary.succeeded).toBe(0);
          expect(upgradeResponse.summary.skipped).toBe(0);
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

      describe('using legacy endpoint', () => {
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
          const statusResponse = await getPrebuiltRulesAndTimelinesStatus(supertest);
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
          const statusResponse = await getPrebuiltRulesAndTimelinesStatus(supertest);
          expect(statusResponse.rules_not_installed).toBe(1);

          // Call the install prebuilt rules endpoint again and check that the missing rule was installed
          const response = await installPrebuiltRulesAndTimelines(es, supertest);
          expect(response.rules_installed).toBe(1);
          expect(response.rules_updated).toBe(0);
        });

        it('should update outdated prebuilt rules when previous historical versions available', async () => {
          // Install all prebuilt detection rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Add a new version of one of the installed rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({ rule_id: 'rule-1', version: 3 }),
          ]);

          // Check that one prebuilt rule status shows that one rule is outdated
          const statusResponse = await getPrebuiltRulesAndTimelinesStatus(supertest);
          expect(statusResponse.rules_not_updated).toBe(1);

          // Call the install prebuilt rules again and check that the outdated rule was updated
          const response = await installPrebuiltRulesAndTimelines(es, supertest);
          expect(response.rules_installed).toBe(0);
          expect(response.rules_updated).toBe(1);

          const _statusResponse = await getPrebuiltRulesAndTimelinesStatus(supertest);
          expect(_statusResponse.rules_not_installed).toBe(0);
          expect(_statusResponse.rules_not_updated).toBe(0);
        });

        it('should update outdated prebuilt rules when previous historical versions unavailable', async () => {
          // Install all prebuilt detection rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRulesAndTimelines(es, supertest);

          // Clear previous rule assets
          await deleteAllPrebuiltRuleAssets(es);

          // Add a new rule version
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({ rule_id: 'rule-1', version: 3 }),
          ]);

          // Check that one prebuilt rule status shows that one rule is outdated
          const statusResponse = await getPrebuiltRulesAndTimelinesStatus(supertest);
          expect(statusResponse.rules_not_updated).toBe(1);
          expect(statusResponse.rules_not_installed).toBe(0);

          // Call the install prebuilt rules again and check that the outdated rule was updated
          const response = await installPrebuiltRulesAndTimelines(es, supertest);
          expect(response.rules_installed).toBe(0);
          expect(response.rules_updated).toBe(1);

          const _statusResponse = await getPrebuiltRulesAndTimelinesStatus(supertest);
          expect(_statusResponse.rules_not_updated).toBe(0);
          expect(_statusResponse.rules_not_installed).toBe(0);
        });
      });

      describe('using current endpoint', () => {
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
          const statusResponse = await getPrebuiltRulesStatus(supertest);
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
          const statusResponse = await getPrebuiltRulesStatus(supertest);
          expect(statusResponse.stats.num_prebuilt_rules_to_install).toBe(1);

          // Call the install prebuilt rules endpoint again and check that the missing rule was installed
          const response = await installPrebuiltRules(es, supertest);
          expect(response.summary.succeeded).toBe(1);
          expect(response.summary.total).toBe(1);
        });

        it('should update outdated prebuilt rules when previous historical versions available', async () => {
          // Install all prebuilt detection rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Add a new version of one of the installed rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({ rule_id: 'rule-1', version: 3 }),
          ]);

          // Check that the prebuilt rule status shows that one rule is outdated
          const statusResponse = await getPrebuiltRulesStatus(supertest);
          expect(statusResponse.stats.num_prebuilt_rules_to_upgrade).toBe(1);

          // Call the upgrade prebuilt rules endpoint and check that the outdated rule was updated
          const response = await upgradePrebuiltRules(es, supertest);
          expect(response.summary.succeeded).toBe(1);
          expect(response.summary.total).toBe(1);

          const status = await getPrebuiltRulesStatus(supertest);
          expect(status.stats.num_prebuilt_rules_to_install).toBe(0);
          expect(status.stats.num_prebuilt_rules_to_upgrade).toBe(0);
        });

        it('should update outdated prebuilt rules when previous historical versions unavailable', async () => {
          // Install all prebuilt detection rules
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Clear previous rule assets
          await deleteAllPrebuiltRuleAssets(es);

          // Add a new rule version
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({ rule_id: 'rule-1', version: 3 }),
          ]);

          // Check that the prebuilt rule status shows that one rule is outdated
          const statusResponse = await getPrebuiltRulesStatus(supertest);
          expect(statusResponse.stats.num_prebuilt_rules_to_upgrade).toBe(1);
          expect(statusResponse.stats.num_prebuilt_rules_to_install).toBe(0);

          // Call the upgrade prebuilt rules endpoint and check that the outdated rule was updated
          const response = await upgradePrebuiltRules(es, supertest);
          expect(response.summary.succeeded).toBe(1);
          expect(response.summary.total).toBe(1);

          const status = await getPrebuiltRulesStatus(supertest);
          expect(status.stats.num_prebuilt_rules_to_install).toBe(0);
          expect(status.stats.num_prebuilt_rules_to_upgrade).toBe(0);
        });
      });
    });
  });
};
