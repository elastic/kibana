/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const CIS_AWS_OPTION_TEST_ID = 'cisAwsTestId';
const AWS_SINGLE_ACCOUNT_TEST_ID = 'awsSingleTestId';

import { CLOUD_CREDENTIALS_PACKAGE_VERSION } from '@kbn/cloud-security-posture-plugin/common/constants';
import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../../../ftr_provider_context';
export default function ({ getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'settings',
    'common',
    'svlCommonPage',
    'cisAddIntegration',
    'header',
  ]);

  describe('Agentless CIS Integration Page', function () {
    // TODO: we need to check if the tests are running on MKI. There is a suspicion that installing csp package via Kibana server args is not working on MKI.
    this.tags(['skipMKI', 'cloud_security_posture_cis_integration']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let cisIntegrationAws: typeof pageObjects.cisAddIntegration.cisAws;
    const previousPackageVersion = '1.9.0';

    before(async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationAws = pageObjects.cisAddIntegration.cisAws;
    });

    describe('Agentless CIS_AWS Single Account Launch Cloud formation', () => {
      it(`should show CIS_AWS Launch Cloud formation button when credentials selector is direct access keys and package version is ${CLOUD_CREDENTIALS_PACKAGE_VERSION}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
          CLOUD_CREDENTIALS_PACKAGE_VERSION
        );

        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);

        await cisIntegration.selectSetupTechnology('agentless');
        await cisIntegration.selectAwsCredentials('direct');

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(
          (await cisIntegrationAws.showLaunchCloudFormationAgentlessButton()) !== undefined
        ).to.be(true);
      });

      it(`should hide CIS_AWS Launch Cloud formation button when credentials selector is temporary keys and package version is less than ${previousPackageVersion}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(previousPackageVersion);

        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.selectSetupTechnology('agentless');

        await cisIntegration.selectAwsCredentials('temporary');

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationAws.showLaunchCloudFormationAgentlessButton()).to.be(false);
      });
    });

    describe('Agentless CIS_AWS ORG Account Launch Cloud formation', () => {
      // tech debt: this test is failing because the credentials select is not working as expected
      // https://github.com/orgs/elastic/projects/705/views/92?sliceBy%5Bvalue%5D=Agentless+-+API+-+ESS&pane=issue&itemId=73261952
      it.skip(`should show CIS_AWS Launch Cloud formation button when credentials selector is direct access keys and package version is ${CLOUD_CREDENTIALS_PACKAGE_VERSION}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
          CLOUD_CREDENTIALS_PACKAGE_VERSION
        );

        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);

        await cisIntegration.selectSetupTechnology('agentless');

        await cisIntegration.selectAwsCredentials('direct');

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationAws.showLaunchCloudFormationAgentlessButton()).to.be(true);
      });

      it(`should hide CIS_AWS Launch Cloud formation button when credentials selector is temporary keys and package version is less than ${previousPackageVersion}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(previousPackageVersion);

        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.selectSetupTechnology('agentless');

        await cisIntegration.selectAwsCredentials('temporary');

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationAws.showLaunchCloudFormationAgentlessButton()).to.be(false);
      });
    });
  });
}
