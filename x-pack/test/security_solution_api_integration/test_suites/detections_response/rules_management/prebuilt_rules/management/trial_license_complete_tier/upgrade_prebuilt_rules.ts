/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import { PRECONFIGURED_EMAIL_ACTION_CONNECTOR_ID } from '../../../../../../config/shared';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllTimelines,
  deleteAllPrebuiltRuleAssets,
  createRuleAssetSavedObject,
  createPrebuiltRuleAssetSavedObjects,
  installPrebuiltRulesAndTimelines,
  getPrebuiltRulesAndTimelinesStatus,
  getPrebuiltRulesStatus,
  installPrebuiltRules,
  upgradePrebuiltRules,
  fetchRule,
  patchRule,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI upgrade prebuilt rules from package without historical versions with mock rule assets', () => {
    const getRuleAssetSavedObjects = () => [
      createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
      createRuleAssetSavedObject({ rule_id: 'rule-2', version: 2 }),
      createRuleAssetSavedObject({ rule_id: 'rule-3', version: 3 }),
      createRuleAssetSavedObject({ rule_id: 'rule-4', version: 4 }),
    ];

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    describe('using legacy endpoint', () => {
      it('should upgrade outdated prebuilt rules', async () => {
        // Install all prebuilt detection rules
        const ruleAssetSavedObjects = getRuleAssetSavedObjects();
        await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);
        await installPrebuiltRulesAndTimelines(es, supertest);

        // Clear previous rule assets
        await deleteAllPrebuiltRuleAssets(es, log);
        // Increment the version of one of the installed rules and create the new rule assets
        ruleAssetSavedObjects[0]['security-rule'].version += 1;
        await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);

        // Check that one prebuilt rule status shows that one rule is outdated
        const statusResponse = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
        expect(statusResponse.rules_not_updated).toBe(1);

        // Call the install prebuilt rules again and check that the outdated rule was updated
        const response = await installPrebuiltRulesAndTimelines(es, supertest);
        expect(response.rules_installed).toBe(0);
        expect(response.rules_updated).toBe(1);
      });

      it('should not upgrade prebuilt rules if they are up to date', async () => {
        // Install all prebuilt detection rules
        await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRulesAndTimelines(es, supertest);

        // Check that all prebuilt rules were installed
        const statusResponse = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
        expect(statusResponse.rules_not_installed).toBe(0);
        expect(statusResponse.rules_not_updated).toBe(0);

        // Call the install prebuilt rules again and check that no rules were installed
        const response = await installPrebuiltRulesAndTimelines(es, supertest);
        expect(response.rules_installed).toBe(0);
        expect(response.rules_updated).toBe(0);
      });
    });

    describe('using current endpoint', () => {
      it('should upgrade outdated prebuilt rules', async () => {
        // Install all prebuilt detection rules
        const ruleAssetSavedObjects = getRuleAssetSavedObjects();
        await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);
        await installPrebuiltRules(es, supertest);

        // Clear previous rule assets
        await deleteAllPrebuiltRuleAssets(es, log);
        // Increment the version of one of the installed rules and create the new rule assets
        ruleAssetSavedObjects[0]['security-rule'].version += 1;
        await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);

        // Check that one prebuilt rule status shows that one rule is outdated
        const statusResponse = await getPrebuiltRulesStatus(es, supertest);
        expect(statusResponse.stats.num_prebuilt_rules_to_install).toBe(0);
        expect(statusResponse.stats.num_prebuilt_rules_to_upgrade).toBe(1);

        // Call the install prebuilt rules again and check that the outdated rule was updated
        const response = await upgradePrebuiltRules(es, supertest);
        expect(response.summary.succeeded).toBe(1);
        expect(response.summary.skipped).toBe(0);
      });

      it('should not upgrade prebuilt rules if they are up to date', async () => {
        // Install all prebuilt detection rules
        await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        // Check that all prebuilt rules were installed
        const statusResponse = await getPrebuiltRulesStatus(es, supertest);
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

      describe('when upgrading a prebuilt rule to a newer version with the same rule type', () => {
        it('preserves rule bound data', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({
              rule_id: 'rule-to-test-1',
              enabled: true,
              version: 1,
            }),
          ]);
          const firstInstallResponse = await installPrebuiltRules(es, supertest);
          const initialRuleSoId = firstInstallResponse.results.created[0].id;

          const actions = [
            // Use a preconfigured action connector to simplify the test and avoid action connector creation
            {
              id: PRECONFIGURED_EMAIL_ACTION_CONNECTOR_ID,
              action_type_id: '.email',
              group: 'default',
              params: {},
            },
          ];
          const exceptionsList = [
            {
              id: 'exception_list_1',
              list_id: 'exception_list_1',
              namespace_type: 'agnostic',
              type: 'rule_default',
            } as const,
          ];

          // Add some actions, exceptions list, and timeline reference
          await patchRule(supertest, log, {
            rule_id: 'rule-to-test-1',
            enabled: false,
            actions,
            exceptions_list: exceptionsList,
            timeline_id: 'some-timeline-id',
            timeline_title: 'Some timeline title',
          });

          // Clear previous rule assets
          await deleteAllPrebuiltRuleAssets(es, log);
          // Create a new version with the same rule type asset
          await createPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({
              rule_id: 'rule-to-test-1',
              enabled: true,
              version: 2,
            }),
          ]);

          // Upgrade to a newer version with the same type
          await upgradePrebuiltRules(es, supertest);

          expect(await fetchRule(supertest, { ruleId: 'rule-to-test-1' })).toMatchObject({
            id: initialRuleSoId,
            // If a user disabled the rule it's expected to stay disabled after upgrade
            enabled: false,
            actions,
            exceptions_list: exceptionsList,
            timeline_id: 'some-timeline-id',
            timeline_title: 'Some timeline title',
          });
        });
      });

      describe('when upgrading a prebuilt rule to a newer version with a different rule type', () => {
        it('preserves rule bound data', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({
              rule_id: 'rule-to-test-2',
              type: 'query',
              language: 'kuery',
              query: '*:*',
              enabled: true,
              version: 1,
            }),
          ]);
          const firstInstallResponse = await installPrebuiltRules(es, supertest);
          const initialRuleSoId = firstInstallResponse.results.created[0].id;

          const actions = [
            // Use a preconfigured action connector to simplify the test and avoid action connector creation
            {
              id: PRECONFIGURED_EMAIL_ACTION_CONNECTOR_ID,
              action_type_id: '.email',
              group: 'default',
              params: {},
            },
          ];
          const exceptionsList = [
            {
              id: 'exception_list_1',
              list_id: 'exception_list_1',
              namespace_type: 'agnostic',
              type: 'rule_default',
            } as const,
          ];

          // Add some actions, exceptions list, and timeline reference
          await patchRule(supertest, log, {
            rule_id: 'rule-to-test-2',
            enabled: false,
            actions,
            exceptions_list: exceptionsList,
            timeline_id: 'some-timeline-id',
            timeline_title: 'Some timeline title',
          });

          // Clear previous rule assets
          await deleteAllPrebuiltRuleAssets(es, log);
          // Create a new version with a different rule type asset
          await createPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObject({
              rule_id: 'rule-to-test-2',
              type: 'eql',
              language: 'eql',
              query: 'host where host == "something"',
              enabled: true,
              version: 2,
            }),
          ]);

          // Upgrade to a newer version with a different rule type
          await upgradePrebuiltRules(es, supertest);

          expect(await fetchRule(supertest, { ruleId: 'rule-to-test-2' })).toMatchObject({
            id: initialRuleSoId,
            // If a user disabled the rule it's expected to stay disabled after upgrade
            enabled: false,
            actions,
            exceptions_list: exceptionsList,
            timeline_id: 'some-timeline-id',
            timeline_title: 'Some timeline title',
          });
        });
      });
    });
  });
};
