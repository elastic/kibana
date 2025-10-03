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
  installPrebuiltRules,
  importRulesWithSuccess,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../config/services/detections_response';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const detectionsApi = getService('detectionsApi');

  const [PREBUILT_RULE_ID_A, PREBUILT_RULE_ID_B, PREBUILT_RULE_ID_C, PREBUILT_RULE_ID_D] = [
    'prebuilt-rule-a',
    'prebuilt-rule-b',
    'prebuilt-rule-c',
    'prebuilt-rule-d',
  ];
  const [
    PREBUILT_RULE_ASSET_A,
    PREBUILT_RULE_ASSET_B,
    PREBUILT_RULE_ASSET_C,
    PREBUILT_RULE_ASSET_D,
  ] = [
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
    createRuleAssetSavedObject({
      rule_id: PREBUILT_RULE_ID_C,
      version: 1,
      name: 'Stock rule name C',
      description: 'Stock rule description C',
    }),
    createRuleAssetSavedObject({
      rule_id: PREBUILT_RULE_ID_D,
      version: 1,
      name: 'Stock rule name D',
      description: 'Stock rule description D',
    }),
  ];

  describe('@ess @serverless @skipInServerlessMKI Import multiple outdated prebuilt rules', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
      await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
        PREBUILT_RULE_ASSET_A,
        PREBUILT_RULE_ASSET_B,
        PREBUILT_RULE_ASSET_C,
        PREBUILT_RULE_ASSET_D,
      ]);
    });

    describe('without overwriting', () => {
      it('imports outdated non-customized and customized prebuilt rules', async () => {
        const NEW_PREBUILT_RULE_ASSET_A = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID_A,
          version: 2,
          description: 'New description A',
        });
        const NEW_PREBUILT_RULE_ASSET_B = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID_B,
          version: 2,
          description: 'New description B',
        });

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
          NEW_PREBUILT_RULE_ASSET_A,
          NEW_PREBUILT_RULE_ASSET_B,
        ]);

        const PREBUILT_RULES_TO_IMPORT = [
          {
            ...PREBUILT_RULE_ASSET_A['security-rule'],
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
          {
            ...PREBUILT_RULE_ASSET_B['security-rule'],
            name: 'Customized Prebuilt Rule',
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
        ];

        await importRulesWithSuccess({
          getService,
          rules: PREBUILT_RULES_TO_IMPORT,
          overwrite: false,
        });

        const {
          body: { data: importedRules },
        } = await detectionsApi
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
          ])
        );

        expect(importedRules).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_A,
              version: 1,
              revision: 0,
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_B,
              version: 1,
              revision: 0,
            }),
          ])
        );

        expect(importedRules).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ...PREBUILT_RULE_ASSET_A['security-rule'],
              rule_id: PREBUILT_RULE_ID_A,
            }),
            expect.objectContaining({
              ...PREBUILT_RULE_ASSET_B['security-rule'],
              rule_id: PREBUILT_RULE_ID_B,
              name: 'Customized Prebuilt Rule',
            }),
          ])
        );
      });
    });

    describe('with overwriting (prebuilt rules installed)', () => {
      // This scenario checks 4 cases:
      // A) outdated non-customized prebuilt rule gets imported over outdated non-customized prebuilt rule installed from historical version
      // B) outdated non-customized prebuilt rule gets imported over outdated customized prebuilt rule installed from historical version
      // C) outdated customized prebuilt rule gets imported over outdated non-customized prebuilt rule installed from historical version
      // D) outdated customized prebuilt rule gets imported over outdated customized prebuilt rule installed from historical version
      it('imports outdated non-customized and customized prebuilt rules over outdated non-customized and customized installed prebuilt rules', async () => {
        // Install outdated prebuilt rules
        await installPrebuiltRules(es, supertest);

        // Customize some of the installed prebuilt rules
        await detectionsApi.patchRule({
          body: {
            rule_id: PREBUILT_RULE_ID_B,
            tags: ['custom-tag-b'],
          },
        });
        await detectionsApi.patchRule({
          body: {
            rule_id: PREBUILT_RULE_ID_D,
            tags: ['custom-tag-d'],
          },
        });

        // Newer prebuilt rule assets
        const NEW_PREBUILT_RULE_ASSET_A = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID_A,
          version: 2,
          description: 'New description A',
        });
        const NEW_PREBUILT_RULE_ASSET_B = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID_B,
          version: 2,
          description: 'New description B',
        });
        const NEW_PREBUILT_RULE_ASSET_C = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID_C,
          version: 2,
          description: 'New description C',
        });
        const NEW_PREBUILT_RULE_ASSET_D = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID_D,
          version: 2,
          description: 'New description D',
        });

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
          NEW_PREBUILT_RULE_ASSET_A,
          NEW_PREBUILT_RULE_ASSET_B,
          NEW_PREBUILT_RULE_ASSET_C,
          NEW_PREBUILT_RULE_ASSET_D,
        ]);

        // Import outdated prebuilt rules
        const PREBUILT_RULES_TO_IMPORT = [
          {
            ...PREBUILT_RULE_ASSET_A['security-rule'],
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
          {
            ...PREBUILT_RULE_ASSET_B['security-rule'],
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
          {
            ...PREBUILT_RULE_ASSET_C['security-rule'],
            description: 'Customized description C',
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
          {
            ...PREBUILT_RULE_ASSET_D['security-rule'],
            description: 'Customized description D',
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
        ];

        await importRulesWithSuccess({
          getService,
          rules: PREBUILT_RULES_TO_IMPORT,
          overwrite: true,
        });

        const {
          body: { data: importedRules },
        } = await detectionsApi
          .findRules({
            query: {},
          })
          .expect(200);

        // Assert customization state
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
              rule_source: { type: 'external', is_customized: false },
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_C,
              immutable: true,
              rule_source: { type: 'external', is_customized: true },
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_D,
              immutable: true,
              rule_source: { type: 'external', is_customized: true },
            }),
          ])
        );

        // Assert versions and revisions
        expect(importedRules).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_A,
              version: 1,
              revision: 0,
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_B,
              version: 1,
              revision: 2,
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_C,
              description: 'Customized description C',
              version: 1,
              revision: 1,
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_D,
              description: 'Customized description D',
              version: 1,
              revision: 2,
            }),
          ])
        );

        // Assert field values
        expect(importedRules).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ...PREBUILT_RULE_ASSET_A['security-rule'],
              rule_id: PREBUILT_RULE_ID_A,
            }),
            expect.objectContaining({
              ...PREBUILT_RULE_ASSET_B['security-rule'],
              rule_id: PREBUILT_RULE_ID_B,
            }),
            expect.objectContaining({
              ...PREBUILT_RULE_ASSET_C['security-rule'],
              rule_id: PREBUILT_RULE_ID_C,
              description: 'Customized description C',
            }),
            expect.objectContaining({
              ...PREBUILT_RULE_ASSET_D['security-rule'],
              rule_id: PREBUILT_RULE_ID_D,
              description: 'Customized description D',
            }),
          ])
        );
      });

      // This scenario checks 4 cases:
      // A) outdated non-customized prebuilt rule gets imported over fresh non-customized prebuilt rule installed from the recent version
      // B) outdated non-customized prebuilt rule gets imported over fresh customized prebuilt rule installed from the recent version
      // C) outdated customized prebuilt rule gets imported over fresh non-customized prebuilt rule installed from the recent version
      // D) outdated customized prebuilt rule gets imported over fresh customized prebuilt rule installed from the recent version
      it('imports outdated non-customized and customized prebuilt rules over fresh non-customized and customized installed prebuilt rules', async () => {
        // Newer prebuilt rule assets
        const NEW_PREBUILT_RULE_ASSET_A = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID_A,
          version: 2,
          description: 'New description A',
        });
        const NEW_PREBUILT_RULE_ASSET_B = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID_B,
          version: 2,
          description: 'New description B',
        });
        const NEW_PREBUILT_RULE_ASSET_C = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID_C,
          version: 2,
          description: 'New description C',
        });
        const NEW_PREBUILT_RULE_ASSET_D = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID_D,
          version: 2,
          description: 'New description D',
        });

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
          NEW_PREBUILT_RULE_ASSET_A,
          NEW_PREBUILT_RULE_ASSET_B,
          NEW_PREBUILT_RULE_ASSET_C,
          NEW_PREBUILT_RULE_ASSET_D,
        ]);
        // Install fresh prebuilt rules
        await installPrebuiltRules(es, supertest);

        // Customize some of the installed prebuilt rules
        await detectionsApi.patchRule({
          body: {
            rule_id: PREBUILT_RULE_ID_B,
            tags: ['custom-tag-b'],
          },
        });
        await detectionsApi.patchRule({
          body: {
            rule_id: PREBUILT_RULE_ID_D,
            tags: ['custom-tag-d'],
          },
        });

        // Import outdated prebuilt rules
        const PREBUILT_RULES_TO_IMPORT = [
          {
            ...PREBUILT_RULE_ASSET_A['security-rule'],
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
          {
            ...PREBUILT_RULE_ASSET_B['security-rule'],
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
          {
            ...PREBUILT_RULE_ASSET_C['security-rule'],
            description: 'Customized description C',
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
          {
            ...PREBUILT_RULE_ASSET_D['security-rule'],
            description: 'Customized description D',
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
        ];

        await importRulesWithSuccess({
          getService,
          rules: PREBUILT_RULES_TO_IMPORT,
          overwrite: true,
        });

        const {
          body: { data: importedRules },
        } = await detectionsApi
          .findRules({
            query: {},
          })
          .expect(200);

        // Assert customization state
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
              rule_source: { type: 'external', is_customized: false },
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_C,
              immutable: true,
              rule_source: { type: 'external', is_customized: true },
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_D,
              immutable: true,
              rule_source: { type: 'external', is_customized: true },
            }),
          ])
        );

        // Assert versions and revisions
        expect(importedRules).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_A,
              version: 1,
              revision: 1,
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_B,
              version: 1,
              revision: 2,
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_C,
              description: 'Customized description C',
              version: 1,
              revision: 1,
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_D,
              description: 'Customized description D',
              version: 1,
              revision: 2,
            }),
          ])
        );

        // Assert field values
        expect(importedRules).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ...PREBUILT_RULE_ASSET_A['security-rule'],
              rule_id: PREBUILT_RULE_ID_A,
            }),
            expect.objectContaining({
              ...PREBUILT_RULE_ASSET_B['security-rule'],
              rule_id: PREBUILT_RULE_ID_B,
            }),
            expect.objectContaining({
              ...PREBUILT_RULE_ASSET_C['security-rule'],
              rule_id: PREBUILT_RULE_ID_C,
              description: 'Customized description C',
            }),
            expect.objectContaining({
              ...PREBUILT_RULE_ASSET_D['security-rule'],
              rule_id: PREBUILT_RULE_ID_D,
              description: 'Customized description D',
            }),
          ])
        );
      });

      // This scenario checks 4 cases:
      // A) fresh non-customized prebuilt rule gets imported over outdated non-customized prebuilt rule installed from the recent version
      // B) fresh non-customized prebuilt rule gets imported over outdated customized prebuilt rule installed from the recent version
      // C) fresh customized prebuilt rule gets imported over outdated non-customized prebuilt rule installed from the recent version
      // D) fresh customized prebuilt rule gets imported over outdated customized prebuilt rule installed from the recent version
      it('imports fresh non-customized and customized prebuilt rules over outdated non-customized and customized installed prebuilt rules', async () => {
        // Install outdated prebuilt rules
        await installPrebuiltRules(es, supertest);

        // Customize some of the installed prebuilt rules
        await detectionsApi.patchRule({
          body: {
            rule_id: PREBUILT_RULE_ID_B,
            tags: ['custom-tag-b'],
          },
        });
        await detectionsApi.patchRule({
          body: {
            rule_id: PREBUILT_RULE_ID_D,
            tags: ['custom-tag-d'],
          },
        });

        // Newer prebuilt rule assets
        const NEW_PREBUILT_RULE_ASSET_A = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID_A,
          version: 2,
          description: 'New description A',
        });
        const NEW_PREBUILT_RULE_ASSET_B = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID_B,
          version: 2,
          description: 'New description B',
        });
        const NEW_PREBUILT_RULE_ASSET_C = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID_C,
          version: 2,
          description: 'New description C',
        });
        const NEW_PREBUILT_RULE_ASSET_D = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID_D,
          version: 2,
          description: 'New description D',
        });
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
          NEW_PREBUILT_RULE_ASSET_A,
          NEW_PREBUILT_RULE_ASSET_B,
          NEW_PREBUILT_RULE_ASSET_C,
          NEW_PREBUILT_RULE_ASSET_D,
        ]);

        // Import fresh prebuilt rules
        const PREBUILT_RULES_TO_IMPORT = [
          {
            ...NEW_PREBUILT_RULE_ASSET_A['security-rule'],
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
          {
            ...NEW_PREBUILT_RULE_ASSET_B['security-rule'],
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
          {
            ...NEW_PREBUILT_RULE_ASSET_C['security-rule'],
            description: 'Customized description C',
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
          {
            ...NEW_PREBUILT_RULE_ASSET_D['security-rule'],
            description: 'Customized description D',
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
        ];

        await importRulesWithSuccess({
          getService,
          rules: PREBUILT_RULES_TO_IMPORT,
          overwrite: true,
        });

        const {
          body: { data: importedRules },
        } = await detectionsApi
          .findRules({
            query: {},
          })
          .expect(200);

        // Assert customization state
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
              rule_source: { type: 'external', is_customized: false },
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_C,
              immutable: true,
              rule_source: { type: 'external', is_customized: true },
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_D,
              immutable: true,
              rule_source: { type: 'external', is_customized: true },
            }),
          ])
        );

        // Assert versions and revisions
        expect(importedRules).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_A,
              version: 2,
              revision: 1,
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_B,
              version: 2,
              revision: 2,
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_C,
              description: 'Customized description C',
              version: 2,
              revision: 1,
            }),
            expect.objectContaining({
              rule_id: PREBUILT_RULE_ID_D,
              description: 'Customized description D',
              version: 2,
              revision: 2,
            }),
          ])
        );

        // Assert field values
        expect(importedRules).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ...NEW_PREBUILT_RULE_ASSET_A['security-rule'],
              rule_id: PREBUILT_RULE_ID_A,
            }),
            expect.objectContaining({
              ...NEW_PREBUILT_RULE_ASSET_B['security-rule'],
              rule_id: PREBUILT_RULE_ID_B,
            }),
            expect.objectContaining({
              ...NEW_PREBUILT_RULE_ASSET_C['security-rule'],
              rule_id: PREBUILT_RULE_ID_C,
              description: 'Customized description C',
            }),
            expect.objectContaining({
              ...NEW_PREBUILT_RULE_ASSET_D['security-rule'],
              rule_id: PREBUILT_RULE_ID_D,
              description: 'Customized description D',
            }),
          ])
        );
      });
    });
  });
};
