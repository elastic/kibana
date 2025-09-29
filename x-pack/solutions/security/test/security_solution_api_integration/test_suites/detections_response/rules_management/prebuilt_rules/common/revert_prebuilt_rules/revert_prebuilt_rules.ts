/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import { BulkRevertSkipReasonEnum } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  deleteAllRules,
  waitForRulePartialFailure,
} from '../../../../../../config/services/detections_response';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
  getCustomQueryRuleParams,
} from '../../../../utils';
import { revertPrebuiltRule } from '../../../../utils/rules/prebuilt_rules/revert_prebuilt_rule';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  const ruleAsset = createRuleAssetSavedObject({
    rule_id: 'rule_1',
  });

  describe('@ess @serverless @skipInServerlessMKI Revert prebuilt rule', () => {
    before(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    describe('reverting prebuilt rules', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [ruleAsset]);
        await installPrebuiltRules(es, supertest);
      });

      afterEach(async () => {
        await deleteAllRules(supertest, log);
        await deleteAllPrebuiltRuleAssets(es, log);
      });

      it('reverts a customized prebuilt rule to original Elastic version', async () => {
        const { body: nonCustomizedPrebuiltRule } = await detectionsApi
          .readRule({
            query: { rule_id: 'rule_1' },
          })
          .expect(200);

        const { body: customizedPrebuiltRule } = await detectionsApi.patchRule({
          body: { rule_id: 'rule_1', description: 'new description' },
        });

        const response = await revertPrebuiltRule(supertest, {
          id: customizedPrebuiltRule.id,
          version: customizedPrebuiltRule.version,
          revision: customizedPrebuiltRule.revision,
        });

        expect(response).toEqual({
          success: true,
          rules_count: 1,
          attributes: {
            results: {
              updated: [
                expect.objectContaining({
                  rule_source: {
                    is_customized: false,
                    type: 'external',
                  },
                  description: nonCustomizedPrebuiltRule.description, // Modified field should be set to its original asset value
                  revision: ++customizedPrebuiltRule.revision, // We increment the revision number during reversion
                }),
              ],
              skipped: [],
              created: [],
              deleted: [],
            },
            summary: {
              failed: 0,
              succeeded: 1,
              skipped: 0,
              total: 1,
            },
          },
        });
      });

      describe('customization adjacent fields', () => {
        it('does not modify `exception_list` field', async () => {
          const { body: customizedPrebuiltRule } = await detectionsApi.patchRule({
            body: {
              rule_id: 'rule_1',
              description: 'new description',
              exceptions_list: [
                {
                  id: 'some_uuid',
                  list_id: 'list_id_single',
                  namespace_type: 'single',
                  type: 'detection',
                },
              ],
            },
          });

          const response = await revertPrebuiltRule(supertest, {
            id: customizedPrebuiltRule.id,
            version: customizedPrebuiltRule.version,
            revision: customizedPrebuiltRule.revision,
          });

          expect(response.attributes.results.updated).toEqual([
            expect.objectContaining({
              rule_source: {
                is_customized: false,
                type: 'external',
              },
              exceptions_list: [
                expect.objectContaining({
                  id: 'some_uuid',
                  list_id: 'list_id_single',
                  namespace_type: 'single',
                  type: 'detection',
                }),
              ],
            }),
          ]);
        });

        it('does not modify `actions` field', async () => {
          const { body: customizedPrebuiltRule } = await detectionsApi.patchRule({
            body: {
              rule_id: 'rule_1',
              description: 'new description',
              actions: [
                // use a pre-configured connector
                {
                  group: 'default',
                  id: 'my-test-email',
                  action_type_id: '.email',
                  params: {},
                },
              ],
            },
          });

          const response = await revertPrebuiltRule(supertest, {
            id: customizedPrebuiltRule.id,
            version: customizedPrebuiltRule.version,
            revision: customizedPrebuiltRule.revision,
          });

          expect(response.attributes.results.updated).toEqual([
            expect.objectContaining({
              rule_source: {
                is_customized: false,
                type: 'external',
              },
              actions: [
                expect.objectContaining({
                  id: 'my-test-email',
                  action_type_id: '.email',
                  frequency: { notifyWhen: 'onActiveAlert', summary: true, throttle: null },
                  group: 'default',
                  params: {},
                }),
              ],
            }),
          ]);
        });

        it('does not modify `execution_summary` field', async () => {
          const { body: customizedPrebuiltRule } = await detectionsApi.patchRule({
            body: {
              rule_id: 'rule_1',
              description: 'new description',
              enabled: true,
            },
          });

          await waitForRulePartialFailure({ supertest, log, id: customizedPrebuiltRule.id });

          // Get the original execution summary field
          const { body } = await supertest
            .get(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .query({ id: customizedPrebuiltRule.id })
            .expect(200);

          // Revert the rule
          await revertPrebuiltRule(supertest, {
            id: customizedPrebuiltRule.id,
            version: customizedPrebuiltRule.version,
            revision: customizedPrebuiltRule.revision,
          });

          // Get the reverted rule's execution summary field
          const { body: updatedBody } = await supertest
            .get(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .query({ id: customizedPrebuiltRule.id })
            .expect(200);

          expect(updatedBody).toEqual(
            expect.objectContaining({
              rule_source: {
                is_customized: false,
                type: 'external',
              },
              execution_summary: body.execution_summary,
            })
          );
        });

        it('does not modify `enabled` field', async () => {
          const { body: customizedPrebuiltRule } = await detectionsApi.patchRule({
            body: {
              rule_id: 'rule_1',
              description: 'new description',
              enabled: true,
            },
          });

          const response = await revertPrebuiltRule(supertest, {
            id: customizedPrebuiltRule.id,
            version: customizedPrebuiltRule.version,
            revision: customizedPrebuiltRule.revision,
          });

          expect(response.attributes.results.updated).toEqual([
            expect.objectContaining({
              rule_source: {
                is_customized: false,
                type: 'external',
              },
              enabled: true,
            }),
          ]);
        });
      });

      it("skips a prebuilt rule if it's not customized", async () => {
        const { body: nonCustomizedPrebuiltRule } = await detectionsApi
          .readRule({
            query: { rule_id: 'rule_1' },
          })
          .expect(200);

        const response = await revertPrebuiltRule(supertest, {
          id: nonCustomizedPrebuiltRule.id,
          version: nonCustomizedPrebuiltRule.version,
          revision: nonCustomizedPrebuiltRule.revision,
        });

        expect(response).toEqual({
          success: true,
          rules_count: 1,
          attributes: {
            results: {
              updated: [],
              skipped: [
                {
                  id: nonCustomizedPrebuiltRule.id,
                  skip_reason: BulkRevertSkipReasonEnum.RULE_NOT_CUSTOMIZED,
                },
              ],
              created: [],
              deleted: [],
            },
            summary: {
              failed: 0,
              succeeded: 0,
              skipped: 1,
              total: 1,
            },
          },
        });
      });

      it("skips a rule if it's not prebuilt", async () => {
        const { body: customRule } = await detectionsApi.createRule({
          body: getCustomQueryRuleParams({ rule_id: 'rule-1' }),
        });

        const response = await revertPrebuiltRule(supertest, {
          id: customRule.id,
          version: customRule.version,
          revision: customRule.revision,
        });

        expect(response).toEqual({
          success: true,
          rules_count: 1,
          attributes: {
            results: {
              updated: [],
              skipped: [
                {
                  id: customRule.id,
                  skip_reason: BulkRevertSkipReasonEnum.RULE_NOT_PREBUILT,
                },
              ],
              created: [],
              deleted: [],
            },
            summary: {
              failed: 0,
              succeeded: 0,
              skipped: 1,
              total: 1,
            },
          },
        });
      });

      it('throws an error if rule base version cannot be found', async () => {
        const { body: customizedPrebuiltRule } = await detectionsApi.patchRule({
          body: { rule_id: 'rule_1', description: 'new description' },
        });

        await deleteAllPrebuiltRuleAssets(es, log); // Delete rule base versions

        const response = await revertPrebuiltRule(supertest, {
          id: customizedPrebuiltRule.id,
          version: customizedPrebuiltRule.version,
          revision: customizedPrebuiltRule.revision,
        });

        expect(response.message).toEqual('Rule reversion failed');
        expect(response.attributes.summary).toEqual({
          failed: 1,
          succeeded: 0,
          skipped: 0,
          total: 1,
        });
        expect(response.attributes.errors).toEqual([
          expect.objectContaining({
            message: `Cannot find base_version for rule id: ${customizedPrebuiltRule.id}`,
            status_code: 404,
          }),
        ]);
      });

      it("throws an error if version param doesn't equal the fetched rule version", async () => {
        const { body: customizedPrebuiltRule } = await detectionsApi.patchRule({
          body: { rule_id: 'rule_1', description: 'new description' },
        });

        const response = await revertPrebuiltRule(supertest, {
          id: customizedPrebuiltRule.id,
          version: customizedPrebuiltRule.version + 1,
          revision: customizedPrebuiltRule.revision,
        });

        expect(response.message).toEqual('Rule reversion failed');
        expect(response.attributes.summary).toEqual({
          failed: 1,
          succeeded: 0,
          skipped: 0,
          total: 1,
        });
        expect(response.attributes.errors).toEqual([
          expect.objectContaining({
            message: `Version mismatch for rule with id: ${customizedPrebuiltRule.id}. Expected ${
              customizedPrebuiltRule.version + 1
            }, got ${customizedPrebuiltRule.version}`,
            status_code: 409,
          }),
        ]);
      });

      it("throws an error if revision param doesn't equal the fetched rule revision", async () => {
        const { body: customizedPrebuiltRule } = await detectionsApi.patchRule({
          body: { rule_id: 'rule_1', description: 'new description' },
        });

        const response = await revertPrebuiltRule(supertest, {
          id: customizedPrebuiltRule.id,
          version: customizedPrebuiltRule.version,
          revision: customizedPrebuiltRule.revision + 1,
        });

        expect(response.message).toEqual('Rule reversion failed');
        expect(response.attributes.summary).toEqual({
          failed: 1,
          succeeded: 0,
          skipped: 0,
          total: 1,
        });
        expect(response.attributes.errors).toEqual([
          expect.objectContaining({
            message: `Revision mismatch for rule with id: ${customizedPrebuiltRule.id}. Expected ${
              customizedPrebuiltRule.revision + 1
            }, got ${customizedPrebuiltRule.revision}`,
            status_code: 409,
          }),
        ]);
      });
    });
  });
};
