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
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import {
  binaryToString,
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  getCustomQueryRuleParams,
  installPrebuiltRules,
} from '../../../../utils';

const parseNdJson = (ndJson: Buffer): unknown[] =>
  ndJson
    .toString()
    .split('\n')
    .filter((line) => !!line)
    .map((line) => JSON.parse(line));

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');

  /**
   * This test suite is skipped in Serverless MKI environments due to reliance on the
   * feature flag for prebuilt rule customization.
   */
  describe('@ess @serverless @skipInServerlessMKI Exporting Rules with Prebuilt Rule Customization', () => {
    beforeEach(async () => {
      await deleteAllPrebuiltRuleAssets(es, log);
      await deleteAllRules(supertest, log);
    });

    it('exports a set of custom installed rules via the _export API', async () => {
      await Promise.all([
        securitySolutionApi
          .createRule({ body: getCustomQueryRuleParams({ rule_id: 'rule-id-1' }) })
          .expect(200),
        securitySolutionApi
          .createRule({ body: getCustomQueryRuleParams({ rule_id: 'rule-id-2' }) })
          .expect(200),
      ]);

      const { body: exportResult } = await securitySolutionApi
        .exportRules({ query: {}, body: null })
        .expect(200)
        .parse(binaryToString);

      const ndJson = parseNdJson(exportResult);

      expect(ndJson).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-id-1',
            rule_source: {
              type: 'internal',
            },
          }),
          expect.objectContaining({
            rule_id: 'rule-id-2',
            rule_source: {
              type: 'internal',
            },
          }),
        ])
      );
    });

    describe('with prebuilt rules installed', () => {
      let ruleAssets: Array<ReturnType<typeof createRuleAssetSavedObject>>;

      beforeEach(async () => {
        ruleAssets = [
          createRuleAssetSavedObject({
            rule_id: '000047bb-b27a-47ec-8b62-ef1a5d2c9e19',
            tags: ['test-tag'],
          }),
          createRuleAssetSavedObject({
            rule_id: '60b88c41-c45d-454d-945c-5809734dfb34',
            tags: ['test-tag-2'],
          }),
        ];
        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);
        await installPrebuiltRules(es, supertest);
      });

      it('exports a set of prebuilt installed rules via the _export API', async () => {
        const { body: exportResult } = await securitySolutionApi
          .exportRules({ query: {}, body: null })
          .expect(200)
          .parse(binaryToString);

        const parsedExportResult = parseNdJson(exportResult);

        expect(parsedExportResult).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: ruleAssets[0]['security-rule'].rule_id,
              rule_source: {
                type: 'external',
                is_customized: false,
              },
            }),
            expect.objectContaining({
              rule_id: ruleAssets[1]['security-rule'].rule_id,
              rule_source: {
                type: 'external',
                is_customized: false,
              },
            }),
          ])
        );

        const [firstExportedRule, secondExportedRule] = parsedExportResult as Array<{
          id: string;
          rule_id: string;
        }>;

        const { body: bulkEditResult } = await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              ids: [firstExportedRule.id],
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

        expect(bulkEditResult.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 1,
          total: 1,
        });
        expect(bulkEditResult.attributes.results.updated[0].rule_source.is_customized).toEqual(
          true
        );

        const { body: secondExportResult } = await securitySolutionApi
          .exportRules({ query: {}, body: null })
          .expect(200)
          .parse(binaryToString);

        expect(parseNdJson(secondExportResult)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: firstExportedRule.rule_id,
              rule_source: {
                type: 'external',
                is_customized: true,
              },
            }),
            expect.objectContaining({
              rule_id: secondExportedRule.rule_id,
              rule_source: {
                type: 'external',
                is_customized: false,
              },
            }),
          ])
        );
      });

      it('exports a set of custom and prebuilt installed rules via the _export API', async () => {
        await Promise.all([
          securitySolutionApi
            .createRule({ body: getCustomQueryRuleParams({ rule_id: 'rule-id-1' }) })
            .expect(200),
          securitySolutionApi
            .createRule({ body: getCustomQueryRuleParams({ rule_id: 'rule-id-2' }) })
            .expect(200),
        ]);

        const { body: exportResult } = await securitySolutionApi
          .exportRules({ query: {}, body: null })
          .expect(200)
          .parse(binaryToString);

        const exportJson = parseNdJson(exportResult);
        expect(exportJson).toHaveLength(5); // 2 prebuilt rules + 2 custom rules + 1 stats object

        expect(exportJson).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: ruleAssets[0]['security-rule'].rule_id,
              rule_source: {
                type: 'external',
                is_customized: false,
              },
            }),
            expect.objectContaining({
              rule_id: ruleAssets[1]['security-rule'].rule_id,
              rule_source: {
                type: 'external',
                is_customized: false,
              },
            }),
            expect.objectContaining({
              rule_id: 'rule-id-1',
              rule_source: {
                type: 'internal',
              },
            }),
            expect.objectContaining({
              rule_id: 'rule-id-2',
              rule_source: {
                type: 'internal',
              },
            }),
          ])
        );
      });

      it('exports both custom and prebuilt rules when rule_ids are specified via the _export API', async () => {
        await Promise.all([
          securitySolutionApi
            .createRule({ body: getCustomQueryRuleParams({ rule_id: 'rule-id-1' }) })
            .expect(200),
          securitySolutionApi
            .createRule({ body: getCustomQueryRuleParams({ rule_id: 'rule-id-2' }) })
            .expect(200),
        ]);

        const { body: exportResult } = await securitySolutionApi
          .exportRules({
            query: {},
            body: {
              objects: [
                { rule_id: ruleAssets[1]['security-rule'].rule_id },
                { rule_id: 'rule-id-2' },
              ],
            },
          })
          .expect(200)
          .parse(binaryToString);

        const exportJson = parseNdJson(exportResult);
        expect(exportJson).toHaveLength(3); // 1 prebuilt rule + 1 custom rule + 1 stats object

        expect(exportJson).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: ruleAssets[1]['security-rule'].rule_id,
              rule_source: {
                type: 'external',
                is_customized: false,
              },
            }),
            expect.objectContaining({
              rule_id: 'rule-id-2',
              rule_source: {
                type: 'internal',
              },
            }),
          ])
        );
      });

      it('exports a set of custom and prebuilt installed rules via the bulk_actions API', async () => {
        await Promise.all([
          securitySolutionApi
            .createRule({ body: getCustomQueryRuleParams({ rule_id: 'rule-id-1' }) })
            .expect(200),
          securitySolutionApi
            .createRule({ body: getCustomQueryRuleParams({ rule_id: 'rule-id-2' }) })
            .expect(200),
        ]);

        const { body: exportResult } = await securitySolutionApi
          .performRulesBulkAction({
            body: { query: '', action: BulkActionTypeEnum.export },
            query: {},
          })
          .expect(200)
          .expect('Content-Type', 'application/ndjson')
          .expect('Content-Disposition', 'attachment; filename="rules_export.ndjson"')
          .parse(binaryToString);

        const exportJson = parseNdJson(exportResult);
        expect(exportJson).toHaveLength(5); // 2 prebuilt rules + 2 custom rules + 1 stats object

        expect(exportJson).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: ruleAssets[0]['security-rule'].rule_id,
              rule_source: {
                type: 'external',
                is_customized: false,
              },
            }),
            expect.objectContaining({
              rule_id: ruleAssets[1]['security-rule'].rule_id,
              rule_source: {
                type: 'external',
                is_customized: false,
              },
            }),
            expect.objectContaining({
              rule_id: 'rule-id-1',
              rule_source: {
                type: 'internal',
              },
            }),
            expect.objectContaining({
              rule_id: 'rule-id-2',
              rule_source: {
                type: 'internal',
              },
            }),
          ])
        );
      });
    });
  });
};
