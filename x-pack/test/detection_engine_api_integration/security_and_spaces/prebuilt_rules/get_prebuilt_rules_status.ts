/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  deleteAllRules,
  deleteRule,
  getPrebuiltRulesAndTimelinesStatus,
  getSimpleRule,
  installPrebuiltRulesAndTimelines,
} from '../../utils';
import {
  createHistoricalPrebuiltRuleAssetSavedObjects,
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
} from '../../utils/prebuilt_rules/create_prebuilt_rule_saved_objects';
import { deleteAllPrebuiltRuleAssets } from '../../utils/prebuilt_rules/delete_all_prebuilt_rule_assets';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  describe('get_prebuilt_rules_status', () => {
    beforeEach(async () => {
      await deleteAllPrebuiltRuleAssets(es);
      await deleteAllRules(supertest, log);
    });

    it('should return empty structure when no rules package installed', async () => {
      const body = await getPrebuiltRulesAndTimelinesStatus(supertest);

      expect(body).toMatchObject({
        rules_custom_installed: 0,
        rules_installed: 0,
        rules_not_installed: 0,
        rules_not_updated: 0,
      });
    });

    it('should show that one custom rule is installed when a custom rule is added', async () => {
      await createRule(supertest, log, getSimpleRule());

      const body = await getPrebuiltRulesAndTimelinesStatus(supertest);
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
        const body = await getPrebuiltRulesAndTimelinesStatus(supertest);

        expect(body).toMatchObject({
          rules_custom_installed: 0,
          rules_installed: 0,
          rules_not_installed: RULES_COUNT,
          rules_not_updated: 0,
        });
      });

      it('should return the number of installed prebuilt rules after installing them', async () => {
        await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRulesAndTimelines(supertest);

        const body = await getPrebuiltRulesAndTimelinesStatus(supertest);
        expect(body).toMatchObject({
          rules_custom_installed: 0,
          rules_installed: RULES_COUNT,
          rules_not_installed: 0,
          rules_not_updated: 0,
        });
      });

      it('should notify the user again that a rule is available for install after it is deleted', async () => {
        await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRulesAndTimelines(supertest);
        await deleteRule(supertest, 'rule-1');

        const body = await getPrebuiltRulesAndTimelinesStatus(supertest);
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
        await installPrebuiltRulesAndTimelines(supertest);

        // Clear previous rule assets
        await deleteAllPrebuiltRuleAssets(es);
        // Increment the version of one of the installed rules and create the new rule assets
        ruleAssetSavedObjects[0]['security-rule'].version += 1;
        await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);

        const body = await getPrebuiltRulesAndTimelinesStatus(supertest);
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
        await installPrebuiltRulesAndTimelines(supertest);

        // Clear previous rule assets
        await deleteAllPrebuiltRuleAssets(es);
        // Recreate the rules without bumping any versions
        await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);

        const body = await getPrebuiltRulesAndTimelinesStatus(supertest);
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
        const body = await getPrebuiltRulesAndTimelinesStatus(supertest);

        expect(body).toMatchObject({
          rules_custom_installed: 0,
          rules_installed: 0,
          rules_not_installed: RULES_COUNT,
          rules_not_updated: 0,
        });
      });

      it('should return the number of installed prebuilt rules after installing them', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRulesAndTimelines(supertest);

        const body = await getPrebuiltRulesAndTimelinesStatus(supertest);
        expect(body).toMatchObject({
          rules_custom_installed: 0,
          rules_installed: RULES_COUNT,
          rules_not_installed: 0,
          rules_not_updated: 0,
        });
      });

      it('should notify the user again that a rule is available for install after it is deleted', async () => {
        await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRulesAndTimelines(supertest);
        await deleteRule(supertest, 'rule-1');

        const body = await getPrebuiltRulesAndTimelinesStatus(supertest);
        expect(body).toMatchObject({
          rules_custom_installed: 0,
          rules_installed: RULES_COUNT - 1,
          rules_not_installed: 1,
          rules_not_updated: 0,
        });
      });

      it('should return available rule updates when previous historical versions available', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRulesAndTimelines(supertest);

        // Add a new version of one of the installed rules
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 3 }),
        ]);

        const body = await getPrebuiltRulesAndTimelinesStatus(supertest);
        expect(body).toMatchObject({
          rules_custom_installed: 0,
          rules_installed: RULES_COUNT,
          rules_not_installed: 0,
          rules_not_updated: 1,
        });
      });

      it('should return available rule updates when previous historical versions unavailable', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRulesAndTimelines(supertest);

        // Delete the previous versions of rule assets
        await deleteAllPrebuiltRuleAssets(es);

        // Add a new rule version
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 3 }),
        ]);

        const body = await getPrebuiltRulesAndTimelinesStatus(supertest);
        expect(body).toMatchObject({
          rules_custom_installed: 0,
          rules_installed: RULES_COUNT,
          rules_not_installed: 0,
          rules_not_updated: 1,
        });
      });
    });
  });
};
