/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLOUD_CREDENTIALS_PACKAGE_VERSION } from '@kbn/cloud-security-posture-plugin/common/constants';
import expect from '@kbn/expect';
import * as http from 'http';
import type { FtrProviderContext } from '../ftr_provider_context';
import { setupMockServer } from './mock_agentless_api';
// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const mockAgentlessApiService = setupMockServer();
  const pageObjects = getPageObjects([
    'common',
    'cspSecurity',
    'security',
    'header',
    'cisAddIntegration',
  ]);

  const CIS_AWS_OPTION_TEST_ID = 'cisAwsTestId';
  const AWS_CREDENTIAL_SELECTOR = 'aws-credentials-type-selector';
  const SETUP_TECHNOLOGY_SELECTOR = 'setup-technology-selector';
  const SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ = 'setup-technology-selector-accordion';

  const AWS_SINGLE_ACCOUNT_TEST_ID = 'awsSingleTestId';

  describe('Agentless cloud', function () {
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let mockApiServer: http.Server;
    // let cisIntegrationAws: typeof pageObjects.cisAddIntegration.cisAws;

    before(async () => {
      // await pageObjects.cspSecurity.createUsers();
      // await pageObjects.cspSecurity.login('csp_read_user');
      cisIntegration = pageObjects.cisAddIntegration;
      // cisIntegrationAws = pageObjects.cisAddIntegration.cisAws;

      mockApiServer = await mockAgentlessApiService.listen(8089); // Start the usage api mock server on port 8081
    });

    after(async () => {
      await await pageObjects.cspSecurity.logout();
      mockApiServer.close();
    });

    describe('Agentless API', () => {
      it(`should create agentless-agent`, async () => {
        const integrationName = `cloud_security_posture-${new Date().toISOString()}`;
        // await cisIntegration.navigateToAddIntegrationCspmPage();
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
          CLOUD_CREDENTIALS_PACKAGE_VERSION
        );

        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);

        // await cisIntegration.findOptionInPage();
        await cisIntegration.clickAccordianButton(SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ);
        await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY_SELECTOR);
        await cisIntegration.selectValue(SETUP_TECHNOLOGY_SELECTOR, 'agentless');
        await cisIntegration.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegration.selectValue(AWS_CREDENTIAL_SELECTOR, 'direct_access_keys');

        await pageObjects.header.waitUntilLoadingHasFinished();

        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
      });

      //   it(`should hide CIS_AWS Launch Cloud formation button when credentials selector is temporary keys and package version is less than ${previousPackageVersion}`, async () => {
      //     await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(previousPackageVersion);

      //     await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
      //     await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);
      //     await cisIntegration.clickAccordianButton(SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ);
      //     await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY_SELECTOR);
      //     await cisIntegration.selectValue(SETUP_TECHNOLOGY_SELECTOR, 'agent-based');
      //     await cisIntegration.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
      //     await cisIntegration.selectValue(AWS_CREDENTIAL_SELECTOR, 'temporary_keys');

      //     await pageObjects.header.waitUntilLoadingHasFinished();

      //     expect(await cisIntegrationAws.showLaunchCloudFormationAgentlessButton()).to.be(false);
      //   });
      // });

      // describe('Agentless CIS_AWS ORG Account Launch Cloud formation', () => {
      //   it(`should show CIS_AWS Launch Cloud formation button when credentials selector is direct access keys and package version is ${CLOUD_CREDENTIALS_PACKAGE_VERSION}`, async () => {
      //     await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
      //       CLOUD_CREDENTIALS_PACKAGE_VERSION
      //     );

      //     await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
      //     await cisIntegration.clickAccordianButton(SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ);
      //     await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY_SELECTOR);
      //     await cisIntegration.selectValue(SETUP_TECHNOLOGY_SELECTOR, 'agentless');
      //     await cisIntegration.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
      //     await cisIntegration.selectValue(AWS_CREDENTIAL_SELECTOR, 'direct_access_keys');

      //     await pageObjects.header.waitUntilLoadingHasFinished();

      //     expect(await cisIntegrationAws.showLaunchCloudFormationAgentlessButton()).to.be(true);
      //   });

      //   it(`should hide CIS_AWS Launch Cloud formation button when credentials selector is temporary keys and package version is less than ${previousPackageVersion}`, async () => {
      //     await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(previousPackageVersion);

      //     await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
      //     await cisIntegration.clickAccordianButton(SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ);
      //     await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY_SELECTOR);
      //     await cisIntegration.selectValue(SETUP_TECHNOLOGY_SELECTOR, 'agentless');
      //     await cisIntegration.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
      //     await cisIntegration.selectValue(AWS_CREDENTIAL_SELECTOR, 'temporary_keys');

      //     await pageObjects.header.waitUntilLoadingHasFinished();

      //     expect(await cisIntegrationAws.showLaunchCloudFormationAgentlessButton()).to.be(false);
      //   });
    });
  });
}
