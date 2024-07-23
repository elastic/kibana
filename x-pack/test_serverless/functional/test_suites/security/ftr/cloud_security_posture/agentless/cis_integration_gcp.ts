/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const CIS_GCP_OPTION_TEST_ID = 'cisGcpTestId';
const GCP_SINGLE_ACCOUNT_TEST_ID = 'gcpSingleAccountTestId';
const SETUP_TECHNOLOGY_SELECTOR = 'setup-technology-selector';
const SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ = 'setup-technology-selector-accordion';

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'svlCommonPage', 'cisAddIntegration', 'header']);
  const agentlessPreReleaseVersion = '1.10.0-preview01';
  const previousPackageVersion = '1.9.0';

  describe('Agentless CIS Integration Page', function () {
    // TODO: we need to check if the tests are running on MKI. There is a suspicion that installing csp package via Kibana server args is not working on MKI.
    this.tags(['skipMKI', 'cloud_security_posture_cis_integration']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let cisIntegrationGcp: typeof pageObjects.cisAddIntegration.cisGcp;
    before(async () => {
      await pageObjects.svlCommonPage.login();

      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationGcp = pageObjects.cisAddIntegration.cisGcp;
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    describe('Agentless CIS_GCP Single Account Launch Cloud shell', () => {
      it(`should show CIS_GCP Launch Cloud Shell button when package version is ${agentlessPreReleaseVersion}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
          agentlessPreReleaseVersion
        );

        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickAccordianButton(SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ);
        await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY_SELECTOR);
        await cisIntegration.selectValue(SETUP_TECHNOLOGY_SELECTOR, 'agentless');

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(true);
      });

      it(`should hide CIS_GCP Launch Cloud Shell button when package version is less than ${agentlessPreReleaseVersion}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(previousPackageVersion);

        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickAccordianButton(SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ);
        await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY_SELECTOR);
        await cisIntegration.selectValue(SETUP_TECHNOLOGY_SELECTOR, 'agentless');

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(false);
      });
    });

    describe('Agentless CIS_GCP ORG Account Launch Cloud Shell', () => {
      it(`should show CIS_GCP Launch Cloud Shell button when package version is ${agentlessPreReleaseVersion}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
          agentlessPreReleaseVersion
        );

        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickAccordianButton(SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ);
        await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY_SELECTOR);
        await cisIntegration.selectValue(SETUP_TECHNOLOGY_SELECTOR, 'agentless');

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(true);
      });

      it(`should hide CIS_GCP Launch Cloud shell button when package version is ${previousPackageVersion}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(previousPackageVersion);

        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickAccordianButton(SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ);
        await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY_SELECTOR);
        await cisIntegration.selectValue(SETUP_TECHNOLOGY_SELECTOR, 'agentless');

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(false);
      });
    });
  });
}
