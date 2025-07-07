/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createHistoricalPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  installMockPrebuiltRulesPackage,
  installPrebuiltRules,
  importRulesWithSuccess,
  assertImportedRule,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  const PREBUILT_RULE_ID = 'prebuilt-rule';
  const CURRENT_PREBUILT_RULE_VERSION = 5;
  const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
    rule_id: PREBUILT_RULE_ID,
    version: CURRENT_PREBUILT_RULE_VERSION,
    name: 'Stock rule name',
    description: 'Stock rule description',
  });

  describe('@ess @serverless @skipInServerlessMKI Import prebuilt rule with missing base version', () => {
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

    describe('without override (prebuilt rule is not installed)', () => {
      for (const version of [
        CURRENT_PREBUILT_RULE_VERSION - 1,
        CURRENT_PREBUILT_RULE_VERSION + 1,
      ]) {
        it(`imports a prebuilt rule with a missing base version where curr version = ${version} and available version = ${CURRENT_PREBUILT_RULE_VERSION}`, async () => {
          const NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT = {
            ...PREBUILT_RULE_ASSET['security-rule'],
            description: 'Some old value',
            version,
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          };

          await importRulesWithSuccess({
            getService,
            rules: [NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT],
            overwrite: false,
          });

          await assertImportedRule({
            getService,
            expectedRule: {
              ...NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
              version,
              immutable: true,
              rule_source: {
                type: 'external',
                is_customized: false,
              },
            },
          });
        });
      }
    });

    describe('with override (prebuilt rule is installed)', () => {
      it('imports a non-customized prebuilt rule with a missing base version when import payload is not equal to the installed prebuilt rule', async () => {
        await installPrebuiltRules(es, supertest);

        const VERSION = CURRENT_PREBUILT_RULE_VERSION - 1;
        const NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT = {
          ...PREBUILT_RULE_ASSET['security-rule'],
          description: 'Some old value',
          version: VERSION,
          immutable: true,
          rule_source: {
            type: 'external',
            is_customized: false,
          },
        };

        await importRulesWithSuccess({
          getService,
          rules: [NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT],
          overwrite: true,
        });

        await assertImportedRule({
          getService,
          expectedRule: {
            ...NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
            version: VERSION,
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: true,
            },
          },
        });
      });

      // The test fails most probably due to a bug. It requires  further investigation.
      // https://github.com/elastic/kibana/issues/223253 has been created to track it.
      it.skip('imports a non-customized prebuilt rule with a missing base version when import payload is equal to the installed prebuilt rule', async () => {
        await installPrebuiltRules(es, supertest);

        const VERSION = CURRENT_PREBUILT_RULE_VERSION - 1;
        const NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT = {
          ...PREBUILT_RULE_ASSET['security-rule'],
          version: VERSION,
          immutable: true,
          rule_source: {
            type: 'external',
            is_customized: false,
          },
        };

        await importRulesWithSuccess({
          getService,
          rules: [NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT],
          overwrite: true,
        });

        await assertImportedRule({
          getService,
          expectedRule: {
            ...NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
            version: CURRENT_PREBUILT_RULE_VERSION,
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          },
        });
      });

      it('imports a customized prebuilt rule with a missing base version when import payload and is equal to the installed customized prebuilt rule', async () => {
        await installPrebuiltRules(es, supertest);

        const VERSION = CURRENT_PREBUILT_RULE_VERSION - 1;
        const NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT = {
          ...PREBUILT_RULE_ASSET['security-rule'],
          tags: ['custom-tag'],
          version: VERSION,
          immutable: true,
          rule_source: {
            type: 'external',
            is_customized: true,
          },
        };

        await importRulesWithSuccess({
          getService,
          rules: [NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT],
          overwrite: true,
        });

        await assertImportedRule({
          getService,
          expectedRule: {
            ...NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT,
            version: VERSION,
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
};
