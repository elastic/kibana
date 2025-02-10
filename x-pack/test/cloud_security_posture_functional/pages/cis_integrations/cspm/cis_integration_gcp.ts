/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { testSubjectIds } from '../../../constants/test_subject_ids';

const {
  CIS_GCP_OPTION_TEST_ID,
  GCP_ORGANIZATION_TEST_ID,
  GCP_SINGLE_ACCOUNT_TEST_ID,
  GCP_CLOUD_SHELL_TEST_ID,
  GCP_MANUAL_TEST_ID,
  PRJ_ID_TEST_ID,
  ORG_ID_TEST_ID,
  CREDENTIALS_TYPE_TEST_ID,
  CREDENTIALS_FILE_TEST_ID,
  CREDENTIALS_JSON_TEST_ID,
} = testSubjectIds;

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getPageObjects } = providerContext;
  const pageObjects = getPageObjects(['cloudPostureDashboard', 'cisAddIntegration', 'header']);

  describe('Test adding Cloud Security Posture Integrations CSPM GCP', function () {
    this.tags(['cloud_security_posture_cis_integration_cspm_gcp']);
    let cisIntegrationGcp: typeof pageObjects.cisAddIntegration.cisGcp;
    let cisIntegration: typeof pageObjects.cisAddIntegration;

    beforeEach(async () => {
      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationGcp = pageObjects.cisAddIntegration.cisGcp;

      await cisIntegration.navigateToAddIntegrationCspmPage();
    });

    // FLAKY: https://github.com/elastic/kibana/issues/191027
    describe.skip('CIS_GCP Organization', () => {
      it('Switch between Manual and Google cloud shell', async () => {
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_ORGANIZATION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_MANUAL_TEST_ID);
        /* Check for existing fields. In Manual, Credential field should be visible */
        expect((await cisIntegrationGcp.checkGcpFieldExist(PRJ_ID_TEST_ID)) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist(ORG_ID_TEST_ID)) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist(CREDENTIALS_TYPE_TEST_ID)) === 1).to.be(
          true
        );

        await cisIntegration.clickOptionButton(GCP_CLOUD_SHELL_TEST_ID);
        /* Check for existing fields. In Google Cloud Shell, Credential field should NOT be visible */
        expect((await cisIntegrationGcp.checkGcpFieldExist(PRJ_ID_TEST_ID)) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist(ORG_ID_TEST_ID)) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist(CREDENTIALS_TYPE_TEST_ID)) === 0).to.be(
          true
        );
      });

      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are no Project ID or Organization ID provided, it should use default value', async () => {
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_ORGANIZATION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_CLOUD_SHELL_TEST_ID);
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.isPostInstallGoogleCloudShellModal(true)) === true).to.be(
          true
        );
      });

      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID or Organization ID provided, it should use that value', async () => {
        const projectName = 'PRJ_NAME_TEST';
        const organizationName = 'ORG_NAME_TEST';
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_ORGANIZATION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_CLOUD_SHELL_TEST_ID);
        await cisIntegration.fillInTextField('project_id_test_id', projectName);
        await cisIntegration.fillInTextField('organization_id_test_id', organizationName);

        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (await cisIntegrationGcp.isPostInstallGoogleCloudShellModal(
            true,
            organizationName,
            projectName
          )) === true
        ).to.be(true);
      });

      it('Add Agent FLyout - Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID or Organization ID provided, it should use that value', async () => {
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTableAddAgent();
        expect(await cisIntegration.doesStringExistInCodeBlock('PRJ_NAME_TEST')).to.be(true);
        expect(await cisIntegration.doesStringExistInCodeBlock('ORG_ID=ORG_NAME_TEST')).to.be(true);
      });

      it('Organization ID field on cloud shell command should only be shown if user chose Google Cloud Shell, if user chose Single Account it shouldn not show up', async () => {
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_CLOUD_SHELL_TEST_ID);

        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.isPostInstallGoogleCloudShellModal(false)) === true).to.be(
          true
        );
      });

      it('Hyperlink on PostInstallation Modal should have the correct URL', async () => {
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (await cisIntegration.getUrlOnPostInstallModal()) ===
            'https://cloud.google.com/shell/docs'
        );
      });

      it('Clicking on Launch CloudShell on post intall modal should lead user to CloudShell page', async () => {
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (
            await cisIntegration.clickLaunchAndGetCurrentUrl(
              'confirmGoogleCloudShellModalConfirmButton'
            )
          ).includes('shell.cloud.google.com%2Fcloudshell')
        ).to.be(true);
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/190779
    describe.skip('CIS_GCP Organization Credentials File', () => {
      it('CIS_GCP Organization Credentials File workflow', async () => {
        const projectName = 'PRJ_NAME_TEST';
        const credentialFileName = 'CRED_FILE_TEST_NAME';
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_MANUAL_TEST_ID);
        await cisIntegration.fillInTextField(PRJ_ID_TEST_ID, projectName);
        await cisIntegration.fillInTextField(CREDENTIALS_FILE_TEST_ID, credentialFileName);
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegration.getFieldValueInEditPage(CREDENTIALS_FILE_TEST_ID)) ===
            credentialFileName
        ).to.be(true);
      });
    });

    describe('CIS_GCP Organization Credentials JSON', () => {
      it('CIS_GCP Organization Credentials JSON workflow', async () => {
        const projectName = 'PRJ_NAME_TEST';
        const credentialJsonName = 'CRED_JSON_TEST_NAME';
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_MANUAL_TEST_ID);
        await cisIntegration.fillInTextField(PRJ_ID_TEST_ID, projectName);
        await cisIntegration.chooseDropDown(
          CREDENTIALS_TYPE_TEST_ID,
          'credentials_json_option_test_id'
        );
        await cisIntegration.fillInTextField(CREDENTIALS_JSON_TEST_ID, credentialJsonName);
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        expect(
          (await cisIntegration.getSecretComponentReplaceButton(
            'button-replace-credentials-json'
          )) !== undefined
        ).to.be(true);
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/191144
    describe.skip('CIS_GCP Single', () => {
      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are no Project ID, it should use default value', async () => {
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_CLOUD_SHELL_TEST_ID);
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.isPostInstallGoogleCloudShellModal(false)) === true).to.be(
          true
        );
      });
      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID, it should use that value', async () => {
        const projectName = 'PRJ_NAME_TEST';
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_CLOUD_SHELL_TEST_ID);
        await cisIntegration.fillInTextField('project_id_test_id', projectName);
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (await cisIntegrationGcp.isPostInstallGoogleCloudShellModal(false, '', projectName)) ===
            true
        ).to.be(true);
      });
      it('Add Agent FLyout - Organization ID field on cloud shell command should only be shown if user chose Google Cloud Shell, if user chose Single Account it shouldn not show up', async () => {
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTableAddAgent();
        expect(await cisIntegration.doesStringExistInCodeBlock('PRJ_NAME_TEST')).to.be(true);
        expect(await cisIntegration.doesStringExistInCodeBlock('ORG_ID=ORG_NAME_TEST')).to.be(
          false
        );
      });
      it('On add agent modal, if user chose Google Cloud Shell as their setup access; a google cloud shell modal should show up and clicking on the launch button will redirect user to Google cloud shell page', async () => {
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTableAddAgent();
        expect(
          (
            await cisIntegration.getFieldValueInAddAgentFlyout(
              'launchGoogleCloudShellButtonAgentFlyoutTestId',
              'href'
            )
          )?.includes('https://shell.cloud.google.com/cloudshell/')
        ).to.be(true);
      });
      it('Users are able to add CIS_GCP Integration with Manual settings using Credentials File', async () => {
        const projectName = 'PRJ_NAME_TEST';
        const credentialFileName = 'CRED_FILE_TEST_NAME';
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_MANUAL_TEST_ID);
        await cisIntegration.fillInTextField(PRJ_ID_TEST_ID, projectName);
        await cisIntegration.fillInTextField(CREDENTIALS_FILE_TEST_ID, credentialFileName);
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegration.getFieldValueInEditPage(CREDENTIALS_FILE_TEST_ID)) ===
            credentialFileName
        ).to.be(true);
      });
      it('Users are able to switch credentials_type from/to Credential JSON fields ', async () => {
        const credentialJsonName = 'CRED_JSON_TEST_NAME';
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        await cisIntegration.chooseDropDown(
          CREDENTIALS_TYPE_TEST_ID,
          'credentials_json_option_test_id'
        );
        await cisIntegration.fillInTextField(CREDENTIALS_JSON_TEST_ID, credentialJsonName);
        await cisIntegration.clickSaveIntegrationButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        expect(
          (await cisIntegration.getSecretComponentReplaceButton(
            'button-replace-credentials-json'
          )) !== undefined
        ).to.be(true);
      });
      it('Users are able to add CIS_GCP Integration with Manual settings using Credentials JSON', async () => {
        const projectName = 'PRJ_NAME_TEST';
        const credentialJsonName = 'CRED_JSON_TEST_NAME';
        await cisIntegration.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickOptionButton(GCP_MANUAL_TEST_ID);
        await cisIntegration.fillInTextField(PRJ_ID_TEST_ID, projectName);
        await cisIntegration.chooseDropDown(
          CREDENTIALS_TYPE_TEST_ID,
          'credentials_json_option_test_id'
        );
        await cisIntegration.fillInTextField(CREDENTIALS_JSON_TEST_ID, credentialJsonName);
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        expect(
          (await cisIntegration.getSecretComponentReplaceButton(
            'button-replace-credentials-json'
          )) !== undefined
        ).to.be(true);
      });
      it('Users are able to switch credentials_type from/to Credential File fields ', async () => {
        const credentialFileName = 'CRED_FILE_TEST_NAME';
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        await cisIntegration.chooseDropDown(
          CREDENTIALS_TYPE_TEST_ID,
          'credentials_file_option_test_id'
        );
        await cisIntegration.fillInTextField(CREDENTIALS_FILE_TEST_ID, credentialFileName);
        await cisIntegration.clickSaveIntegrationButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegration.getFieldValueInEditPage(CREDENTIALS_FILE_TEST_ID)) ===
            credentialFileName
        ).to.be(true);
      });
    });
  });
}
