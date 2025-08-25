/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  BulkActionTypeEnum,
  RuleResponse,
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
  parseNdJson,
} from '../../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');

  const PREBUILT_RULE_ID_A = 'test-prebuilt-rule-a';
  const PREBUILT_RULE_ID_B = 'test-prebuilt-rule-b';
  const PREBUILT_RULE_A = createRuleAssetSavedObject({
    rule_id: PREBUILT_RULE_ID_A,
    name: 'Non-customized prebuilt rule A',
    version: 2,
  });
  const PREBUILT_RULE_B = createRuleAssetSavedObject({
    rule_id: PREBUILT_RULE_ID_B,
    name: 'Non-customized prebuilt rule B',
    version: 3,
  });

  describe('@ess @serverless @skipInServerlessMKI Export prebuilt rules', () => {
    beforeEach(async () => {
      await deleteAllPrebuiltRuleAssets(es, log);
      await deleteAllRules(supertest, log);
    });

    const exportActions = [
      {
        name: '_export API',
        exportRules: async () => {
          const { body: exportResult } = await securitySolutionApi
            .exportRules({
              query: {},
              body: null,
            })
            .expect(200)
            .parse(binaryToString);

          return parseNdJson(exportResult);
        },
      },
      {
        name: 'bulk actions API',
        exportRules: async () => {
          const { body } = await securitySolutionApi
            .performRulesBulkAction({
              query: {},
              body: { action: BulkActionTypeEnum.export },
            })
            .expect(200)
            .parse(binaryToString);

          return parseNdJson(body);
        },
      },
    ];

    for (const { name, exportRules } of exportActions) {
      describe(name, () => {
        it('exports non-customized prebuilt rules', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, [PREBUILT_RULE_A, PREBUILT_RULE_B]);
          await installPrebuiltRules(es, supertest);

          const exportResult = await exportRules();

          // Assert customization state
          expect(exportResult).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                rule_id: PREBUILT_RULE_ID_A,
                immutable: true,
                rule_source: {
                  type: 'external',
                  is_customized: false,
                },
              }),
              expect.objectContaining({
                rule_id: PREBUILT_RULE_ID_B,
                immutable: true,
                rule_source: {
                  type: 'external',
                  is_customized: false,
                },
              }),
            ])
          );

          // Assert exported prebuilt rule fields
          expect(exportResult).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                ...PREBUILT_RULE_A['security-rule'],
                rule_id: PREBUILT_RULE_ID_A,
              }),
              expect.objectContaining({
                ...PREBUILT_RULE_B['security-rule'],
                rule_id: PREBUILT_RULE_ID_B,
              }),
            ])
          );

          const exportStats = exportResult.at(-1);

          // Assert export stats
          expect(exportStats).toMatchObject({
            exported_rules_count: 2,
            missing_rules: [],
          });
        });

        it('exports customized prebuilt rules', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, [PREBUILT_RULE_A, PREBUILT_RULE_B]);
          await installPrebuiltRules(es, supertest);

          await securitySolutionApi
            .patchRule({
              body: {
                rule_id: PREBUILT_RULE_ID_A,
                name: 'Customized prebuilt rule A',
                tags: ['custom-tag-a'],
              },
            })
            .expect(200);
          await securitySolutionApi
            .patchRule({
              body: {
                rule_id: PREBUILT_RULE_ID_B,
                name: 'Customized prebuilt rule B',
                tags: ['custom-tag-b'],
              },
            })
            .expect(200);

          const exportResult = await exportRules();

          // Assert customization state
          expect(exportResult).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                rule_id: PREBUILT_RULE_ID_A,
                immutable: true,
                rule_source: {
                  type: 'external',
                  is_customized: true,
                },
              }),
              expect.objectContaining({
                rule_id: PREBUILT_RULE_ID_B,
                immutable: true,
                rule_source: {
                  type: 'external',
                  is_customized: true,
                },
              }),
            ])
          );

          // Assert exported prebuilt rule fields
          expect(exportResult).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                ...PREBUILT_RULE_A['security-rule'],
                rule_id: PREBUILT_RULE_ID_A,
                name: 'Customized prebuilt rule A',
                tags: ['custom-tag-a'],
              }),
              expect.objectContaining({
                ...PREBUILT_RULE_B['security-rule'],
                rule_id: PREBUILT_RULE_ID_B,
                name: 'Customized prebuilt rule B',
                tags: ['custom-tag-b'],
              }),
            ])
          );

          const exportStats = exportResult.at(-1);

          // Assert export stats
          expect(exportStats).toMatchObject({
            exported_rules_count: 2,
            missing_rules: [],
          });
        });

        it('exports a mix of custom and prebuilt rules', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, [PREBUILT_RULE_A, PREBUILT_RULE_B]);
          await installPrebuiltRules(es, supertest);

          const CUSTOM_RULE_ID_1 = 'custom-rule-id-1';
          const CUSTOM_RULE_ID_2 = 'custom-rule-id-2';

          await Promise.all([
            securitySolutionApi
              .createRule({ body: getCustomQueryRuleParams({ rule_id: CUSTOM_RULE_ID_1 }) })
              .expect(200),
            securitySolutionApi
              .createRule({ body: getCustomQueryRuleParams({ rule_id: CUSTOM_RULE_ID_2 }) })
              .expect(200),
            await securitySolutionApi
              .patchRule({
                body: {
                  rule_id: PREBUILT_RULE_ID_B,
                  name: 'Customized prebuilt rule B',
                  tags: ['custom-tag-b'],
                },
              })
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
                rule_id: PREBUILT_RULE_ID_A,
                immutable: true,
                rule_source: {
                  type: 'external',
                  is_customized: false,
                },
              }),
              expect.objectContaining({
                rule_id: PREBUILT_RULE_ID_B,
                immutable: true,
                rule_source: {
                  type: 'external',
                  is_customized: true,
                },
              }),
              expect.objectContaining({
                rule_id: CUSTOM_RULE_ID_1,
                immutable: false,
                rule_source: {
                  type: 'internal',
                },
              }),
              expect.objectContaining({
                rule_id: CUSTOM_RULE_ID_2,
                immutable: false,
                rule_source: {
                  type: 'internal',
                },
              }),
            ])
          );
        });

        it('imports a previously exported mix of custom and prebuilt rules', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, [PREBUILT_RULE_A, PREBUILT_RULE_B]);
          await installPrebuiltRules(es, supertest);

          const CUSTOM_RULE_ID = 'rule-id-1';
          const CUSTOM_RULE = getCustomQueryRuleParams({ rule_id: CUSTOM_RULE_ID });

          await securitySolutionApi.createRule({ body: CUSTOM_RULE }).expect(200);

          await securitySolutionApi
            .patchRule({
              body: {
                rule_id: PREBUILT_RULE_ID_B,
                tags: ['custom-tag-b'],
              },
            })
            .expect(200);

          const { body: exportResult } = await securitySolutionApi
            .performRulesBulkAction({
              body: { query: '', action: BulkActionTypeEnum.export },
              query: {},
            })
            .expect(200)
            .expect('Content-Type', 'application/ndjson')
            .expect('Content-Disposition', 'attachment; filename="rules_export.ndjson"')
            .parse(binaryToString);

          await deleteAllRules(supertest, log);

          await securitySolutionApi
            .importRules({ query: { overwrite: false } })
            .attach('file', exportResult, 'rules.ndjson')
            .expect('Content-Type', 'application/json; charset=utf-8')
            .expect(200);

          const {
            body: { data: importedRules },
          } = await securitySolutionApi
            .findRules({
              query: {},
            })
            .expect(200);

          expect(importedRules).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                rule_id: PREBUILT_RULE_ID_A,
                immutable: true,
                rule_source: { type: 'external', is_customized: false },
              }),
              expect.objectContaining({
                rule_id: PREBUILT_RULE_ID_B,
                immutable: true,
                rule_source: { type: 'external', is_customized: true },
              }),
              expect.objectContaining({
                rule_id: CUSTOM_RULE_ID,
                immutable: false,
                rule_source: { type: 'internal' },
              }),
            ])
          );

          expect(importedRules).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                ...PREBUILT_RULE_A['security-rule'],
                rule_id: PREBUILT_RULE_ID_A,
              }),
              expect.objectContaining({
                ...PREBUILT_RULE_B['security-rule'],
                rule_id: PREBUILT_RULE_ID_B,
                tags: ['custom-tag-b'],
              }),
              expect.objectContaining({
                rule_id: CUSTOM_RULE_ID,
                ...CUSTOM_RULE,
              }),
            ])
          );
        });
      });
    }

    it('exports prebuilt rules by rule_ids via the _export API', async () => {
      await createPrebuiltRuleAssetSavedObjects(es, [
        PREBUILT_RULE_A,
        PREBUILT_RULE_B,
        createRuleAssetSavedObject({
          rule_id: 'test-prebuilt-rule-c',
          name: 'Non-customized prebuilt rule C',
          version: 5,
        }),
      ]);
      await installPrebuiltRules(es, supertest);

      const { body: exportResult } = await securitySolutionApi
        .exportRules({
          query: {},
          body: { objects: [{ rule_id: PREBUILT_RULE_ID_A }, { rule_id: PREBUILT_RULE_ID_B }] },
        })
        .expect(200)
        .parse(binaryToString);

      const exportJson = parseNdJson(exportResult);

      expect(exportJson).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: PREBUILT_RULE_ID_A,
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          }),
          expect.objectContaining({
            rule_id: PREBUILT_RULE_ID_B,
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          }),
        ])
      );
    });

    it('exports prebuilt rules by ids via the bulk actions API', async () => {
      await createPrebuiltRuleAssetSavedObjects(es, [PREBUILT_RULE_A, PREBUILT_RULE_B]);
      await installPrebuiltRules(es, supertest);

      const {
        body: { data: prebuiltRules },
      } = await securitySolutionApi
        .findRules({
          query: { page: 1, per_page: 2, filter: 'alert.attributes.params.immutable: true' },
        })
        .expect(200);

      const prebuiltRuleObjectIds = prebuiltRules.map((rule: RuleResponse) => rule.id);

      const { body: exportResult } = await securitySolutionApi
        .performRulesBulkAction({
          query: {},
          body: { action: BulkActionTypeEnum.export, ids: prebuiltRuleObjectIds },
        })
        .expect(200)
        .parse(binaryToString);

      const exportJson = parseNdJson(exportResult);

      expect(exportJson).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: prebuiltRuleObjectIds[0],
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          }),
          expect.objectContaining({
            id: prebuiltRuleObjectIds[1],
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          }),
        ])
      );
    });
  });
};
