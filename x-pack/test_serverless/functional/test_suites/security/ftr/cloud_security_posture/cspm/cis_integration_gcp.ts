/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const CIS_GCP_OPTION_TEST_ID = 'cisGcpTestId';
const GCP_ORGANIZATION_TEST_ID = 'gcpOrganizationAccountTestId';
const SETUP_TECHNOLOGY = 'setup-technology-selector';
const GCP_SINGLE_ACCOUNT_TEST_ID = 'gcpSingleAccountTestId';
const GCP_CLOUD_SHELL_TEST_ID = 'gcpGoogleCloudShellOptionTestId';
const GCP_MANUAL_TEST_ID = 'gcpManualOptionTestId';

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'svlCommonPage', 'cisAddIntegration', 'header']);

  describe('CIS Integration Page', function () {
    // TODO: we need to check if the tests are running on MKI. There is a suspicion that installing csp package via Kibana server args is not working on MKI.
    this.tags(['skipMKI', 'cloud_security_posture_cis_integration']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let cisIntegrationGcp: typeof pageObjects.cisAddIntegration.cisGcp;
    before(async () => {
      await pageObjects.svlCommonPage.login();

      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationGcp = pageObjects.cisAddIntegration.cisGcp;
      await cisIntegration.navigateToAddIntegrationCspmPage();
    });

    describe('CIS_GCP Single Account Launch Cloud shell', () => {
      it('should show CIS_GCP Launch Cloud shell button when setup technology selector is Agentless and credentials selector is direct access keys', async () => {
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_CLOUD_SHELL_TEST_ID);
        await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY);
        await cisIntegration.selectValue(SETUP_TECHNOLOGY, 'Agentless');

        pageObjects.header.waitUntilLoadingHasFinished();

        expect((await cisIntegrationGcp.getLaunchCloudShellAgentlessButton()) !== undefined).to.be(
          true
        );
      });

      it('should hide CIS_GCP Launch Cloud Shell button when setup technology selector is Agentless and credentials selector is temporary_keys ', async () => {
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY);
        await cisIntegration.selectValue(SETUP_TECHNOLOGY, 'Agent-based');

        pageObjects.header.waitUntilLoadingHasFinished();

        expect((await cisIntegrationGcp.getLaunchCloudShellAgentlessButton()) !== undefined).to.be(
          false
        );
      });
    });

    describe('CIS_GCP ORG Account Launch Cloud Shell', () => {
      it('should show CIS_GCP Launch Cloud Shell button when setup technology selector is Agentless and credentials selector is direct access keys', async () => {
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_ORGANIZATION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_CLOUD_SHELL_TEST_ID);
        await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY);
        await cisIntegration.selectValue(SETUP_TECHNOLOGY, 'Agentless');

        pageObjects.header.waitUntilLoadingHasFinished();

        expect((await cisIntegrationGcp.getLaunchCloudShellAgentlessButton()) !== undefined).to.be(
          true
        );
      });

      it('should hide CIS_GCP Launch Cloud shell button when setup technology selector is Agent-based', async () => {
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_ORGANIZATION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_MANUAL_TEST_ID);
        await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY);
        await cisIntegration.selectValue(SETUP_TECHNOLOGY, 'Agent-based');

        pageObjects.header.waitUntilLoadingHasFinished();

        expect((await cisIntegrationGcp.getLaunchCloudShellAgentlessButton()) !== undefined).to.be(
          false
        );
      });
    });
  });
}
