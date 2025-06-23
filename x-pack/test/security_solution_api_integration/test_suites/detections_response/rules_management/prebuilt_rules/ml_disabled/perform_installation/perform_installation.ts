/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { getPrebuiltRuleMockOfType } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/mocks';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Prebuilt rules installation perform', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    it('ML rules are skipped during installation if mode is ALL_RULES', async () => {
      const mlFields = getPrebuiltRuleMockOfType('machine_learning');

      const mlRuleAsset = await createRuleAssetSavedObject({
        ...mlFields,
        alert_suppression: undefined, // TODO: Investigate!
      });

      const nonMlRuleAsset = await createRuleAssetSavedObject({
        type: 'query',
      });

      await createPrebuiltRuleAssetSavedObjects(es, [mlRuleAsset, nonMlRuleAsset]);

      const performInstallationResponse = await installPrebuiltRules(es, supertest);

      expect(performInstallationResponse.summary).toEqual({
        total: 1,
        succeeded: 1,
        skipped: 0, // ML rules are skipped silently as if they were not present, so do not count towards "skipped"
        failed: 0,
      });
      expect(performInstallationResponse.results.created).toHaveLength(1);
      expect(performInstallationResponse.results.created?.[0].type).toEqual('query');
    });

    it('ML rules return an error on installation if mode is SPECIFIC_RULES', async () => {
      const mlFields = {
        ...getPrebuiltRuleMockOfType('machine_learning'),
        rule_id: 'ml-rule',
        version: 1,
      };
      const mlRuleAsset = await createRuleAssetSavedObject({
        ...mlFields,
        alert_suppression: undefined, // TODO: Investigate!
      });

      const nonMlRuleFields = {
        rule_id: 'non-ml-rule',
        version: 1,
        tags: ['Type: Custom Query'],
      };
      const nonMlRuleAsset = await createRuleAssetSavedObject({
        ...nonMlRuleFields,
      });

      await createPrebuiltRuleAssetSavedObjects(es, [mlRuleAsset, nonMlRuleAsset]);

      const performInstallationResponse = await installPrebuiltRules(es, supertest, [
        { rule_id: mlFields.rule_id, version: mlFields.version },
        { rule_id: nonMlRuleFields.rule_id, version: nonMlRuleFields.version },
      ]);

      expect(performInstallationResponse).toMatchObject({
        summary: { total: 2, succeeded: 1, skipped: 0, failed: 1 },
        results: {
          created: [{ rule_id: nonMlRuleFields.rule_id }],
        },
        errors: [
          {
            message: 'Your license does not support machine learning. Please upgrade your license.',
            status_code: 403,
            rules: [{ rule_id: mlFields.rule_id }],
          },
        ],
      });
    });
  });
};
