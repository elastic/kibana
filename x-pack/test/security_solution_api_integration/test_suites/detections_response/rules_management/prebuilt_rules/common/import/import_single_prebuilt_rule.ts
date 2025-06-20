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
  getCustomQueryRuleParams,
  installMockPrebuiltRulesPackage,
  reviewPrebuiltRulesToUpgrade,
  performUpgradePrebuiltRules,
  importRulesWithSuccess,
  assertImportedRule,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');

  const PREBUILT_RULE_ID = 'prebuilt-rule';
  const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
    rule_id: PREBUILT_RULE_ID,
    version: 1,
    name: 'Stock name',
    description: 'Stock description',
  });

  describe('@ess @serverless @skipInServerlessMKI Import single prebuilt rule', () => {
    before(async () => {
      await installMockPrebuiltRulesPackage(es, supertest);
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
      await createHistoricalPrebuiltRuleAssetSavedObjects(es, [PREBUILT_RULE_ASSET]);
    });

    after(async () => {
      await deleteAllPrebuiltRuleAssets(es, log);
      await deleteAllRules(supertest, log);
    });

    describe('importing a single non-customized prebuilt rule', () => {
      const NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT = {
        ...PREBUILT_RULE_ASSET['security-rule'],
        immutable: true,
        rule_source: {
          type: 'external',
          is_customized: false,
        },
      };

      describe('without overwriting', () => {
        it('imports a non-customized prebuilt rule', async () => {
          await importRulesWithSuccess({
            getService,
            rules: [NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT],
            overwrite: false,
          });

          await assertImportedRule({
            getService,
            expectedRule: {
              ...NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              immutable: true,
              rule_source: {
                type: 'external',
                is_customized: false,
              },
            },
          });
        });
      });

      describe('with overwriting (prebuilt rules installed)', () => {
        it('imports a non-customized prebuilt rule on top of an installed non-customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          await importRulesWithSuccess({
            getService,
            rules: [NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT],
            overwrite: true,
          });

          await assertImportedRule({
            getService,
            expectedRule: {
              ...NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              immutable: true,
              rule_source: {
                type: 'external',
                is_customized: false,
              },
            },
          });
        });

        it('imports a non-customized prebuilt rule on top of an installed customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          await securitySolutionApi.patchRule({
            body: {
              rule_id: PREBUILT_RULE_ID,
              name: 'Customized Rule',
            },
          });

          await importRulesWithSuccess({
            getService,
            rules: [NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT],
            overwrite: true,
          });

          await assertImportedRule({
            getService,
            expectedRule: {
              ...NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              immutable: true,
              rule_source: {
                type: 'external',
                is_customized: false,
              },
            },
          });
        });
      });
    });

    describe('importing a single customized prebuilt rule', () => {
      const CUSTOMIZED_PREBUILT_RULE_TO_IMPORT = {
        ...PREBUILT_RULE_ASSET['security-rule'],
        name: 'Customized Prebuilt Rule',
        immutable: true,
        rule_source: {
          type: 'external',
          is_customized: true,
        },
      };

      describe('without overwriting', () => {
        it('imports a customized prebuilt rule', async () => {
          await importRulesWithSuccess({
            getService,
            rules: [CUSTOMIZED_PREBUILT_RULE_TO_IMPORT],
            overwrite: false,
          });

          await assertImportedRule({
            getService,
            expectedRule: {
              ...CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              immutable: true,
              rule_source: {
                type: 'external',
                is_customized: true,
              },
            },
          });
        });
      });

      describe('with overwriting (prebuilt rules installed)', () => {
        it('imports a customized prebuilt rule on top of an installed non-customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          await importRulesWithSuccess({
            getService,
            rules: [CUSTOMIZED_PREBUILT_RULE_TO_IMPORT],
            overwrite: true,
          });

          await assertImportedRule({
            getService,
            expectedRule: {
              ...CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              immutable: true,
              rule_source: {
                type: 'external',
                is_customized: true,
              },
            },
          });
        });

        it('imports a customized prebuilt rule on top of an installed customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          await securitySolutionApi.patchRule({
            body: {
              rule_id: PREBUILT_RULE_ID,
              description: 'Customized Rule',
            },
          });

          await importRulesWithSuccess({
            getService,
            rules: [CUSTOMIZED_PREBUILT_RULE_TO_IMPORT],
            overwrite: true,
          });

          await assertImportedRule({
            getService,
            expectedRule: {
              ...CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              immutable: true,
              rule_source: {
                type: 'external',
                is_customized: true,
              },
            },
          });
        });

        it('imports customized prebuilt rule fields on top of an installed customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          await securitySolutionApi
            .patchRule({
              body: {
                rule_id: PREBUILT_RULE_ID,
                name: 'Customized Rule',
              },
            })
            .expect(200);

          await importRulesWithSuccess({
            getService,
            rules: [CUSTOMIZED_PREBUILT_RULE_TO_IMPORT],
            overwrite: true,
          });

          await assertImportedRule({
            getService,
            expectedRule: {
              ...CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              immutable: true,
              rule_source: {
                type: 'external',
                is_customized: true,
              },
            },
          });
        });
      });
    });

    describe('importing a single custom rule', () => {
      const CUSTOM_RULE_TO_IMPORT = getCustomQueryRuleParams({
        rule_id: 'custom-rule',
        version: 1,
      });

      it('imports a custom rule', async () => {
        await importRulesWithSuccess({
          getService,
          rules: [CUSTOM_RULE_TO_IMPORT],
          overwrite: false,
        });

        await assertImportedRule({
          getService,
          expectedRule: {
            ...CUSTOM_RULE_TO_IMPORT,
            immutable: false,
            rule_source: {
              type: 'internal',
            },
          },
        });
      });

      it('importing a custom rule on top of an existing custom rule', async () => {
        await securitySolutionApi
          .createRule({
            body: CUSTOM_RULE_TO_IMPORT,
          })
          .expect(200);

        await importRulesWithSuccess({
          getService,
          rules: [CUSTOM_RULE_TO_IMPORT],
          overwrite: true,
        });

        await assertImportedRule({
          getService,
          expectedRule: {
            ...CUSTOM_RULE_TO_IMPORT,
            immutable: false,
            rule_source: {
              type: 'internal',
            },
          },
        });
      });
    });

    describe('converting between prebuilt and custom rules', () => {
      it('converts a custom rule to a customized prebuilt rule on import', async () => {
        const CUSTOM_RULE_TO_IMPORT = {
          ...getCustomQueryRuleParams({
            rule_id: PREBUILT_RULE_ID,
            version: 1,
          }),
          immutable: false,
          rule_source: {
            type: 'internal',
          },
        };

        await importRulesWithSuccess({
          getService,
          rules: [CUSTOM_RULE_TO_IMPORT],
          overwrite: false,
        });

        await assertImportedRule({
          getService,
          expectedRule: {
            ...CUSTOM_RULE_TO_IMPORT,
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: true,
            },
          },
        });
      });

      it('converts a custom rule to a non-customized prebuilt rule on import', async () => {
        const CUSTOM_RULE_TO_IMPORT = {
          ...PREBUILT_RULE_ASSET['security-rule'],
          rule_id: PREBUILT_RULE_ID,
          version: 1,
          immutable: false,
          rule_source: {
            type: 'internal',
          },
        };

        await importRulesWithSuccess({
          getService,
          rules: [CUSTOM_RULE_TO_IMPORT],
          overwrite: false,
        });

        await assertImportedRule({
          getService,
          expectedRule: {
            ...CUSTOM_RULE_TO_IMPORT,
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
        });
      });

      it('converts a prebuilt rule to a custom rule on import when rule_id does not match prebuilt rule assets', async () => {
        const UNKNOWN_PREBUILT_RULE_TO_IMPORT = {
          ...PREBUILT_RULE_ASSET['security-rule'],
          rule_id: 'non-existent-prebuilt-rule',
          version: 1,
          immutable: true,
          rule_source: {
            type: 'external',
            is_customized: false,
          },
        };

        await importRulesWithSuccess({
          getService,
          rules: [UNKNOWN_PREBUILT_RULE_TO_IMPORT],
          overwrite: false,
        });

        await assertImportedRule({
          getService,
          expectedRule: {
            ...UNKNOWN_PREBUILT_RULE_TO_IMPORT,
            immutable: false,
            rule_source: {
              type: 'internal',
            },
          },
        });
      });

      // The test fails since the current behavior doesn't match the expectations
      // There is a bug ticket to track it https://github.com/elastic/kibana/issues/223099
      it.skip('makes an imported custom rule upgradeable to a prebuilt rule', async () => {
        const RULE_ID = 'future-upgradable-prebuilt-rule';
        const FUTURE_UPGRADABLE_RULE_FIELDS = {
          ...PREBUILT_RULE_ASSET['security-rule'],
          rule_id: RULE_ID,
          version: 1,
        };
        const FUTURE_UPGRADABLE_RULE_TO_IMPORT = {
          ...FUTURE_UPGRADABLE_RULE_FIELDS,
          immutable: false,
          rule_source: {
            type: 'internal',
          },
        };

        await importRulesWithSuccess({
          getService,
          rules: [FUTURE_UPGRADABLE_RULE_TO_IMPORT],
          overwrite: false,
        });

        const UPGRADE_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          rule_id: RULE_ID,
          version: 2,
          name: 'New name',
        });

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [UPGRADE_PREBUILT_RULE_ASSET]);

        const upgradeReviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(upgradeReviewResponse.rules).toEqual([
          expect.objectContaining({
            rule_id: RULE_ID,
            version: 1,
          }),
        ]);

        await performUpgradePrebuiltRules(es, supertest, { mode: 'ALL_RULES' });

        await assertImportedRule({
          getService,
          expectedRule: {
            ...UPGRADE_PREBUILT_RULE_ASSET,
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
        });
      });
    });

    describe('handling historical base versions', () => {
      describe('without overwriting', () => {
        it('imports an old non-customized prebuilt rule', async () => {
          const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
            rule_id: PREBUILT_RULE_ID,
            version: 2,
            name: 'New name',
          });

          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [NEW_PREBUILT_RULE_ASSET]);

          const PREBUILT_RULE_TO_IMPORT = {
            ...PREBUILT_RULE_ASSET['security-rule'],
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          };

          await importRulesWithSuccess({
            getService,
            rules: [PREBUILT_RULE_TO_IMPORT],
            overwrite: false,
          });

          await assertImportedRule({
            getService,
            expectedRule: {
              ...PREBUILT_RULE_TO_IMPORT,
              immutable: true,
              rule_source: {
                type: 'external',
                is_customized: false,
              },
            },
          });
        });

        it('imports an old customized prebuilt rule', async () => {
          const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
            rule_id: PREBUILT_RULE_ID,
            version: 2,
            name: 'New name',
          });

          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [NEW_PREBUILT_RULE_ASSET]);

          const PREBUILT_RULE_TO_IMPORT = {
            ...PREBUILT_RULE_ASSET['security-rule'],
            name: 'Customized Prebuilt Rule',
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: true,
            },
          };

          await importRulesWithSuccess({
            getService,
            rules: [PREBUILT_RULE_TO_IMPORT],
            overwrite: false,
          });

          await assertImportedRule({
            getService,
            expectedRule: {
              ...PREBUILT_RULE_TO_IMPORT,
              immutable: true,
              rule_source: {
                type: 'external',
                is_customized: true,
              },
            },
          });
        });
      });

      describe('with overwriting non-customized prebuilt rule', () => {
        it('imports an old non-customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
            rule_id: PREBUILT_RULE_ID,
            version: 2,
            name: 'New name',
          });

          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [NEW_PREBUILT_RULE_ASSET]);

          const PREBUILT_RULE_TO_IMPORT = {
            ...PREBUILT_RULE_ASSET['security-rule'],
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          };

          await importRulesWithSuccess({
            getService,
            rules: [PREBUILT_RULE_TO_IMPORT],
            overwrite: true,
          });

          await assertImportedRule({
            getService,
            expectedRule: {
              ...PREBUILT_RULE_TO_IMPORT,
              immutable: true,
              rule_source: {
                type: 'external',
                is_customized: false,
              },
            },
          });
        });

        it('imports an old customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
            rule_id: PREBUILT_RULE_ID,
            version: 2,
            name: 'New name',
          });

          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [NEW_PREBUILT_RULE_ASSET]);

          const PREBUILT_RULE_TO_IMPORT = {
            ...PREBUILT_RULE_ASSET['security-rule'],
            name: 'Customized Prebuilt Rule',
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          };

          await importRulesWithSuccess({
            getService,
            rules: [PREBUILT_RULE_TO_IMPORT],
            overwrite: true,
          });

          await assertImportedRule({
            getService,
            expectedRule: {
              ...PREBUILT_RULE_TO_IMPORT,
              immutable: true,
              rule_source: {
                type: 'external',
                is_customized: true,
              },
            },
          });
        });
      });

      describe('with overwriting customized prebuilt rule', () => {
        it('imports an old non-customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          await securitySolutionApi.patchRule({
            body: {
              rule_id: PREBUILT_RULE_ID,
              description: 'Customized Rule',
            },
          });

          const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
            rule_id: PREBUILT_RULE_ID,
            version: 2,
            name: 'New name',
          });

          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [NEW_PREBUILT_RULE_ASSET]);

          const PREBUILT_RULE_TO_IMPORT = {
            ...PREBUILT_RULE_ASSET['security-rule'],
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          };

          await importRulesWithSuccess({
            getService,
            rules: [PREBUILT_RULE_TO_IMPORT],
            overwrite: true,
          });

          await assertImportedRule({
            getService,
            expectedRule: {
              ...PREBUILT_RULE_TO_IMPORT,
              immutable: true,
              rule_source: {
                type: 'external',
                is_customized: false,
              },
            },
          });
        });

        it('imports an old customized prebuilt rule', async () => {
          await installPrebuiltRules(es, supertest);

          await securitySolutionApi.patchRule({
            body: {
              rule_id: PREBUILT_RULE_ID,
              name: 'Customized Rule',
            },
          });

          const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
            rule_id: PREBUILT_RULE_ID,
            version: 2,
            name: 'New name',
          });

          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [NEW_PREBUILT_RULE_ASSET]);

          const PREBUILT_RULE_TO_IMPORT = {
            ...PREBUILT_RULE_ASSET['security-rule'],
            name: 'Customized Prebuilt Rule',
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          };

          await importRulesWithSuccess({
            getService,
            rules: [PREBUILT_RULE_TO_IMPORT],
            overwrite: true,
          });

          await assertImportedRule({
            getService,
            expectedRule: {
              ...PREBUILT_RULE_TO_IMPORT,
              immutable: true,
              rule_source: {
                type: 'external',
                is_customized: true,
              },
            },
          });
        });
      });
    });
  });
};
