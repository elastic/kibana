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
  getPrebuiltRulesStatus,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { createMlRuleThroughAlertingEndpoint } from '../utils';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const config = getService('config');
  const basic = config.get('esTestCluster.license') === 'basic';

  describe('@ess @serverless @skipInServerlessMKI Prebuilt rules status', function () {
    if (basic) {
      this.tags('skipFIPS');
    }

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    it('ML rules are not counted towards installable rules', async () => {
      const mlRuleAsset = createRuleAssetSavedObjectOfType('machine_learning', {
        version: 1,
      });
      await createPrebuiltRuleAssetSavedObjects(es, [mlRuleAsset]);

      const statusResponse = await getPrebuiltRulesStatus(es, supertest);
      expect(statusResponse).toMatchObject({
        stats: {
          num_prebuilt_rules_to_install: 0,
          num_prebuilt_rules_total_in_package: 1,
        },
      });
    });

    it('ML rules are not counted towards upgradable rules', async () => {
      await createMlRuleThroughAlertingEndpoint(supertest, {
        ruleId: 'ml-rule',
        version: 1,
      });

      const targetMlRuleAsset = createRuleAssetSavedObjectOfType('machine_learning', {
        rule_id: 'ml-rule',
        version: 2,
      });
      await createPrebuiltRuleAssetSavedObjects(es, [targetMlRuleAsset]);

      const statusResponse = await getPrebuiltRulesStatus(es, supertest);
      expect(statusResponse).toMatchObject({
        stats: {
          num_prebuilt_rules_to_upgrade: 0,
          num_prebuilt_rules_installed: 1,
          num_prebuilt_rules_total_in_package: 1,
        },
      });
    });
  });
};
