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
  reviewPrebuiltRulesToInstall,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Prebuilt rules installation review', function () {
    this.tags('skipFIPS');

    beforeEach(async () => { 
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    it('ML rules are excluded from response', async () => {
      const mlRuleAsset = createRuleAssetSavedObjectOfType('machine_learning', {
        tags: ['Type: ML'],
      });
      const nonMlRuleAsset = createRuleAssetSavedObjectOfType('query', {
        tags: ['Type: Custom Query'],
      });

      await createPrebuiltRuleAssetSavedObjects(es, [mlRuleAsset, nonMlRuleAsset]);

      const prebuiltRulesToInstallReview = await reviewPrebuiltRulesToInstall(supertest);

      expect(prebuiltRulesToInstallReview.stats.num_rules_to_install).toBe(1);
      expect(prebuiltRulesToInstallReview.rules.length).toBe(1);
      expect(prebuiltRulesToInstallReview.rules[0]?.type).toBe('query');

      // Ensure tags from ML rules are not included
      expect(prebuiltRulesToInstallReview.stats.tags).toEqual(['Type: Custom Query']);
    });
  });
};
