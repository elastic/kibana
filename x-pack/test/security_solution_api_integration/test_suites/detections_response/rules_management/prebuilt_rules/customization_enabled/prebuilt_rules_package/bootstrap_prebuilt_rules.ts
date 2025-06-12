/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENDPOINT_PACKAGE_NAME,
  PREBUILT_RULES_PACKAGE_NAME,
} from '@kbn/security-solution-plugin/common/detection_engine/constants';
import expect from 'expect';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllPrebuiltRuleAssets,
  deleteEndpointFleetPackage,
  deletePrebuiltRulesFleetPackage,
} from '../../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const log = getService('log');
  const supertest = getService('supertest');
  const retryService = getService('retry');
  const securitySolutionApi = getService('securitySolutionApi');

  // FLAKY: https://github.com/elastic/kibana/issues/202037
  describe.skip('@ess @serverless @skipInServerlessMKI Bootstrap Prebuilt Rules', () => {
    beforeEach(async () => {
      await deleteAllPrebuiltRuleAssets(es, log);
      await deletePrebuiltRulesFleetPackage({ supertest, es, log, retryService });
      await deleteEndpointFleetPackage({ supertest, es, log, retryService });
    });

    it('should install fleet packages required for detection engine to function', async () => {
      const { body } = await securitySolutionApi.bootstrapPrebuiltRules().expect(200);

      expect(body).toMatchObject({
        packages: expect.arrayContaining([
          expect.objectContaining({
            name: PREBUILT_RULES_PACKAGE_NAME,
            status: 'installed',
          }),
          expect.objectContaining({
            name: ENDPOINT_PACKAGE_NAME,
            status: 'installed',
          }),
        ]),
      });
    });

    it('should skip installing fleet packages if they are already installed', async () => {
      // Install the packages
      await securitySolutionApi.bootstrapPrebuiltRules().expect(200);
      // Try to install the packages again
      const { body } = await securitySolutionApi.bootstrapPrebuiltRules().expect(200);

      expect(body).toMatchObject({
        packages: expect.arrayContaining([
          expect.objectContaining({
            name: PREBUILT_RULES_PACKAGE_NAME,
            status: 'already_installed',
          }),
          expect.objectContaining({
            name: ENDPOINT_PACKAGE_NAME,
            status: 'already_installed',
          }),
        ]),
      });
    });
  });
};
