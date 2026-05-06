/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import {
  assertImportedRule,
  createDeprecatedPrebuiltRuleAssetSavedObjects,
  createHistoricalPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  importRulesWithSuccess,
  installPrebuiltRules,
} from '../../../../utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  const PREBUILT_RULE_ID = 'deprecated-prebuilt-rule';
  const ACTIVE_VERSION = 5;
  const DEPRECATED_VERSION = ACTIVE_VERSION + 1;

  // The active asset shape matches what an exported deprecated prebuilt rule
  // would look like in an `.ndjson`: it carries the last active version's full
  // contents. Deprecated assets in the package itself are minimal stubs with
  // `deprecated: true`, an incremented version number, and are excluded from
  // `fetchLatestVersions` results.
  const ACTIVE_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
    rule_id: PREBUILT_RULE_ID,
    version: ACTIVE_VERSION,
    name: 'Stock rule name',
    description: 'Stock rule description',
  });

  describe('@ess @serverless @skipInServerlessMKI Import deprecated prebuilt rules', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    describe('when the rule_id matches a deprecated asset in the package', () => {
      it('imports the rule as a prebuilt rule', async () => {
        await createDeprecatedPrebuiltRuleAssetSavedObjects(es, [
          { rule_id: PREBUILT_RULE_ID, version: DEPRECATED_VERSION },
        ]);

        const DEPRECATED_PREBUILT_RULE_TO_IMPORT = {
          ...ACTIVE_PREBUILT_RULE_ASSET['security-rule'],
          immutable: true,
          rule_source: {
            type: 'external',
            is_customized: false,
            customized_fields: [],
            has_base_version: true, // Default value, recalculated on import
          },
        };

        await importRulesWithSuccess({
          getService,
          rules: [DEPRECATED_PREBUILT_RULE_TO_IMPORT],
          overwrite: false,
        });

        await assertImportedRule({
          getService,
          expectedRule: {
            ...DEPRECATED_PREBUILT_RULE_TO_IMPORT,
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
              customized_fields: [],
              // Deprecated stubs are not used as a base for diffing, so no
              // base version is available for the imported rule.
              has_base_version: false,
            },
          },
        });
      });

      it('preserves prebuilt classification when overwriting an installed copy of the deprecated rule', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [ACTIVE_PREBUILT_RULE_ASSET]);
        await installPrebuiltRules(es, supertest);
        await deleteAllPrebuiltRuleAssets(es, log);
        await createDeprecatedPrebuiltRuleAssetSavedObjects(es, [
          { rule_id: PREBUILT_RULE_ID, version: DEPRECATED_VERSION },
        ]);

        const DEPRECATED_PREBUILT_RULE_TO_IMPORT = {
          ...ACTIVE_PREBUILT_RULE_ASSET['security-rule'],
          immutable: true,
          rule_source: {
            type: 'external',
            is_customized: false,
            customized_fields: [],
            has_base_version: true, // Default value, recalculated on import
          },
        };

        await importRulesWithSuccess({
          getService,
          rules: [DEPRECATED_PREBUILT_RULE_TO_IMPORT],
          overwrite: true,
        });

        await assertImportedRule({
          getService,
          expectedRule: {
            ...DEPRECATED_PREBUILT_RULE_TO_IMPORT,
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
              customized_fields: [],
              has_base_version: false,
            },
          },
        });
      });
    });
  });
};
