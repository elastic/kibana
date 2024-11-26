/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLOUD_CREDENTIALS_PACKAGE_VERSION } from '@kbn/cloud-security-posture-plugin/common/constants';
import * as http from 'http';
import expect from '@kbn/expect';
import { setupMockServer } from './mock_agentless_api';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const agentCreationTimeout = 1000 * 60 * 1; // 1 minute
  const retry = getService('retry');
  const mockAgentlessApiService = setupMockServer();
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'cspSecurity',
    'security',
    'header',
    'cisAddIntegration',
  ]);

  const CIS_AWS_OPTION_TEST_ID = 'cisAwsTestId';

  const AWS_SINGLE_ACCOUNT_TEST_ID = 'awsSingleTestId';

  describe('Agentless API Serverless', function () {
    let mockApiServer: http.Server;
    let cisIntegration: typeof pageObjects.cisAddIntegration;

    before(async () => {
      // If process.env.TEST_CLOUD is set, then the test is running in the Serverless Quality Gates
      // and this MSW server will be listening for a request that will never come.
      mockApiServer = mockAgentlessApiService.listen(8089); // Start the usage api mock server on port 8089
      await pageObjects.svlCommonPage.loginAsAdmin();
      cisIntegration = pageObjects.cisAddIntegration;
    });

    after(async () => {
      mockApiServer.close();
    });

    it(`should create agentless-agent`, async () => {
      const integrationPolicyName = `cloud_security_posture-${new Date().toISOString()}`;
      await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
        CLOUD_CREDENTIALS_PACKAGE_VERSION
      );

      await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
      await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);

      await cisIntegration.inputIntegrationName(integrationPolicyName);

      await cisIntegration.selectSetupTechnology('agentless');
      await cisIntegration.selectAwsCredentials('direct');

      if (
        process.env.TEST_CLOUD &&
        process.env.CSPM_AWS_ACCOUNT_ID &&
        process.env.CSPM_AWS_SECRET_KEY
      ) {
        await cisIntegration.fillInTextField(
          cisIntegration.testSubjectIds.DIRECT_ACCESS_KEY_ID_TEST_ID,
          process.env.CSPM_AWS_ACCOUNT_ID
        );

        await cisIntegration.fillInTextField(
          cisIntegration.testSubjectIds.DIRECT_ACCESS_SECRET_KEY_TEST_ID,
          process.env.CSPM_AWS_SECRET_KEY
        );
      }

      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.clickSaveButton();
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.navigateToIntegrationCspList();
      await pageObjects.header.waitUntilLoadingHasFinished();

      expect(await cisIntegration.getFirstCspmIntegrationPageAgentlessIntegration()).to.be(
        integrationPolicyName
      );

      // wait for eventually Pending or Healthy status
      // purpose of this retry is to wait for the agent to be created and the status to be updated
      // not to wait for the agent to be healthy
      await retry.tryForTime(agentCreationTimeout, async () => {
        const resStatus = await cisIntegration.getFirstCspmIntegrationPageAgentlessStatus();
        expect(resStatus == 'Healthy' || resStatus == 'Pending').to.be(true);
      });
    });

    it(`should create default agent-based agent`, async () => {
      const integrationPolicyName = `cloud_security_posture-${new Date().toISOString()}`;

      await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
        CLOUD_CREDENTIALS_PACKAGE_VERSION
      );

      await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
      await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);

      await cisIntegration.inputIntegrationName(integrationPolicyName);

      await cisIntegration.clickSaveButton();
      await pageObjects.header.waitUntilLoadingHasFinished();

      const agentPolicyName = await cisIntegration.getAgentBasedPolicyValue();

      await cisIntegration.navigateToIntegrationCspList();
      await pageObjects.header.waitUntilLoadingHasFinished();

      expect(await cisIntegration.getFirstCspmIntegrationPageIntegration()).to.be(
        integrationPolicyName
      );
      expect(await cisIntegration.getFirstCspmIntegrationPageAgent()).to.be(agentPolicyName);
    });
  });
}
