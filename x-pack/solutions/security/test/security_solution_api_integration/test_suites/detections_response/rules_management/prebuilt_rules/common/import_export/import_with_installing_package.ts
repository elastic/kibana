/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { PREBUILT_RULES_PACKAGE_NAME } from '@kbn/security-solution-plugin/common/detection_engine/constants';
import {
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
  importRulesWithSuccess,
  createPrebuiltRulesPackage,
  installFleetPackageByUpload,
  deletePrebuiltRulesFleetPackage,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../config/services/detections_response';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  PREBUILT_RULE_ASSET_A,
  PREBUILT_RULE_ASSET_B,
  PREBUILT_RULE_ID_A,
  PREBUILT_RULE_ID_B,
} from '../configs/edge_cases/ess_air_gapped_with_bundled_packages.config';

const NON_CUSTOMIZED_PREBUILT_RULE = PREBUILT_RULE_ASSET_A;
const CUSTOMIZED_PREBUILT_RULE = {
  ...PREBUILT_RULE_ASSET_B,
  description: 'Custom description',
  tags: ['custom-tag'],
};

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const detectionsApi = getService('detectionsApi');
  const retryService = getService('retry');

  describe('@ess @serverless @skipInServerlessMKI Import prebuilt rules when the package is not installed', () => {
    beforeEach(async () => {
      await deletePrebuiltRulesFleetPackage({ supertest, es, log, retryService });
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    const IMPORT_PAYLOAD = [
      {
        ...NON_CUSTOMIZED_PREBUILT_RULE,
        immutable: true,
        rule_source: {
          type: 'external',
          is_customized: false,
        },
      },
      {
        ...CUSTOMIZED_PREBUILT_RULE,
        immutable: true,
        rule_source: {
          type: 'external',
          is_customized: true,
        },
      },
    ];

    it('imports new prebuilt rules', async () => {
      await importRulesWithSuccess({
        getService,
        rules: IMPORT_PAYLOAD,
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
        ])
      );

      expect(importedRules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: PREBUILT_RULE_ID_A,
            version: 3,
            revision: 0,
          }),
          expect.objectContaining({
            rule_id: PREBUILT_RULE_ID_B,
            version: 3,
            revision: 0,
          }),
        ])
      );

      expect(importedRules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ...NON_CUSTOMIZED_PREBUILT_RULE,
            rule_id: PREBUILT_RULE_ID_A,
          }),
          expect.objectContaining({
            ...CUSTOMIZED_PREBUILT_RULE,
            rule_id: PREBUILT_RULE_ID_B,
          }),
        ])
      );
    });

    it('imports prebuilt rules on top of existing rules', async () => {
      // Package installation is rate limited. A single package installation is allowed per 10 seconds.
      await retryService.tryWithRetries(
        'installSecurityDetectionEnginePackage',
        async () => {
          const securityDetectionEnginePackageZip = createPrebuiltRulesPackage({
            packageName: PREBUILT_RULES_PACKAGE_NAME,
            // Use a high version to avoid conflicts with real packages
            // including mock bundled packages path configured via "xpack.fleet.developer.bundledPackageLocation"
            packageSemver: '99.0.0',
            prebuiltRuleAssets: [PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B],
          });

          await installFleetPackageByUpload({
            getService,
            packageBuffer: securityDetectionEnginePackageZip.toBuffer(),
          });
        },
        {
          retryCount: 5,
          retryDelay: 5000,
          timeout: 15000, // total timeout applied to all attempts altogether
        }
      );
      await installPrebuiltRules(es, supertest);
      await deletePrebuiltRulesFleetPackage({ supertest, es, log, retryService });

      await importRulesWithSuccess({
        getService,
        rules: IMPORT_PAYLOAD,
        overwrite: true,
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
        ])
      );

      expect(importedRules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: PREBUILT_RULE_ID_A,
            version: 3,
            revision: 0,
          }),
          expect.objectContaining({
            rule_id: PREBUILT_RULE_ID_B,
            version: 3,
            revision: 1,
          }),
        ])
      );

      expect(importedRules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ...NON_CUSTOMIZED_PREBUILT_RULE,
            rule_id: PREBUILT_RULE_ID_A,
          }),
          expect.objectContaining({
            ...CUSTOMIZED_PREBUILT_RULE,
            rule_id: PREBUILT_RULE_ID_B,
          }),
        ])
      );
    });
  });
};
