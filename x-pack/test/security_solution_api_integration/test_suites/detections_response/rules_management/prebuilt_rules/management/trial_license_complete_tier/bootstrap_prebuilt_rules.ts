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
import { deletePrebuiltRulesFleetPackage } from '../../../../utils';
import { deleteEndpointFleetPackage } from '../../../../utils/rules/prebuilt_rules/delete_endpoint_fleet_package';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');

  describe('@ess @serverless @skipInServerlessMKI Bootstrap Prebuilt Rules', () => {
    beforeEach(async () => {
      await deletePrebuiltRulesFleetPackage(supertest);
      await deleteEndpointFleetPackage(supertest);
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
