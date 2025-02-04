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
  const { getPageObjects, getService } = providerContext;
  const pageObjects = getPageObjects(['cloudPostureDashboard', 'cisAddIntegration', 'header']);

  describe('Test adding Cloud Security Posture Integrations CNVM', function () {
    this.tags(['cloud_security_posture_cis_integration_cnvm']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    const retry = getService('retry');
    const logger = getService('log');
    const RETRY_COUNT = 5;
    const RETRY_DELAY = 1000;
    const retryOptions = { retryCount: RETRY_COUNT, retryDelay: RETRY_DELAY };

    beforeEach(async () => {
      cisIntegration = pageObjects.cisAddIntegration;

      await cisIntegration.navigateToAddIntegrationCspmPage();
    });

    describe('CNVM AWS', () => {
      it('Hyperlink on PostInstallation Modal should have the correct URL', async () => {
        await retry.tryWithRetries(
          'waiting for loading indicator to be hidden',
          async () => {
            await cisIntegration.navigateToAddIntegrationCnvmPage();
            await cisIntegration.inputUniqueIntegrationName();
            await pageObjects.header.waitUntilLoadingHasFinished();
            await cisIntegration.clickSaveButton();
            await pageObjects.header.waitUntilLoadingHasFinished();
            expect(
              (await cisIntegration.getUrlOnPostInstallModal()) ===
                'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html'
            );
            return true;
          },
          retryOptions,
          async () => {
            // Log the error or handle it in some way
            logger.debug('Failed while waiting for loading indicator');
            return true;
          }
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
    });
  });
}
