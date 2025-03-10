/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as http from 'http';
import expect from '@kbn/expect';
import { AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION } from '../../../constants';
import { setupMockServer } from './mock_agentless_api';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
export default function ({ getPageObjects, getService }: FtrProviderContext) {
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
  const AWS_MANUAL_TEST_ID = 'aws-manual-setup-option';
  const DIRECT_ACCESS_KEY_ID_TEST_ID = 'awsDirectAccessKeyId';
  const DIRECT_ACCESS_SECRET_KEY_TEST_ID = 'passwordInput-secret-access-key';

  describe('Agentless API Serverless', function () {
    this.tags(['skipMKI', 'cloud_security_posture_agentless']);
    let mockApiServer: http.Server;
    let cisIntegration: typeof pageObjects.cisAddIntegration;

    before(async () => {
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
        AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION
      );

      await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
      await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);

      await cisIntegration.inputIntegrationName(integrationPolicyName);

      await cisIntegration.selectAwsCredentials('direct');
      await cisIntegration.fillInTextField(DIRECT_ACCESS_KEY_ID_TEST_ID, 'test');
      await cisIntegration.fillInTextField(DIRECT_ACCESS_SECRET_KEY_TEST_ID, 'test');

      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.clickSaveButton();
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.navigateToIntegrationCspList();
      await pageObjects.header.waitUntilLoadingHasFinished();

      expect(await cisIntegration.getFirstCspmIntegrationPageAgentlessIntegration()).to.be(
        integrationPolicyName
      );

      const resStatus = await cisIntegration.getFirstCspmIntegrationPageAgentlessStatus();
      // The status can only be Pending because the agentless agent will never be created
      expect(resStatus).to.be('Pending');
    });

    it(`should create default agent-based agent`, async () => {
      const integrationPolicyName = `cloud_security_posture-${new Date().toISOString()}`;

      await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
        AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION
      );
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
      await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.inputIntegrationName(integrationPolicyName);
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.selectSetupTechnology('agent-based');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.clickOptionButton(AWS_MANUAL_TEST_ID);
      await cisIntegration.selectAwsCredentials('direct');
      await cisIntegration.fillInTextField(DIRECT_ACCESS_KEY_ID_TEST_ID, 'test');
      await cisIntegration.fillInTextField(DIRECT_ACCESS_SECRET_KEY_TEST_ID, 'test');

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
