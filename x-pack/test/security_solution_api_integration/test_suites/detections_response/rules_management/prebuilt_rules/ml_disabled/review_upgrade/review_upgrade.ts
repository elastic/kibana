/* eslint-disable no-console */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObjectOfType,
  deleteAllPrebuiltRuleAssets,
  reviewPrebuiltRulesToUpgrade,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { createMlRuleThroughAlertingEndpoint } from '../utils';
import { setUpRuleUpgrade } from '../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const config = getService('config');
  const basic = config.get('esTestCluster.license') === 'basic';
  const deps = {
    es,
    supertest,
    log,
  };

  describe('@ess @serverless @skipInServerlessMKI Prebuilt rules upgrade review', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);

      console.error('------------------------');
      console.error(config.get('esTestCluster.license'));
      console.error('------------------------');
    });

    const ruleId = 'ml-rule';

    describe(`rule is excluded from response`, function () {
      if (basic) {
        this.tags('skipFIPS');
      }

      it('if target is an ML rule', async () => {
        await createMlRuleThroughAlertingEndpoint(supertest, {
          ruleId,
          version: 1,
        });

        const targetMlRuleAsset = createRuleAssetSavedObjectOfType('machine_learning', {
          rule_id: ruleId,
          version: 2,
        });
        await createPrebuiltRuleAssetSavedObjects(es, [targetMlRuleAsset]);

        const upgradeReviewResult = await reviewPrebuiltRulesToUpgrade(supertest);
        expect(upgradeReviewResult).toMatchObject({
          total: 0,
          rules: [],
        });
      });
    });

    describe(`rule is included in response`, function () {
      it('if current rule is an ML rule, but target is a non-ML rule', async () => {
        await createMlRuleThroughAlertingEndpoint(supertest, {
          ruleId,
          version: 1,
        });

        const targetRuleAsset = createRuleAssetSavedObjectOfType('query', {
          rule_id: ruleId,
          version: 2,
        });
        await createPrebuiltRuleAssetSavedObjects(es, [targetRuleAsset]);

        const upgradeReviewResult = await reviewPrebuiltRulesToUpgrade(supertest);
        expect(upgradeReviewResult).toMatchObject({
          total: 1,
          rules: [
            {
              current_rule: {
                rule_id: ruleId,
                type: 'machine_learning',
                version: 1,
              },
              target_rule: {
                rule_id: ruleId,
                type: 'query',
                version: 2,
              },
            },
          ],
        });
      });

      it('if both current and target are non-ML rules', async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: 'query',
              rule_id: ruleId,
              version: 1,
            },
            upgrade: {
              type: 'query',
              rule_id: ruleId,
              version: 2,
            },
            patch: {},
          },
          deps,
        });

        const upgradeReviewResult = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(upgradeReviewResult).toMatchObject({
          total: 1,
          rules: [
            {
              current_rule: {
                rule_id: ruleId,
                type: 'query',
                version: 1,
              },
              target_rule: {
                rule_id: ruleId,
                type: 'query',
                version: 2,
              },
            },
          ],
        });
      });
    });
  });
};
