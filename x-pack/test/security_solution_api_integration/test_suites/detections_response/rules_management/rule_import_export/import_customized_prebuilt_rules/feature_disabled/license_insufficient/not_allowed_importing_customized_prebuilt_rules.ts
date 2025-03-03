/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../../../../ftr_provider_context';
import { deleteAllPrebuiltRuleAssets, getCustomQueryRuleParams } from '../../../../../utils';
import { deleteAllRules } from '../../../../../../../../common/utils/security_solution';
import { combineToNdJson } from '../../../../../utils/combine_to_ndjson';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
} from '../../../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const securitySolutionApi = getService('securitySolutionApi');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Import - Customization Disabled', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    it(`does NOT import customized prebuilt rules when license is insufficient`, async () => {
      const ruleId = 'prebuilt-rule-to-be-customized';
      const ruleParams = getCustomQueryRuleParams({
        rule_id: ruleId,
        // @ts-expect-error the API supports this param, but we only need it in {@link RuleToImport}
        immutable: true,
        rule_source: { type: 'external', is_customized: false },
        version: 1,
      });
      const ruleAsset = createRuleAssetSavedObject(ruleParams);

      await createPrebuiltRuleAssetSavedObjects(es, [ruleAsset]);

      // Customizing the rule before importing
      const ndjson = combineToNdJson({ ...ruleParams, name: 'My customized rule' });

      const { body } = await securitySolutionApi
        .importRules({ query: {} })
        .attach('file', Buffer.from(ndjson), 'rules.ndjson')
        .expect(200);

      expect(body).toMatchObject({
        success: false,
        errors: [
          {
            rule_id: 'prebuilt-rule-to-be-customized',
            error: {
              status_code: 400,
              message:
                'Upgrade your license to import customized prebuilt rules [rule_id: prebuilt-rule-to-be-customized]',
            },
          },
        ],
      });
    });
  });
};
