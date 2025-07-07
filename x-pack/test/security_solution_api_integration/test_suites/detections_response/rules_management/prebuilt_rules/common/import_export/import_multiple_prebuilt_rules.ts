/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  createHistoricalPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  getCustomQueryRuleParams,
  installMockPrebuiltRulesPackage,
  installPrebuiltRules,
  importRulesWithSuccess,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');

  const [PREBUILT_RULE_ID_A, PREBUILT_RULE_ID_B] = ['prebuilt-rule-a', 'prebuilt-rule-b'];
  const [PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B] = [
    createRuleAssetSavedObject({
      rule_id: PREBUILT_RULE_ID_A,
      version: 1,
      name: 'Stock rule name A',
      description: 'Stock rule description A',
    }),
    createRuleAssetSavedObject({
      rule_id: PREBUILT_RULE_ID_B,
      version: 1,
      name: 'Stock rule name B',
      description: 'Stock rule description B',
    }),
  ];

  // These scenarios are "smoke tests" for all the user stories from the test plan's Product requirements section.
  describe('@ess @serverless @skipInServerlessMKI Import multiple prebuilt rules', () => {
    before(async () => {
      await installMockPrebuiltRulesPackage(es, supertest);
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
      await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
        PREBUILT_RULE_ASSET_A,
        PREBUILT_RULE_ASSET_B,
      ]);
    });

    after(async () => {
      await deleteAllPrebuiltRuleAssets(es, log);
      await deleteAllRules(supertest, log);
    });

    const NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT = {
      ...PREBUILT_RULE_ASSET_A['security-rule'],
      immutable: true,
      rule_source: { type: 'external', is_customized: false },
    };
    const CUSTOMIZED_PREBUILT_RULE_TO_IMPORT = {
      ...PREBUILT_RULE_ASSET_B['security-rule'],
      name: 'Customized Prebuilt Rule',
      immutable: true,
      rule_source: { type: 'external', is_customized: true },
    };
    const CUSTOM_RULE_TO_IMPORT = getCustomQueryRuleParams({
      rule_id: 'custom-rule',
      version: 1,
    });
    const IMPORT_PAYLOAD = [
      NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
      CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
      CUSTOM_RULE_TO_IMPORT,
    ];

    describe('without overwriting', () => {
      it('imports a mixture of new prebuilt and custom rules', async () => {
        await importRulesWithSuccess({
          getService,
          rules: IMPORT_PAYLOAD,
          overwrite: false,
        });

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
              rule_id: 'custom-rule',
              immutable: false,
              rule_source: { type: 'internal' },
            }),
          ])
        );

        expect(importedRules).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ...NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              rule_id: PREBUILT_RULE_ID_A,
            }),
            expect.objectContaining({
              ...CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              rule_id: PREBUILT_RULE_ID_B,
            }),
            expect.objectContaining({
              rule_id: 'custom-rule',
              ...CUSTOM_RULE_TO_IMPORT,
            }),
          ])
        );
      });

      it('imports the correct payload of a mixture of new prebuilt and custom rules', async () => {
        await importRulesWithSuccess({
          getService,
          rules: IMPORT_PAYLOAD,
          overwrite: false,
        });

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
              ...NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              rule_id: PREBUILT_RULE_ID_A,
            }),
            expect.objectContaining({
              ...CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              rule_id: PREBUILT_RULE_ID_B,
            }),
            expect.objectContaining({
              rule_id: 'custom-rule',
              ...CUSTOM_RULE_TO_IMPORT,
            }),
          ])
        );
      });
    });

    describe('with overwriting (prebuilt rules installed)', () => {
      it('imports a mixture of new prebuilt and custom rules', async () => {
        await installPrebuiltRules(es, supertest);

        await importRulesWithSuccess({
          getService,
          rules: IMPORT_PAYLOAD,
          overwrite: true,
        });

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
              rule_id: 'custom-rule',
              immutable: false,
              rule_source: { type: 'internal' },
            }),
          ])
        );

        expect(importedRules).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ...NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              rule_id: PREBUILT_RULE_ID_A,
            }),
            expect.objectContaining({
              ...CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              rule_id: PREBUILT_RULE_ID_B,
            }),
            expect.objectContaining({
              rule_id: 'custom-rule',
              ...CUSTOM_RULE_TO_IMPORT,
            }),
          ])
        );
      });

      it('imports the correct payload of a mixture of new prebuilt and custom rules', async () => {
        await installPrebuiltRules(es, supertest);

        await importRulesWithSuccess({
          getService,
          rules: IMPORT_PAYLOAD,
          overwrite: true,
        });

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
              ...NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              rule_id: PREBUILT_RULE_ID_A,
            }),
            expect.objectContaining({
              ...CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              rule_id: PREBUILT_RULE_ID_B,
            }),
            expect.objectContaining({
              rule_id: 'custom-rule',
              ...CUSTOM_RULE_TO_IMPORT,
            }),
          ])
        );
      });
    });
  });
};
