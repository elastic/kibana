/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  BulkActionEditTypeEnum,
  BulkActionTypeEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllPrebuiltRuleAssets,
  createRuleAssetSavedObject,
  createPrebuiltRuleAssetSavedObjects,
  installPrebuiltRules,
} from '../../../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');
  const es = getService('es');

  const ruleAsset = createRuleAssetSavedObject({
    rule_id: 'test-rule-id',
  });

  describe('@ess @serverless @skipInServerlessMKI is_customized calculation with disabled customization', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    it('should not allow prebuilt rule customization on import', async () => {
      await createPrebuiltRuleAssetSavedObjects(es, [ruleAsset]);
      await installPrebuiltRules(es, supertest);

      const { body: findResult } = await securitySolutionApi
        .findRules({
          query: {
            per_page: 1,
            filter: `alert.attributes.params.immutable: true`,
          },
        })
        .expect(200);
      const prebuiltRule = findResult.data[0];

      // Check that the rule has been created and is not customized
      expect(prebuiltRule).not.toBeNull();
      expect(prebuiltRule.rule_source.is_customized).toEqual(false);

      const ruleBuffer = Buffer.from(
        JSON.stringify({
          ...prebuiltRule,
          name: 'some other rule name',
        })
      );

      const { body } = await securitySolutionApi
        .importRules({ query: {} })
        .attach('file', ruleBuffer, 'rules.ndjson')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200);

      expect(body).toMatchObject({
        rules_count: 1,
        success: false,
        success_count: 0,
        errors: [
          {
            error: {
              message: expect.stringContaining('Importing prebuilt rules is not supported'),
            },
            rule_id: 'test-rule-id',
          },
        ],
      });

      // Check that the rule has not been customized
      const { body: importedRule } = await securitySolutionApi.readRule({
        query: { rule_id: prebuiltRule.rule_id },
      });
      expect(importedRule.rule_source.is_customized).toEqual(false);
    });

    it('should not allow rule customization on bulk edit', async () => {
      await createPrebuiltRuleAssetSavedObjects(es, [ruleAsset]);
      await installPrebuiltRules(es, supertest);

      const { body: findResult } = await securitySolutionApi
        .findRules({
          query: {
            per_page: 1,
            filter: `alert.attributes.params.immutable: true`,
          },
        })
        .expect(200);
      const prebuiltRule = findResult.data[0];

      // Check that the rule has been created and is not customized
      expect(prebuiltRule).not.toBeNull();
      expect(prebuiltRule.rule_source.is_customized).toEqual(false);

      const { body: bulkResult } = await securitySolutionApi
        .performRulesBulkAction({
          query: {},
          body: {
            ids: [prebuiltRule.id],
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.add_tags,
                value: ['test'],
              },
            ],
          },
        })
        .expect(500);

      expect(bulkResult).toMatchObject(
        expect.objectContaining({
          attributes: expect.objectContaining({
            summary: {
              failed: 1,
              skipped: 0,
              succeeded: 0,
              total: 1,
            },
            errors: [expect.objectContaining({ message: "Elastic rule can't be edited" })],
          }),
        })
      );

      // Check that the rule has not been customized
      const { body: ruleAfterUpdate } = await securitySolutionApi.readRule({
        query: { rule_id: prebuiltRule.rule_id },
      });
      expect(ruleAfterUpdate.rule_source.is_customized).toEqual(false);
    });
  });
};
