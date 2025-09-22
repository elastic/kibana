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
  importRules,
  importRulesWithSuccess,
  assertImportedRule,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../config/services/detections_response';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const detectionsApi = getService('detectionsApi');

  const PREBUILT_RULE_ID = 'prebuilt-rule';
  const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
    rule_id: PREBUILT_RULE_ID,
    version: 1,
    name: 'Stock name',
    description: 'Stock description',
  });

  describe('@ess @serverless @skipInServerlessMKI Import with missing fields', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
      await createHistoricalPrebuiltRuleAssetSavedObjects(es, [PREBUILT_RULE_ASSET]);
    });

    it('imports a non-customized prebuilt rule without rule_source', async () => {
      const NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT = {
        ...PREBUILT_RULE_ASSET['security-rule'],
      };

      // At the moment of writing this test PREBUILT_RULE_ASSET['security-rule'] shouldn't contain immutable and rule_source
      // but removing the fields explicitly will make test less sensitive to external changes
      // @ts-expect-error intentionally remove non-optional immutable field
      delete NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT.immutable;
      // @ts-expect-error intentionally remove non-optional rule_source field
      delete NON_CUSTOMIZED_PREBUILT_RULE_TO_IMPORT.rule_source;

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

    it('imports a customized prebuilt rule without rule_source', async () => {
      const CUSTOMIZED_PREBUILT_RULE_TO_IMPORT = {
        ...PREBUILT_RULE_ASSET['security-rule'],
        name: 'Customized name',
      };

      // At the moment of writing this test PREBUILT_RULE_ASSET['security-rule'] shouldn't contain immutable and rule_source
      // but removing the fields explicitly will make test less sensitive to external changes
      // @ts-expect-error intentionally remove non-optional immutable field
      delete CUSTOMIZED_PREBUILT_RULE_TO_IMPORT.immutable;
      // @ts-expect-error intentionally remove non-optional rule_source field
      delete CUSTOMIZED_PREBUILT_RULE_TO_IMPORT.rule_source;

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

    it('returns an error when importing a prebuilt rule without a rule_id field', async () => {
      const PREBUILT_RULE_TO_IMPORT = {
        ...PREBUILT_RULE_ASSET['security-rule'],
        rule_id: undefined, // Intentionally missing rule_id
        immutable: true,
        rule_source: {
          type: 'external',
          is_customized: false,
        },
      };

      const importResponse = await importRules({
        getService,
        rules: [PREBUILT_RULE_TO_IMPORT],
        overwrite: false,
      });

      expect(importResponse).toMatchObject({
        success: false,
        errors: [
          {
            error: {
              message: 'rule_id: Required',
            },
          },
        ],
      });
    });

    it('returns an error when importing a prebuilt rule without a version field', async () => {
      const PREBUILT_RULE_TO_IMPORT = {
        ...PREBUILT_RULE_ASSET['security-rule'],
        version: undefined, // Intentionally missing version
        immutable: true,
        rule_source: {
          type: 'external',
          is_customized: false,
        },
      };

      const importResponse = await importRules({
        getService,
        rules: [PREBUILT_RULE_TO_IMPORT],
        overwrite: false,
      });

      expect(importResponse).toMatchObject({
        success: false,
        errors: [
          {
            error: {
              message:
                'Prebuilt rules must specify a "version" to be imported. [rule_id: prebuilt-rule]',
            },
          },
        ],
      });
    });

    it('import a new custom rule missing a version field', async () => {
      const CUSTOM_RULE_TO_IMPORT = {
        ...getCustomQueryRuleParams({
          rule_id: 'custom-rule',
        }),
        version: undefined, // Intentionally missing version
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
          rule_id: 'custom-rule',
          version: 1,
          immutable: false,
          rule_source: {
            type: 'internal',
          },
        },
      });
    });

    // Importing a custom rule missing the version field over already existing one
    // shouldn't affect the version field. However, it's not the case currently.
    // https://github.com/elastic/kibana/issues/223280 track the issue
    it.skip('import an existing custom rule missing a version field', async () => {
      const CUSTOM_RULE = getCustomQueryRuleParams({
        rule_id: 'custom-rule',
        version: 3,
      });

      await detectionsApi
        .createRule({
          body: CUSTOM_RULE,
        })
        .expect(200);

      const CUSTOM_RULE_TO_IMPORT = {
        ...CUSTOM_RULE,
        version: undefined, // Intentionally missing version
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
          rule_id: 'custom-rule',
          version: 3,
          immutable: false,
          rule_source: {
            type: 'internal',
          },
        },
      });
    });
  });
};
