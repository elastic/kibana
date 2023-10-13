/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

const CIS_GCP_OPTION_TEST_ID = 'cisGcpTestId';
const GCP_ORGANIZATION_TEST_ID = 'gcpOrganizationAccountTestId';
const GCP_SINGLE_ACCOUNT_TEST_ID = 'gcpSingleAccountTestId';
const GCP_CLOUD_SHELL_TEST_ID = 'gcpGoogleCloudShellOptionTestId';
const GCP_MANUAL_TEST_ID = 'gcpManualOptionTestId';
const PRJ_ID_TEST_ID = 'project_id_test_id';
const ORG_ID_TEST_ID = 'organization_id_test_id';
const CREDENTIALS_TYPE_TEST_ID = 'credentials_type_test_id';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getPageObjects, getService } = providerContext;
  const pageObjects = getPageObjects(['cloudPostureDashboard', 'cisAddIntegration', 'header']);
  const kibanaServer = getService('kibanaServer');

  describe('Test adding Cloud Security Posture Integrations', function () {
    this.tags(['cloud_security_posture_cis_integration']);
    let cisIntegrationGcp: typeof pageObjects.cisAddIntegration.cisGcp;
    let cisIntegration: typeof pageObjects.cisAddIntegration;

    beforeEach(async () => {
      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationGcp = pageObjects.cisAddIntegration.cisGcp;

      await cisIntegration.navigateToAddIntegrationCspmPage();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('CIS_GCP Organization', () => {
      it('Switch between Manual and Google cloud shell', async () => {
        await cisIntegrationGcp.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_ORGANIZATION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_MANUAL_TEST_ID);
        /* Check for existing fields. In Manual, Credential field should be visible */
        expect((await cisIntegrationGcp.checkGcpFieldExist(PRJ_ID_TEST_ID)) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist(ORG_ID_TEST_ID)) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist(CREDENTIALS_TYPE_TEST_ID)) === 1).to.be(
          true
        );

        await cisIntegrationGcp.clickOptionButton(GCP_CLOUD_SHELL_TEST_ID);
        /* Check for existing fields. In Google Cloud Shell, Credential field should NOT be visible */
        expect((await cisIntegrationGcp.checkGcpFieldExist(PRJ_ID_TEST_ID)) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist(ORG_ID_TEST_ID)) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist(CREDENTIALS_TYPE_TEST_ID)) === 0).to.be(
          true
        );
      });

      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are no Project ID or Organization ID provided, it should use default value', async () => {
        await cisIntegrationGcp.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_ORGANIZATION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_CLOUD_SHELL_TEST_ID);
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.isPostInstallGoogleCloudShellModal(true)) === true).to.be(
          true
        );
      });

      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID or Organization ID provided, it should use that value', async () => {
        const projectName = 'PRJ_NAME_TEST';
        const organizationName = 'ORG_NAME_TEST';
        await cisIntegrationGcp.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_ORGANIZATION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_CLOUD_SHELL_TEST_ID);
        await cisIntegrationGcp.fillInTextField('project_id_test_id', projectName);
        await cisIntegrationGcp.fillInTextField('organization_id_test_id', organizationName);

        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (await cisIntegrationGcp.isPostInstallGoogleCloudShellModal(
            true,
            organizationName,
            projectName
          )) === true
        ).to.be(true);
      });

      it('Organization ID field on cloud shell command should only be shown if user chose Google Cloud Shell, if user chose Single Account it shouldn not show up', async () => {
        await cisIntegrationGcp.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_CLOUD_SHELL_TEST_ID);

        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.isPostInstallGoogleCloudShellModal(false)) === true).to.be(
          true
        );
      });
    });
  });
}
