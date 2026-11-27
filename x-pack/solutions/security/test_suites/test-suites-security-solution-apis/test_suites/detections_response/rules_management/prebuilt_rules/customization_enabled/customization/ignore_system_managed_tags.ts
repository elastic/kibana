/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  LEGACY_MISSING_UIAM_API_KEY_TAG,
  MISSING_UIAM_API_KEY_TAG,
} from '@kbn/alerting-plugin/common';
import {
  BulkActionEditTypeEnum,
  BulkActionTypeEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  addTagsToRuleSavedObject,
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
} from '../../../../utils';
import { getPrebuiltRuleBaseVersion } from '../../../../utils/rules/prebuilt_rules/get_prebuilt_rule_base_version';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Ignore system-managed tags in prebuilt rule customization detection', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    for (const systemManagedTag of [MISSING_UIAM_API_KEY_TAG, LEGACY_MISSING_UIAM_API_KEY_TAG]) {
      describe(`"${systemManagedTag}" tag added by the Alerting Framework`, () => {
        const PREBUILT_RULE_ID = 'test-prebuilt-rule';
        const USER_TAG = 'test-tag';

        const testSystemManagedTagIsIgnored = ({ hasBaseVersion }: { hasBaseVersion: boolean }) => {
          beforeEach(async () => {
            const QUERY_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
              rule_id: PREBUILT_RULE_ID,
              version: 3,
              tags: [USER_TAG],
            });

            await createPrebuiltRuleAssetSavedObjects(es, [QUERY_PREBUILT_RULE_ASSET]);
            await installPrebuiltRules(es, supertest);
            await addTagsToRuleSavedObject(es, log, {
              ruleId: PREBUILT_RULE_ID,
              tags: [systemManagedTag],
            });

            if (!hasBaseVersion) {
              // Remove the prebuilt rule asset so that the base version is no longer available
              await deleteAllPrebuiltRuleAssets(es, log);
            }
          });

          it('keeps the tag on the rule', async () => {
            const { body: prebuiltRule } = await detectionsApi
              .readRule({
                query: { rule_id: PREBUILT_RULE_ID },
              })
              .expect(200);

            expect(prebuiltRule.tags).toEqual([USER_TAG, systemManagedTag]);
            expect(prebuiltRule.rule_source).toMatchObject({
              type: 'external',
              is_customized: false,
            });
          });

          it('does NOT mark the rule as customized when patching an unaffected field', async () => {
            const { body } = await detectionsApi
              .patchRule({
                body: { rule_id: PREBUILT_RULE_ID, enabled: true },
              })
              .expect(200);

            expect(body.tags).toEqual([USER_TAG, systemManagedTag]);
            expect(body.rule_source).toMatchObject({
              type: 'external',
              is_customized: false,
              customized_fields: [],
              has_base_version: hasBaseVersion,
            });
          });

          it('does NOT mark the rule as customized when updating the rule with the tag included', async () => {
            const { body: prebuiltRule } = await detectionsApi
              .readRule({
                query: { rule_id: PREBUILT_RULE_ID },
              })
              .expect(200);

            const { body } = await detectionsApi
              .updateRule({
                body: { ...prebuiltRule, id: undefined },
              })
              .expect(200);

            expect(body.tags).toEqual([USER_TAG, systemManagedTag]);
            expect(body.rule_source).toMatchObject({
              type: 'external',
              is_customized: false,
              customized_fields: [],
              has_base_version: hasBaseVersion,
            });
          });

          it('does NOT mark the rule as customized when bulk editing tags does not change user tags', async () => {
            const { body: prebuiltRule } = await detectionsApi
              .readRule({
                query: { rule_id: PREBUILT_RULE_ID },
              })
              .expect(200);

            const { body: bulkResult } = await detectionsApi
              .performRulesBulkAction({
                query: {},
                body: {
                  ids: [prebuiltRule.id],
                  action: BulkActionTypeEnum.edit,
                  [BulkActionTypeEnum.edit]: [
                    {
                      type: BulkActionEditTypeEnum.add_tags,
                      value: [USER_TAG],
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

            const { body: unchangedPrebuiltRule } = await detectionsApi
              .readRule({
                query: { rule_id: PREBUILT_RULE_ID },
              })
              .expect(200);

            expect(unchangedPrebuiltRule.rule_source.is_customized).toEqual(false);
          });

          it('marks the rule as customized when user tags change', async () => {
            const { body } = await detectionsApi
              .patchRule({
                body: {
                  rule_id: PREBUILT_RULE_ID,
                  tags: [USER_TAG, 'another-user-tag', systemManagedTag],
                },
              })
              .expect(200);

            expect(body.rule_source).toMatchObject({
              type: 'external',
              is_customized: true,
              has_base_version: hasBaseVersion,
            });
          });
        };

        describe('when base version is available', () => {
          testSystemManagedTagIsIgnored({ hasBaseVersion: true });

          it('reports no diff between the base and the current versions', async () => {
            const { body: prebuiltRule } = await detectionsApi
              .readRule({
                query: { rule_id: PREBUILT_RULE_ID },
              })
              .expect(200);

            const response = await getPrebuiltRuleBaseVersion(supertest, { id: prebuiltRule.id });

            expect(response.diff).toMatchObject({
              num_fields_with_updates: 0,
              num_fields_with_conflicts: 0,
              num_fields_with_non_solvable_conflicts: 0,
            });
            expect(response.diff.fields).toEqual({});
          });

          it('reports only user tags changes in the diff between the base and the current versions', async () => {
            const { body: prebuiltRule } = await detectionsApi
              .patchRule({
                body: {
                  rule_id: PREBUILT_RULE_ID,
                  tags: [USER_TAG, 'another-user-tag', systemManagedTag],
                },
              })
              .expect(200);

            const response = await getPrebuiltRuleBaseVersion(supertest, { id: prebuiltRule.id });

            expect(response.diff.fields).toMatchObject({
              tags: {
                base_version: [USER_TAG],
                current_version: [USER_TAG, 'another-user-tag'],
                target_version: [USER_TAG],
              },
            });
          });
        });

        describe('when base version is missing', () => {
          testSystemManagedTagIsIgnored({ hasBaseVersion: false });
        });
      });
    }
  });
};
