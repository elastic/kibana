/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { PREBUILT_RULES_PACKAGE_NAME } from '@kbn/security-solution-plugin/common/detection_engine/constants';
import { deleteAllRules } from '../../../../../../config/services/detections_response';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  getCustomQueryRuleParams,
  createPrebuiltRulesPackage,
  installFleetPackageByUpload,
  installPrebuiltRules,
  deletePrebuiltRulesFleetPackage,
} from '../../../../utils';
import {
  MOCK_PKG_VERSION,
  PREBUILT_RULE_ASSET_A,
  PREBUILT_RULE_ASSET_B,
  PREBUILT_RULE_ID_A,
} from '../configs/edge_cases/ess_air_gapped_with_bundled_packages.config';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');
  const es = getService('es');
  const retryService = getService('retry');

  const installPrebuiltRulesFromUploadedPackage = async () => {
    const securityDetectionEnginePackageZip = createPrebuiltRulesPackage({
      packageName: PREBUILT_RULES_PACKAGE_NAME,
      packageSemver: MOCK_PKG_VERSION,
      prebuiltRuleAssets: [PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B],
    });
    await installFleetPackageByUpload({
      getService,
      packageBuffer: securityDetectionEnginePackageZip.toBuffer(),
    });
  };

  describe('@ess @serverless @serverlessQA modifying non-customizable fields', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deletePrebuiltRulesFleetPackage({ supertest, es, log, retryService });
    });

    describe('patch rules', () => {
      it('throws an error if rule has external rule source and non-customizable fields are changed', async () => {
        await installPrebuiltRulesFromUploadedPackage();
        await installPrebuiltRules(es, supertest);

        const { body } = await detectionsApi
          .patchRule({
            body: {
              rule_id: PREBUILT_RULE_ID_A,
              author: ['new user'],
            },
          })
          .expect(400);

        expect(body.message).toEqual('Cannot update "author" field for prebuilt rules');
      });
    });

    describe('update rules', () => {
      it('throws an error if rule has external rule source and non-customizable fields are changed', async () => {
        await installPrebuiltRulesFromUploadedPackage();
        await installPrebuiltRules(es, supertest);

        const { body: existingRule } = await detectionsApi
          .readRule({
            query: { rule_id: PREBUILT_RULE_ID_A },
          })
          .expect(200);

        const { body } = await detectionsApi
          .updateRule({
            body: getCustomQueryRuleParams({
              ...existingRule,
              rule_id: PREBUILT_RULE_ID_A,
              id: undefined,
              license: 'new license',
            }),
          })
          .expect(400);

        expect(body.message).toEqual('Cannot update "license" field for prebuilt rules');
      });
    });
  });
};
