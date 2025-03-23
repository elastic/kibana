/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { BulkActionTypeEnum } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  binaryToString,
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const securitySolutionApi = getService('securitySolutionApi');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Prebuilt rule export - feature disabled', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    it("Export API - doesn't export prebuilt rules when the feature is disabled", async () => {
      const ruleId = 'prebuilt-rule-1';
      const ruleAsset = createRuleAssetSavedObject({ rule_id: ruleId, version: 1 });
      await createPrebuiltRuleAssetSavedObjects(es, [ruleAsset]);
      await installPrebuiltRules(es, supertest);

      const { body } = await securitySolutionApi
        .exportRules({ query: {}, body: null })
        .expect(200)
        .parse(binaryToString);

      const exportDetails = JSON.parse(body.toString());

      expect(exportDetails).toMatchObject({
        exported_rules_count: 0,
        missing_rules: [], // Prebuilt rules are not in missing rules, even though they are not exported
      });
    });

    it("Bulk actions export API - doesn't export prebuilt rules when the feature is disabled", async () => {
      const ruleAsset = createRuleAssetSavedObject({ rule_id: 'prebuilt-rule-1', version: 1 });
      await createPrebuiltRuleAssetSavedObjects(es, [ruleAsset]);
      await installPrebuiltRules(es, supertest);

      const findResponse = await securitySolutionApi.findRules({ query: {} });
      const installedRule = findResponse.body.data[0];

      const { body } = await securitySolutionApi
        .performRulesBulkAction({
          query: {},
          body: { action: BulkActionTypeEnum.export, ids: [installedRule.id] },
        })
        .expect(200)
        .parse(binaryToString);

      const exportDetails = JSON.parse(body.toString());

      expect(exportDetails).toMatchObject({
        exported_rules_count: 0,
        missing_rules: [{ rule_id: 'prebuilt-rule-1' }],
      });
    });
  });
};
