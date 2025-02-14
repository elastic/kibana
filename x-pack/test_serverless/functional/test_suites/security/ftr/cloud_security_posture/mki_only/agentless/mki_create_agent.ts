/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION } from '../../../../constants';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'cspSecurity',
    'security',
    'header',
    'cisAddIntegration',
  ]);

  const CIS_AWS_OPTION_TEST_ID = 'cisAwsTestId';

  const AWS_SINGLE_ACCOUNT_TEST_ID = 'awsSingleTestId';

  // This test suite is only running in the Serverless Quality Gates environment
  describe('Agentless API Serverless MKI only', function () {
    this.tags(['cloud_security_posture_agentless']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;

    before(async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
      cisIntegration = pageObjects.cisAddIntegration;
    });

    it(`should create agentless-agent`, async () => {
      const integrationPolicyName = `cloud_security_posture-${new Date().toISOString()}`;
      await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
        AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION
      );

      await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
      await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);

      await cisIntegration.inputIntegrationName(integrationPolicyName);

      await cisIntegration.selectSetupTechnology('agentless');
      await cisIntegration.selectAwsCredentials('direct');

      await pageObjects.header.waitUntilLoadingHasFinished();

      if (process.env.CSPM_AWS_ACCOUNT_ID && process.env.CSPM_AWS_SECRET_KEY) {
        await cisIntegration.fillInTextField(
          cisIntegration.testSubjectIds.DIRECT_ACCESS_KEY_ID_TEST_ID,
          process.env.CSPM_AWS_ACCOUNT_ID
        );

        await cisIntegration.fillInTextField(
          cisIntegration.testSubjectIds.DIRECT_ACCESS_SECRET_KEY_TEST_ID,
          process.env.CSPM_AWS_SECRET_KEY
        );
      }

      await cisIntegration.clickSaveButton();
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.navigateToIntegrationCspList();
      await pageObjects.header.waitUntilLoadingHasFinished();

      expect(await cisIntegration.getFirstCspmIntegrationPageAgentlessIntegration()).to.be(
        integrationPolicyName
      );

      const agentStatusBadge = testSubjects.find('agentlessStatusBadge');
      // The status badge could be either "Pending", "Healthy",  or "Unhealthy" so we are just checking that it exists
      expect(agentStatusBadge).to.be.ok();
    });

    it(`should create default agent-based agent`, async () => {
      const integrationPolicyName = `cloud_security_posture-${new Date().toISOString()}`;

      await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
        AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION
      );

      await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
      await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);

      await cisIntegration.inputIntegrationName(integrationPolicyName);

      await cisIntegration.selectSetupTechnology('agent-based');
      await pageObjects.header.waitUntilLoadingHasFinished();

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
