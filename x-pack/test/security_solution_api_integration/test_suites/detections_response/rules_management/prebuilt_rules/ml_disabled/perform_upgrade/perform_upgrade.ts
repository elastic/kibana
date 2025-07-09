/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ModeEnum } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObjectOfType,
  deleteAllPrebuiltRuleAssets,
  performUpgradePrebuiltRules,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { setUpRuleUpgrade } from '../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';
import { createMlRuleThroughAlertingEndpoint } from '../utils';

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

  describe('@ess @serverless @skipInServerlessMKI Prebuilt rules upgrade perform', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    const ruleId = 'ml-rule';

    describe('ALL_RULES mode', function () {
      if (basic) {
        this.tags('skipFIPS');
      }

      it('silently skips ML rules in ALL_RULES mode', async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: 'machine_learning',
              version: 1,
            },
            upgrade: {
              type: 'machine_learning',
              version: 2,
            },
            patch: {},
          },
          deps,
        });

        const upgradePerformResult = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.ALL_RULES,
        });

        expect(upgradePerformResult).toMatchObject({
          summary: {
            total: 0,
            succeeded: 0,
            failed: 0,
          },
          errors: [],
        });
      });
    });

    describe('SPECIFIC_RULES mode', function () {
      describe(`doesn't upgrade`, function () {
        if (basic) {
          this.tags('skipFIPS');
        }

        it(`if target is an ML rule`, async () => {
          await createMlRuleThroughAlertingEndpoint(supertest, {
            ruleId,
            version: 1,
          });

          const targetMlRuleAsset = createRuleAssetSavedObjectOfType('machine_learning', {
            rule_id: ruleId,
            version: 2,
          });
          await createPrebuiltRuleAssetSavedObjects(es, [targetMlRuleAsset]);

          const upgradePerformResult = await performUpgradePrebuiltRules(es, supertest, {
            mode: ModeEnum.SPECIFIC_RULES,
            rules: [
              {
                rule_id: ruleId,
                revision: 0,
                version: 2,
              },
            ],
          });

          expect(upgradePerformResult).toMatchObject({
            summary: {
              total: 1,
              failed: 1,
            },
            errors: [
              {
                message:
                  'Your license does not support machine learning. Please upgrade your license.',
                rules: [{ rule_id: ruleId }],
              },
            ],
          });
        });
      });

      describe('upgrades successfully', function () {
        it('if current rule is an ML rule, but target is a non-ML rule', async () => {
          await createMlRuleThroughAlertingEndpoint(supertest, {
            ruleId,
            version: 1,
          });

          const targetMlRuleAsset = createRuleAssetSavedObjectOfType('query', {
            rule_id: ruleId,
            version: 2,
          });
          await createPrebuiltRuleAssetSavedObjects(es, [targetMlRuleAsset]);

          const upgradePerformResult = await performUpgradePrebuiltRules(es, supertest, {
            mode: ModeEnum.SPECIFIC_RULES,
            rules: [
              {
                rule_id: ruleId,
                revision: 0,
                version: 2,
                pick_version: 'TARGET',
              },
            ],
          });

          expect(upgradePerformResult).toMatchObject({
            summary: {
              total: 1,
              succeeded: 1,
            },
            results: {
              updated: [{ rule_id: ruleId }],
            },
          });
        });

        it('if both current and target are non-ML rules', async () => {
          await setUpRuleUpgrade({
            assets: {
              installed: {
                type: 'query',
                version: 1,
                rule_id: ruleId,
              },
              upgrade: {
                type: 'query',
                version: 2,
                rule_id: ruleId,
              },
              patch: {},
            },
            deps,
          });

          const upgradePerformResult = await performUpgradePrebuiltRules(es, supertest, {
            mode: ModeEnum.SPECIFIC_RULES,
            rules: [
              {
                rule_id: ruleId,
                revision: 0,
                version: 2,
              },
            ],
          });

          expect(upgradePerformResult).toMatchObject({
            summary: {
              total: 1,
              succeeded: 1,
            },
            results: {
              updated: [{ rule_id: ruleId }],
            },
          });
        });
      });
    });
  });
};
