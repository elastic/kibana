/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  SAMPLE_PREBUILT_RULES_WITH_HISTORICAL_VERSIONS,
  combineArrayToNdJson,
  createHistoricalPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');
  const retryService = getService('retry');

  const RULE_ID = 'prebuilt-rule';
  const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
    rule_id: RULE_ID,
    version: 1,
    name: 'Stock name',
    description: 'Stock description',
  });

  const importRule = async ({ rule, overwrite }: { rule: unknown; overwrite: boolean }) => {
    const buffer = Buffer.from(combineArrayToNdJson([rule]));

    return securitySolutionApi
      .importRules({
        query: { overwrite },
      })
      .attach('file', buffer, 'rules.ndjson')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(200);
  };

  const prebuiltRules = SAMPLE_PREBUILT_RULES_WITH_HISTORICAL_VERSIONS.map(
    (prebuiltRule) => prebuiltRule['security-rule']
  );
  const prebuiltRuleIds = [...new Set(prebuiltRules.map((rule) => rule.rule_id))];

  describe('@ess @serverless @skipInServerlessMKI Import prebuilt rules', () => {
    before(async () => {
      await deleteAllPrebuiltRuleAssets(es, log);
      await createHistoricalPrebuiltRuleAssetSavedObjects(es, [PREBUILT_RULE_ASSET]);
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    after(async () => {
      await deleteAllPrebuiltRuleAssets(es, log);
      await deleteAllRules(supertest, log);
    });

    describe('importing a single non-customized prebuilt rule', () => {
      const PREBUILT_RULE_TO_IMPORT = PREBUILT_RULE_ASSET['security-rule'];

      describe('without overwriting', () => {
        it('imports a non-customized prebuilt rule', async () => {
          const { body: importResponse } = await importRule({
            rule: PREBUILT_RULE_TO_IMPORT,
            overwrite: false,
          });

          expect(importResponse).toMatchObject({
            rules_count: 1,
            success: true,
            success_count: 1,
            errors: [],
          });

          const { body: importedRule } = await securitySolutionApi
            .readRule({
              query: { rule_id: RULE_ID },
            })
            .expect(200);

          expect(importedRule).toMatchObject({
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          });
        });

        it('imports non-customized prebuilt rule fields', async () => {
          const { body: importResponse } = await importRule({
            rule: PREBUILT_RULE_TO_IMPORT,
            overwrite: false,
          });

          expect(importResponse.success).toBeTruthy();

          const { body: importedRule } = await securitySolutionApi
            .readRule({
              query: { rule_id: RULE_ID },
            })
            .expect(200);

          expect(importedRule).toMatchObject({
            ...PREBUILT_RULE_TO_IMPORT,
          });
        });
      });

      describe('with overwriting', () => {
        it('imports a non-customized prebuilt rule on top of an installed non-customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          const { body: importResponse } = await importRule({
            rule: PREBUILT_RULE_TO_IMPORT,
            overwrite: true,
          });

          expect(importResponse).toMatchObject({
            rules_count: 1,
            success: true,
            success_count: 1,
            errors: [],
          });

          const { body: importedRule } = await securitySolutionApi
            .readRule({
              query: { rule_id: RULE_ID },
            })
            .expect(200);

          expect(importedRule).toMatchObject({
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          });
        });

        it('imports non-customized prebuilt rule fields on top of an installed non-customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          const { body: importResponse } = await importRule({
            rule: PREBUILT_RULE_TO_IMPORT,
            overwrite: true,
          });

          expect(importResponse.success).toBeTruthy();

          const { body: importedRule } = await securitySolutionApi
            .readRule({
              query: { rule_id: RULE_ID },
            })
            .expect(200);

          expect(importedRule).toMatchObject({
            ...PREBUILT_RULE_TO_IMPORT,
          });
        });

        it('imports a non-customized prebuilt rule on top of an installed customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          await securitySolutionApi.patchRule({
            body: {
              rule_id: RULE_ID,
              name: 'Customized Rule',
            },
          });

          const { body: importResponse } = await importRule({
            rule: PREBUILT_RULE_TO_IMPORT,
            overwrite: true,
          });

          expect(importResponse).toMatchObject({
            rules_count: 1,
            success: true,
            success_count: 1,
            errors: [],
          });

          const { body: importedRule } = await securitySolutionApi
            .readRule({
              query: { rule_id: RULE_ID },
            })
            .expect(200);

          expect(importedRule).toMatchObject({
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          });
        });

        it('imports non-customized prebuilt rule fields on top of an installed customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          await securitySolutionApi
            .patchRule({
              body: {
                rule_id: RULE_ID,
                name: 'Customized Rule',
              },
            })
            .expect(200);

          const { body: importResponse } = await importRule({
            rule: PREBUILT_RULE_TO_IMPORT,
            overwrite: true,
          });

          expect(importResponse.success).toBeTruthy();

          const { body: importedRule } = await securitySolutionApi
            .readRule({
              query: { rule_id: RULE_ID },
            })
            .expect(200);

          expect(importedRule).toMatchObject({
            ...PREBUILT_RULE_TO_IMPORT,
          });
        });
      });
    });

    describe('importing a single customized prebuilt rule', () => {
      const CUSTOMIZED_PREBUILT_RULE_TO_IMPORT = {
        ...PREBUILT_RULE_ASSET['security-rule'],
        name: 'Customized Prebuilt Rule',
      };

      describe('without overwriting', () => {
        it('imports a customized prebuilt rule', async () => {
          const { body: importResponse } = await importRule({
            rule: CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
            overwrite: false,
          });

          expect(importResponse).toMatchObject({
            rules_count: 1,
            success: true,
            success_count: 1,
            errors: [],
          });

          const { body: importedRule } = await securitySolutionApi
            .readRule({
              query: { rule_id: RULE_ID },
            })
            .expect(200);

          expect(importedRule).toMatchObject({
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: true,
            },
          });
        });

        it('imports customized prebuilt rule fields', async () => {
          const { body: importResponse } = await importRule({
            rule: CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
            overwrite: false,
          });

          expect(importResponse.success).toBeTruthy();

          const { body: importedRule } = await securitySolutionApi
            .readRule({
              query: { rule_id: RULE_ID },
            })
            .expect(200);

          expect(importedRule).toMatchObject({
            ...CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
          });
        });
      });

      describe('with overwriting', () => {
        it('imports a customized prebuilt rule on top of an installed non-customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          const { body: importResponse } = await importRule({
            rule: CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
            overwrite: true,
          });

          expect(importResponse).toMatchObject({
            rules_count: 1,
            success: true,
            success_count: 1,
            errors: [],
          });

          const { body: importedRule } = await securitySolutionApi
            .readRule({
              query: { rule_id: RULE_ID },
            })
            .expect(200);

          expect(importedRule).toMatchObject({
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: true,
            },
          });
        });

        it('imports customized prebuilt rule fields on top of an installed non-customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          const { body: importResponse } = await importRule({
            rule: CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
            overwrite: true,
          });

          expect(importResponse.success).toBeTruthy();

          const { body: importedRule } = await securitySolutionApi
            .readRule({
              query: { rule_id: RULE_ID },
            })
            .expect(200);

          expect(importedRule).toMatchObject({
            ...CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
          });
        });

        it('imports a customized prebuilt rule on top of an installed customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          await securitySolutionApi.patchRule({
            body: {
              rule_id: RULE_ID,
              description: 'Customized Rule',
            },
          });

          const { body: importResponse } = await importRule({
            rule: CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
            overwrite: true,
          });

          expect(importResponse).toMatchObject({
            rules_count: 1,
            success: true,
            success_count: 1,
            errors: [],
          });

          const { body: importedRule } = await securitySolutionApi
            .readRule({
              query: { rule_id: RULE_ID },
            })
            .expect(200);

          expect(importedRule).toMatchObject({
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: true,
            },
          });
        });

        it('imports customized prebuilt rule fields on top of an installed customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          await securitySolutionApi
            .patchRule({
              body: {
                rule_id: RULE_ID,
                name: 'Customized Rule',
              },
            })
            .expect(200);

          const { body: importResponse } = await importRule({
            rule: CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
            overwrite: true,
          });

          expect(importResponse.success).toBeTruthy();

          const { body: importedRule } = await securitySolutionApi
            .readRule({
              query: { rule_id: RULE_ID },
            })
            .expect(200);

          expect(importedRule).toMatchObject({
            ...CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
          });
        });
      });
    });
  });
};
