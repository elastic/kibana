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

  const PREBUILT_RULE_ID_A = 'test-prebuilt-rule-a';
  const PREBUILT_RULE_ID_B = 'test-prebuilt-rule-b';
  const [PREBUILT_RULE_A, PREBUILT_RULE_B] = [
    createRuleAssetSavedObject({
      rule_id: PREBUILT_RULE_ID_A,
      tags: ['test-tag'],
    }),
    createRuleAssetSavedObject({
      rule_id: PREBUILT_RULE_ID_B,
      tags: ['test-tag-2'],
    }),
  ];
  const PREBUILT_RULE_ASSETS = [PREBUILT_RULE_A, PREBUILT_RULE_B];

  /**
   * This test suite is skipped in Serverless MKI environments due to reliance on the
   * feature flag for prebuilt rule customization.
   */
  describe('@ess @serverless @skipInServerlessMKI Export prebuilt rules', () => {
    beforeEach(async () => {
      await deleteAllPrebuiltRuleAssets(es, log);
      await deleteAllRules(supertest, log);
      await createPrebuiltRuleAssetSavedObjects(es, PREBUILT_RULE_ASSETS);
      await installPrebuiltRules(es, supertest);
    });

    it('exports non-customized prebuilt rules via the _export API', async () => {
      const { body: exportResult } = await securitySolutionApi
        .exportRules({ query: {}, body: null })
        .expect(200)
        .parse(binaryToString);

      const parsedExportResult = parseNdJson(exportResult);

      expect(parsedExportResult).toEqual(
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

    it('exports prebuilt rule fields correctly via _export API', async () => {
      const { body: exportResult } = await securitySolutionApi
        .exportRules({ query: {}, body: null })
        .expect(200)
        .parse(binaryToString);

      const parsedExportResult = parseNdJson(exportResult);

      expect(parsedExportResult).toEqual(
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
    });

    it('exports customized prebuilt rules via the _export API', async () => {
      await securitySolutionApi
        .patchRule({
          body: {
            rule_id: PREBUILT_RULE_ID_A,
            tags: ['custom-tag-a'],
          },
        })
        .expect(200);
      await securitySolutionApi
        .patchRule({
          body: {
            rule_id: PREBUILT_RULE_ID_B,
            tags: ['custom-tag-b'],
          },
        })
        .expect(200);

      const { body: secondExportResult } = await securitySolutionApi
        .exportRules({ query: {}, body: null })
        .expect(200)
        .parse(binaryToString);

      expect(parseNdJson(secondExportResult)).toEqual(
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
    });

    it('exports custom and prebuilt rules via the _export API', async () => {
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
          expect.objectContaining({
            rule_id: 'rule-id-1',
            immutable: false,
            rule_source: {
              type: 'internal',
            },
          }),
          expect.objectContaining({
            rule_id: 'rule-id-2',
            immutable: false,
            rule_source: {
              type: 'internal',
            },
          }),
        ])
      );
    });

    it('exports custom and prebuilt rules by rule_id via the _export API', async () => {
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
            objects: [{ rule_id: PREBUILT_RULE_ID_B }, { rule_id: 'rule-id-2' }],
          },
        })
        .expect(200)
        .parse(binaryToString);

      const exportJson = parseNdJson(exportResult);
      expect(exportJson).toHaveLength(3); // 1 prebuilt rule + 1 custom rule + 1 stats object

      expect(exportJson).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: PREBUILT_RULE_ID_B,
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          }),
          expect.objectContaining({
            rule_id: 'rule-id-2',
            immutable: false,
            rule_source: {
              type: 'internal',
            },
          }),
        ])
      );
    });

    it('exports prebuilt rules in bulk via _export API', async () => {
      const { body } = await securitySolutionApi
        .exportRules({ query: {}, body: null })
        .expect(200)
        .parse(binaryToString);

      const exportJson = parseNdJson(body);

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

      const exportStats = exportJson.at(-1);

      expect(exportStats).toMatchObject({
        exported_rules_count: 2,
        missing_rules: [],
      });
    });

    it('exports prebuilt rules via the bulk actions API', async () => {
      const { body } = await securitySolutionApi
        .performRulesBulkAction({
          query: {},
          body: { action: BulkActionTypeEnum.export },
        })
        .expect(200)
        .parse(binaryToString);

      const exportJson = parseNdJson(body);

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
      const {
        body: { data: prebuiltRules },
      } = await securitySolutionApi
        .findRules({
          query: { page: 1, per_page: 2, filter: 'alert.attributes.params.immutable: true' },
        })
        .expect(200);
      const prebuiltRuleIds = prebuiltRules.map((rule: RuleResponse) => rule.id);

      const { body } = await securitySolutionApi
        .performRulesBulkAction({
          query: {},
          body: { action: BulkActionTypeEnum.export, ids: prebuiltRuleIds },
        })
        .expect(200)
        .parse(binaryToString);

      const exportJson = parseNdJson(body);

      expect(exportJson).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: prebuiltRuleIds[0],
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          }),
          expect.objectContaining({
            id: prebuiltRuleIds[1],
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          }),
        ])
      );
    });

    it('exports a mix of custom and prebuilt rules via the bulk actions API', async () => {
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
          expect.objectContaining({
            rule_id: 'rule-id-1',
            immutable: false,
            rule_source: {
              type: 'internal',
            },
          }),
          expect.objectContaining({
            rule_id: 'rule-id-2',
            immutable: false,
            rule_source: {
              type: 'internal',
            },
          }),
        ])
      );
    });
  });
};
