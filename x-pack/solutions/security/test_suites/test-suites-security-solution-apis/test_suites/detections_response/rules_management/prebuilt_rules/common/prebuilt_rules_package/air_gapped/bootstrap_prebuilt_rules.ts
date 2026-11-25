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
import {
  INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
  INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
} from '@kbn/security-solution-plugin/common/api/initialization';
import expect from 'expect';
import type { FtrProviderContext } from '../../../../../../../ftr_provider_context';
import {
  deleteEndpointFleetPackage,
  deletePrebuiltRulesFleetPackage,
  initializeSecuritySolution,
} from '../../../../../utils';

const INITIALIZATION_FLOWS = [
  INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
  INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
];

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const log = getService('log');
  const supertest = getService('supertest');
  const retryService = getService('retry');

  describe('@ess @serverless @skipInServerlessMKI Bootstrap Prebuilt Rules', () => {
    beforeEach(async () => {
      await deletePrebuiltRulesFleetPackage({ supertest, es, log, retryService });
      await deleteEndpointFleetPackage({ supertest, es, log, retryService });
    });

    it('installs required Fleet packages required for detection engine to function', async () => {
      const { body } = await initializeSecuritySolution(supertest, INITIALIZATION_FLOWS).expect(
        200
      );

      expect(body.flows[INITIALIZATION_FLOW_INIT_PREBUILT_RULES]).toMatchObject({
        status: 'ready',
        payload: expect.objectContaining({
          name: PREBUILT_RULES_PACKAGE_NAME,
        }),
      });
      expect(body.flows[INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION]).toMatchObject({
        status: 'ready',
        payload: expect.objectContaining({
          name: ENDPOINT_PACKAGE_NAME,
        }),
      });
    });

    it('skips packages installation when the package has been already installed', async () => {
      // Install the packages
      await initializeSecuritySolution(supertest, INITIALIZATION_FLOWS).expect(200);
      // Try to install the packages again
      const { body } = await initializeSecuritySolution(supertest, INITIALIZATION_FLOWS).expect(
        200
      );

      expect(body.flows[INITIALIZATION_FLOW_INIT_PREBUILT_RULES]).toMatchObject({
        status: 'ready',
        payload: expect.objectContaining({
          name: PREBUILT_RULES_PACKAGE_NAME,
          install_status: 'already_installed',
        }),
      });
      expect(body.flows[INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION]).toMatchObject({
        status: 'ready',
        payload: expect.objectContaining({
          name: ENDPOINT_PACKAGE_NAME,
          install_status: 'already_installed',
        }),
      });
    });
  });
};
