/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as http from 'http';
import expect from '@kbn/expect';
import equals from 'fast-deep-equal';
import {
  AWS_PROVIDER_TEST_SUBJ,
  AWS_SINGLE_ACCOUNT_TEST_SUBJ,
} from '@kbn/cloud-security-posture-common';
import { CLOUD_SECURITY_POSTURE_PACKAGE_VERSION } from '../constants';
import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const agentCreationTimeout = 1000 * 60 * 1; // 1 minute
  const retry = getService('retry');
  const pageObjects = getPageObjects([
    'common',
    'cspSecurity',
    'security',
    'header',
    'cisAddIntegration',
  ]);

  // https://github.com/elastic/kibana/issues/229298
  describe('Agentless cloud', function () {
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let cisIntegrationAws: typeof pageObjects.cisAddIntegration.cisAws;
    let mockApiServer: http.Server;

    before(async () => {
      const { setupMockServer } = await import('./mock_agentless_api');
      const mockAgentlessApiService = setupMockServer();
      mockApiServer = mockAgentlessApiService.listen(8089);

      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationAws = pageObjects.cisAddIntegration.cisAws;
    });

    after(async () => {
      await pageObjects.cspSecurity.logout();
      mockApiServer.close();
    });

    it('Hyperlink on PostInstallation Modal should have the correct URL', async () => {
      await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
        CLOUD_SECURITY_POSTURE_PACKAGE_VERSION
      );
      await cisIntegration.clickOptionButton(AWS_PROVIDER_TEST_SUBJ);
      await cisIntegration.inputUniqueIntegrationName();
      await pageObjects.header.waitUntilLoadingHasFinished();
      await cisIntegration.selectSetupTechnology('agent-based');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await cisIntegration.clickSaveButton();
      await retry.tryForTime(agentCreationTimeout, async () => {
        await cisIntegration.waitUntilLaunchCloudFormationButtonAppears();
        expect((await cisIntegrationAws.getPostInstallCloudFormationModal()) !== undefined).to.be(
          true
        );
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (await cisIntegration.getUrlOnPostInstallModal()) ===
            'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html'
        );
      });
    });

    it(`should create agentless-agent`, async () => {
      const integrationPolicyName = `cloud_security_posture-${new Date().toISOString()}`;
      await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
        CLOUD_SECURITY_POSTURE_PACKAGE_VERSION
      );

      await cisIntegration.clickOptionButton(AWS_PROVIDER_TEST_SUBJ);
      await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_SUBJ);

      await cisIntegration.inputIntegrationName(integrationPolicyName);

      await cisIntegration.selectSetupTechnology('agentless');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.selectAwsCredentials('direct');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.fillInTextField('awsDirectAccessKeyId', 'access_key_id');
      await cisIntegration.fillInTextField('passwordInput-secret-access-key', 'secret_access_key');

      await cisIntegration.clickSaveButton();
      await pageObjects.header.waitUntilLoadingHasFinished();
      await retry.tryForTime(agentCreationTimeout, async () => {
        await cisIntegration.waitUntilLaunchCloudFormationButtonAppears();
        expect(await cisIntegrationAws.showPostInstallCloudFormationModal()).to.be(false);
      });

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
        expect(equals(resStatus, 'Healthy') || equals(resStatus, 'Pending')).to.be(true);
      });
    });

    it(`should show setup technology selector in edit mode`, async () => {
      const integrationPolicyName = `cloud_security_posture-${new Date().toISOString()}`;
      await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
        CLOUD_SECURITY_POSTURE_PACKAGE_VERSION
      );

      await cisIntegration.clickOptionButton(AWS_PROVIDER_TEST_SUBJ);
      await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_SUBJ);

      await cisIntegration.inputIntegrationName(integrationPolicyName);

      await cisIntegration.selectSetupTechnology('agentless');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.selectAwsCredentials('direct');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.fillInTextField('awsDirectAccessKeyId', 'access_key_id');
      await cisIntegration.fillInTextField('passwordInput-secret-access-key', 'secret_access_key');

      await cisIntegration.clickSaveButton();

      await retry.tryForTime(agentCreationTimeout, async () => {
        await cisIntegration.waitUntilLaunchCloudFormationButtonAppears();
        expect(await cisIntegrationAws.showPostInstallCloudFormationModal()).to.be(false);
      });

      await cisIntegration.navigateToIntegrationCspList();
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.navigateToEditAgentlessIntegrationPage();
      await pageObjects.header.waitUntilLoadingHasFinished();

      expect(await cisIntegration.showSetupTechnologyComponent()).to.be(true);
    });

    it(`should hide setup technology selector in edit mode`, async () => {
      const integrationPolicyName = `cloud_security_posture1-${new Date().toISOString()}`;
      await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
        CLOUD_SECURITY_POSTURE_PACKAGE_VERSION
      );

      await cisIntegration.clickOptionButton(AWS_PROVIDER_TEST_SUBJ);
      await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_SUBJ);

      await cisIntegration.inputIntegrationName(integrationPolicyName);
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.selectSetupTechnology('agent-based');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.clickSaveButton();

      // add timeout to give extra time for the modal to show up
      await retry.tryForTime(agentCreationTimeout, async () => {
        await cisIntegration.waitUntilLaunchCloudFormationButtonAppears();
        const resStatus = await cisIntegrationAws.showPostInstallCloudFormationModal();
        expect(resStatus).to.be(true);
      });

      await cisIntegration.navigateToIntegrationCspList();
      await pageObjects.header.waitUntilLoadingHasFinished();
      await cisIntegration.navigateToEditIntegrationPage();
      await pageObjects.header.waitUntilLoadingHasFinished();

      expect(await cisIntegration.showSetupTechnologyComponent()).to.be(false);
    });

    it(`should create default agent-based agent`, async () => {
      const integrationPolicyName = `cloud_security_posture-${new Date().toISOString()}`;

      await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
        CLOUD_SECURITY_POSTURE_PACKAGE_VERSION
      );

      await cisIntegration.clickOptionButton(AWS_PROVIDER_TEST_SUBJ);
      await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_SUBJ);

      await cisIntegration.inputIntegrationName(integrationPolicyName);
      await cisIntegration.selectSetupTechnology('agent-based');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.clickSaveButton();

      await retry.tryForTime(agentCreationTimeout, async () => {
        await cisIntegration.waitUntilLaunchCloudFormationButtonAppears();
        expect(await cisIntegrationAws.showPostInstallCloudFormationModal()).to.be(true);
      });

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
