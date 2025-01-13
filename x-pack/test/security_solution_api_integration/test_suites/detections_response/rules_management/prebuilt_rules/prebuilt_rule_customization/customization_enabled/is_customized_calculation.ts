/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  BulkActionEditTypeEnum,
  BulkActionTypeEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management/bulk_actions/bulk_actions_route.gen';
import expect from 'expect';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
} from '../../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');

  const ruleAsset = createRuleAssetSavedObject({
    rule_id: '000047bb-b27a-47ec-8b62-ef1a5d2c9e19',
    tags: ['test-tag'],
  });

  describe('@ess @serverless @skipInServerlessMKI is_customized calculation', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    describe('prebuilt rules', () => {
      it('should set is_customized to true on bulk rule modification', async () => {
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
                  value: ['new-tag'],
                },
              ],
            },
          })
          .expect(200);

        expect(bulkResult.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 1,
          total: 1,
        });
        expect(bulkResult.attributes.results.updated[0].rule_source.is_customized).toEqual(true);
      });

      it('should leave is_customized intact if the change has been skipped', async () => {
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
                  // This tag is already present on the rule, so the change will be skipped
                  value: [prebuiltRule.tags[0]],
                },
              ],
            },
          })
          .expect(200);

        expect(bulkResult.attributes.summary).toEqual({
          failed: 0,
          skipped: 1,
          succeeded: 0,
          total: 1,
        });

        // Check that the rule has not been customized
        const { body: findResultAfter } = await securitySolutionApi
          .findRules({
            query: {
              per_page: 1,
              filter: `alert.attributes.params.immutable: true`,
            },
          })
          .expect(200);
        expect(findResultAfter.data[0].rule_source.is_customized).toEqual(false);
      });

      it('should set is_customized to false if the change has been reverted', async () => {
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
        expect(prebuiltRule).not.toBeNull();
        expect(prebuiltRule.rule_source.is_customized).toEqual(false);

        // Add a tag to the rule
        const { body: bulkResult } = await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              ids: [prebuiltRule.id],
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.add_tags,
                  value: ['new-tag'],
                },
              ],
            },
          })
          .expect(200);

        expect(bulkResult.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 1,
          total: 1,
        });

        // Remove the added tag
        const { body: revertResult } = await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              ids: [prebuiltRule.id],
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.delete_tags,
                  value: ['new-tag'],
                },
              ],
            },
          })
          .expect(200);

        expect(revertResult.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 1,
          total: 1,
        });

        expect(revertResult.attributes.results.updated[0].rule_source.is_customized).toEqual(false);
      });
    });
  });
};
