/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getPageObjects } = providerContext;
  const pageObjects = getPageObjects(['cloudPostureDashboard', 'cisAddIntegration', 'header']);

  describe('Test adding Cloud Security Posture Integrations CNVM', function () {
    this.tags(['cloud_security_posture_cis_integration_cnvm']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;

    beforeEach(async () => {
      cisIntegration = pageObjects.cisAddIntegration;

      await cisIntegration.navigateToAddIntegrationCspmPage();
    });

    // FLAKY: https://github.com/elastic/kibana/issues/186302
    describe.skip('CNVM AWS', () => {
      it('Hyperlink on PostInstallation Modal should have the correct URL', async () => {
        await cisIntegration.navigateToAddIntegrationCnvmPage();
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (await cisIntegration.getUrlOnPostInstallModal()) ===
            'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html'
        );
      });

      it('On Add Agent modal there should be modal that has Cloud Formation details as well as button that redirects user to Cloud formation page on AWS upon clicking them ', async () => {
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTableAddAgent();
        expect(
          (
            await cisIntegration.getFieldValueInAddAgentFlyout(
              'launchCloudFormationButtonAgentFlyoutTestId',
              'href'
            )
          )?.includes('https://console.aws.amazon.com/cloudformation/')
        ).to.be(true);
      });

      it('Clicking on Launch CloudFormation on post intall modal should lead user to Cloud Formation page', async () => {
        await cisIntegration.navigateToAddIntegrationCnvmPage();
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (
            await cisIntegration.clickLaunchAndGetCurrentUrl(
              'confirmCloudFormationModalConfirmButton',
              1
            )
          ).includes('console.aws.amazon.com%2Fcloudformation')
        ).to.be(true);
      });
    });
  });
}
