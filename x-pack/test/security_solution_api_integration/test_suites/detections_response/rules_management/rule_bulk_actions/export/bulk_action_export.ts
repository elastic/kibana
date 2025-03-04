/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { BulkActionTypeEnum } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  binaryToString,
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
} from '../../../utils';
import { deleteAllRules } from '../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const securitySolutionApi = getService('securitySolutionApi');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Bulk action - Export', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    it(`exports prebuilt rules if the feature flag is enabled`, async () => {
      const ruleAsset = createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 });
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

      const [ruleJson, exportDetailsJson] = body.toString().split(/\n/);

      expect(JSON.parse(ruleJson)).toMatchObject({
        id: installedRule.id,
        rule_source: {
          type: 'external',
          is_customized: false,
        },
      });

      expect(JSON.parse(exportDetailsJson)).toMatchObject({
        missing_rules: [],
      });
    });
  });
};
