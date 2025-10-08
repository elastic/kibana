/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllPrebuiltRuleAssets,
  getPrebuiltRulesStatus,
  createRuleAssetSavedObject,
  createPrebuiltRuleAssetSavedObjects,
  installPrebuiltRules,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../config/services/detections_response';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Prebuilt Rules Upgrade Notifications', () => {
    beforeEach(async () => {
      await deleteAllPrebuiltRuleAssets(es, log);
      await deleteAllRules(supertest, log);
    });

    it('returns zero prebuilt rules to upgrade when there are no prebuilt rule assets', async () => {
      const { stats } = await getPrebuiltRulesStatus(es, supertest);

      expect(stats).toMatchObject({
        num_prebuilt_rules_to_upgrade: 0,
      });
    });

    for (const numOfRules of [1, 100, 1250]) {
      it(`returns zero prebuilt rules to upgrade when all ${numOfRules} install prebuilt rules have been upgraded`, async () => {
        const prebuiltRuleAssets = Array.from({ length: numOfRules }, (_, i) =>
          createRuleAssetSavedObject({
            rule_id: `test-prebuilt-rule-${i}`,
            name: `Prebuilt rule ${i}`,
            version: 2,
          })
        );

        await createPrebuiltRuleAssetSavedObjects(es, prebuiltRuleAssets);
        await installPrebuiltRules(es, supertest);

        const { stats } = await getPrebuiltRulesStatus(es, supertest);

        expect(stats).toMatchObject({
          num_prebuilt_rules_to_upgrade: 0,
        });
      });
    }

    for (const numOfRulesToUpgrade of [1, 100, 1250]) {
      it(`returns a number of prebuilt rules to upgrade when there are ${numOfRulesToUpgrade} prebuilt rules to upgrade but there are no more prebuilt rules to install`, async () => {
        const prebuiltRuleAssets = Array.from({ length: 1250 }, (_, i) =>
          createRuleAssetSavedObject({
            rule_id: `test-prebuilt-rule-${i}`,
            name: `Prebuilt rule ${i}`,
            version: 2,
          })
        );

        await createPrebuiltRuleAssetSavedObjects(es, prebuiltRuleAssets);
        await installPrebuiltRules(es, supertest);

        const newPrebuiltRuleAssets = Array.from({ length: numOfRulesToUpgrade }, (_, i) =>
          createRuleAssetSavedObject({
            rule_id: `test-prebuilt-rule-${i}`,
            name: `New prebuilt rule ${i}`,
            description: `test-prebuilt-rule-${i}`,
            version: 3,
          })
        );

        await createPrebuiltRuleAssetSavedObjects(es, newPrebuiltRuleAssets);

        const { stats } = await getPrebuiltRulesStatus(es, supertest);

        expect(stats).toMatchObject({
          num_prebuilt_rules_to_upgrade: numOfRulesToUpgrade,
        });
      });
    }

    for (const [numOfRulesAvailableToInstall, numOfRulesToUpgrade] of [
      [1249, 1],
      [1, 100],
      [1, 1249],
    ]) {
      it(`returns a number of prebuilt rules to upgrade when there are ${numOfRulesToUpgrade} prebuilt rules to upgrade but there are no more prebuilt rules to install`, async () => {
        const prebuiltRuleAssets = Array.from({ length: 1250 }, (_, i) =>
          createRuleAssetSavedObject({
            rule_id: `test-prebuilt-rule-${i}`,
            name: `Prebuilt rule ${i}`,
            version: 2,
          })
        );

        await createPrebuiltRuleAssetSavedObjects(es, prebuiltRuleAssets);

        const ruleSpecifiersToInstall = Array.from(
          { length: prebuiltRuleAssets.length - numOfRulesAvailableToInstall },
          (_, i) => ({
            rule_id: `test-prebuilt-rule-${i}`,
            version: 2,
          })
        );
        await installPrebuiltRules(es, supertest, ruleSpecifiersToInstall);

        const newPrebuiltRuleAssets = Array.from({ length: numOfRulesToUpgrade }, (_, i) =>
          createRuleAssetSavedObject({
            rule_id: `test-prebuilt-rule-${i}`,
            name: `New prebuilt rule ${i}`,
            description: `test-prebuilt-rule-${i}`,
            version: 3,
          })
        );

        await createPrebuiltRuleAssetSavedObjects(es, newPrebuiltRuleAssets);

        const { stats } = await getPrebuiltRulesStatus(es, supertest);

        expect(stats).toMatchObject({
          num_prebuilt_rules_to_install: numOfRulesAvailableToInstall,
          num_prebuilt_rules_to_upgrade: numOfRulesToUpgrade,
        });
      });
    }
  });
};
