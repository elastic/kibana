/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLOUD_CREDENTIALS_PACKAGE_VERSION } from '@kbn/cloud-security-posture-plugin/common/constants';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';
// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
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

    before(async () => {
      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationAws = pageObjects.cisAddIntegration.cisAws; // Start the usage api mock server on port 8081
    });

    after(async () => {
      await pageObjects.cspSecurity.logout();
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

      expect(await cisIntegration.getFirstCspmIntegrationPageIntegration()).to.be(
        integrationPolicyName
      );
      expect(await cisIntegration.getFirstCspmIntegrationPageAgent()).to.be(
        `Agentless policy for ${integrationPolicyName}`
      );
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
