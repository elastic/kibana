/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLOUD_CREDENTIALS_PACKAGE_VERSION } from '@kbn/cloud-security-posture-plugin/common/constants';
import * as http from 'http';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';
import { setupMockServer } from './mock_agentless_api';
// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const agentCreationTimeout = 1000 * 60 * 5; // 5 minutes
  const retry = getService('retry');
  const mockAgentlessApiService = setupMockServer();
  const pageObjects = getPageObjects([
    'common',
    'cspSecurity',
    'security',
    'header',
    'cisAddIntegration',
  ]);

  const CIS_AWS_OPTION_TEST_ID = 'cisAwsTestId';

  const AWS_SINGLE_ACCOUNT_TEST_ID = 'awsSingleTestId';

  describe('Agentless cloud', function () {
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let cisIntegrationAws: typeof pageObjects.cisAddIntegration.cisAws;
    let mockApiServer: http.Server;

    before(async () => {
      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationAws = pageObjects.cisAddIntegration.cisAws;
      mockApiServer = await mockAgentlessApiService.listen(8089); // Start the usage api mock server on port 8081
    });

    after(async () => {
      await pageObjects.cspSecurity.logout();
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

      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.clickSaveButton();
      await pageObjects.header.waitUntilLoadingHasFinished();

      expect(await cisIntegrationAws.showPostInstallCloudFormationModal()).to.be(false);

      await cisIntegration.navigateToIntegrationCspList();
      await pageObjects.header.waitUntilLoadingHasFinished();

      expect(await cisIntegration.getFirstCspmIntegrationPageAgentlessIntegration()).to.be(
        integrationPolicyName
      );

      // wait for eventually healthy status
      await retry.tryForTime(agentCreationTimeout, async () => {
        expect(await cisIntegration.getFirstCspmIntegrationPageAgentlessStatus()).to.be('Healthy');
      });
    });

    it(`should show setup technology selector in edit mode`, async () => {
      const integrationPolicyName = `cloud_security_posture-${new Date().toISOString()}`;
      await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
        CLOUD_CREDENTIALS_PACKAGE_VERSION
      );

      await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
      await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);

      await cisIntegration.inputIntegrationName(integrationPolicyName);

      await cisIntegration.selectSetupTechnology('agentless');
      await cisIntegration.selectAwsCredentials('direct');

      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.clickSaveButton();
      await pageObjects.header.waitUntilLoadingHasFinished();

      expect(await cisIntegrationAws.showPostInstallCloudFormationModal()).to.be(false);

      await cisIntegration.navigateToIntegrationCspList();
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.navigateToEditAgentlessIntegrationPage();
      await pageObjects.header.waitUntilLoadingHasFinished();

      expect(await cisIntegration.showSetupTechnologyComponent()).to.be(true);
    });

    it(`should hide setup technology selector in edit mode`, async () => {
      const integrationPolicyName = `cloud_security_posture1-${new Date().toISOString()}`;
      await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
        CLOUD_CREDENTIALS_PACKAGE_VERSION
      );

      await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
      await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);

      await cisIntegration.inputIntegrationName(integrationPolicyName);
      await cisIntegration.selectSetupTechnology('agent-based');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.clickSaveButton();
      await pageObjects.header.waitUntilLoadingHasFinished();

      expect(await cisIntegrationAws.showPostInstallCloudFormationModal()).to.be(true);

      await cisIntegration.navigateToIntegrationCspList();
      await pageObjects.header.waitUntilLoadingHasFinished();
      await cisIntegration.navigateToEditIntegrationPage();
      await pageObjects.header.waitUntilLoadingHasFinished();

      expect(await cisIntegration.showSetupTechnologyComponent()).to.be(false);
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

      expect(await cisIntegrationAws.showPostInstallCloudFormationModal()).to.be(true);

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
