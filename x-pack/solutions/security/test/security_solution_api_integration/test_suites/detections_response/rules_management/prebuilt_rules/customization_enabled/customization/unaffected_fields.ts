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
import { deleteAllRules } from '../../../../../../config/services/detections_response';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  getWebHookAction,
  installPrebuiltRules,
} from '../../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Skip customization detection for unaffected prebuilt rule fields', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    const testUnaffectedFieldsNonCustomized = ({ hasBaseVersion }: { hasBaseVersion: boolean }) => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [QUERY_PREBUILT_RULE_ASSET]);
        await installPrebuiltRules(es, supertest);

        if (!hasBaseVersion) {
          // Remove the prebuilt rule asset so that the base version is no longer available
          await deleteAllPrebuiltRuleAssets(es, log);
        }
      });

      describe('"is_customized" calculation is not affected by', () => {
        const testFieldDoesNotAffectCustomizationState = async ({
          fieldName,
          value,
        }: {
          fieldName: string;
          value: unknown;
        }) => {
          const { body } = await detectionsApi
            .patchRule({
              body: { rule_id: PREBUILT_RULE_ID, [fieldName]: value },
            })
            .expect(200);

          expect(body.rule_source).toMatchObject({
            type: 'external',
            is_customized: false,
          });
        };

        it('"actions" field', async () => {
          // create connector/action
          const { body: hookAction } = await supertest
            .post('/api/actions/connector')
            .set('kbn-xsrf', 'true')
            .send(getWebHookAction())
            .expect(200);

          await testFieldDoesNotAffectCustomizationState({
            fieldName: 'actions',
            value: [
              {
                group: 'default',
                id: hookAction.id,
                action_type_id: hookAction.connector_type_id,
                params: {},
              },
            ],
          });
        });

        it('"exceptions_list" field', () =>
          testFieldDoesNotAffectCustomizationState({
            fieldName: 'exceptions_list',
            value: [
              {
                id: 'some_uuid',
                list_id: 'list_id_single',
                namespace_type: 'single',
                type: 'detection',
              },
            ],
          }));

        it('"enabled" field', () =>
          testFieldDoesNotAffectCustomizationState({
            fieldName: 'enabled',
            value: true,
          }));

        it('"meta" field', () =>
          testFieldDoesNotAffectCustomizationState({
            fieldName: 'meta',
            value: {
              severity_override_field: 'field',
            },
          }));

        it('leaves "is_customized" intact when bulk edit does not change the field value', async () => {
          const { body: prebuiltRule } = await detectionsApi
            .readRule({
              query: { rule_id: PREBUILT_RULE_ID },
            })
            .expect(200);

          expect(prebuiltRule.rule_source.is_customized).toEqual(false);

          const { body: bulkResult } = await detectionsApi
            .performRulesBulkAction({
              query: {},
              body: {
                ids: [prebuiltRule.id],
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type: BulkActionEditTypeEnum.add_tags,
                    // This tag is already present on the rule, so the change will be skipped
                    value: [...prebuiltRule.tags],
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
          const { body: unchangedPrebuiltRule } = await detectionsApi
            .readRule({
              query: { rule_id: PREBUILT_RULE_ID },
            })
            .expect(200);

          expect(unchangedPrebuiltRule.rule_source.is_customized).toEqual(false);
        });
      });

      describe('cannot change non-customizable rule fields', () => {
        it('"id" field', async () => {
          await detectionsApi
            .patchRule({
              body: {
                rule_id: PREBUILT_RULE_ID,
                id: 'new-id',
              },
            })
            .expect(400);
        });

        it('"author" field', async () => {
          await detectionsApi
            .patchRule({
              body: {
                rule_id: PREBUILT_RULE_ID,
                author: ['new author'],
              },
            })
            .expect(400);
        });

        it('"license" field', async () => {
          await detectionsApi
            .patchRule({
              body: {
                rule_id: PREBUILT_RULE_ID,
                license: 'custom-license',
              },
            })
            .expect(400);
        });
      });
    };

    describe('when base version is available', () => {
      testUnaffectedFieldsNonCustomized({ hasBaseVersion: true });
    });

    describe('when base version is missing', () => {
      testUnaffectedFieldsNonCustomized({ hasBaseVersion: false });
    });
  });
};

const PREBUILT_RULE_ID = 'test-prebuilt-rule';
const QUERY_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  rule_id: PREBUILT_RULE_ID,
  version: 3,
  tags: ['test-tag'],
});
