/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

const CIS_GCP_OPTION_TEST_ID = 'cisGcpTestId';
const CIS_AWS_OPTION_TEST_ID = 'cisAwsTestId';
const GCP_ORGANIZATION_TEST_ID = 'gcpOrganizationAccountTestId';
const GCP_SINGLE_ACCOUNT_TEST_ID = 'gcpSingleAccountTestId';
const GCP_CLOUD_SHELL_TEST_ID = 'gcpGoogleCloudShellOptionTestId';
const GCP_MANUAL_TEST_ID = 'gcpManualOptionTestId';
const PRJ_ID_TEST_ID = 'project_id_test_id';
const ORG_ID_TEST_ID = 'organization_id_test_id';
const CREDENTIALS_TYPE_TEST_ID = 'credentials_type_test_id';
const CREDENTIALS_FILE_TEST_ID = 'credentials_file_test_id';
const CREDENTIALS_JSON_TEST_ID = 'credentials_json_test_id';

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

    describe('CNVM AWS', () => {
      it('Hyperlink on PostInstallation Modal should have the correct URL', async () => {
        await cisIntegration.navigateToAddIntegrationCnvmPage();
        await cisIntegrationGcp.clickSaveButton();
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
            await cisIntegrationGcp.getFieldValueInAddAgentFlyout(
              'launchCloudFormationButtonAgentFlyoutTestId',
              'href'
            )
          ).includes('https://console.aws.amazon.com/cloudformation/')
        ).to.be(true);
      });

      it('Clicking on Launch CloudFormation on post intall modal should lead user to Cloud Formation page', async () => {
        await cisIntegration.navigateToAddIntegrationCnvmPage();
        await cisIntegrationGcp.clickSaveButton();
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

    describe('CIS_AWS', () => {
      it('Initial form state, AWS Org account, and CloudFormation should be selected by default', async () => {
        expect((await cisIntegration.isRadioButtonChecked('cloudbeat/cis_aws')) === true);
        expect((await cisIntegration.isRadioButtonChecked('organization-account')) === true);
        expect((await cisIntegration.isRadioButtonChecked('cloud_formation')) === true);
      });
      it('Hyperlink on PostInstallation Modal should have the correct URL', async () => {
        await cisIntegrationGcp.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegrationGcp.clickSaveButton();
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
            await cisIntegrationGcp.getFieldValueInAddAgentFlyout(
              'launchCloudFormationButtonAgentFlyoutTestId',
              'href'
            )
          ).includes('https://console.aws.amazon.com/cloudformation/')
        ).to.be(true);
      });
      it('Clicking on Launch CloudFormation on post intall modal should lead user to Cloud Formation page', async () => {
        await cisIntegrationGcp.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (
            await cisIntegration.clickLaunchAndGetCurrentUrl(
              'confirmCloudFormationModalConfirmButton',
              2
            )
          ).includes('console.aws.amazon.com%2Fcloudformation')
        ).to.be(true);
      });
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

      it('Add Agent FLyout - Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID or Organization ID provided, it should use that value', async () => {
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTableAddAgent();
        expect(await cisIntegrationGcp.doesStringExistInCodeBlock('PRJ_NAME_TEST')).to.be(true);
        expect(await cisIntegrationGcp.doesStringExistInCodeBlock('ORG_ID=ORG_NAME_TEST')).to.be(
          true
        );
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

      it('Hyperlink on PostInstallation Modal should have the correct URL', async () => {
        await cisIntegrationGcp.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (await cisIntegration.getUrlOnPostInstallModal()) ===
            'https://cloud.google.com/shell/docs'
        );
      });

      it('Clicking on Launch CloudShell on post intall modal should lead user to CloudShell page', async () => {
        await cisIntegrationGcp.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (
            await cisIntegration.clickLaunchAndGetCurrentUrl(
              'confirmGoogleCloudShellModalConfirmButton',
              3
            )
          ).includes('shell.cloud.google.com%2Fcloudshell')
        ).to.be(true);
      });
    });

    describe('CIS_GCP Single', () => {
      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are no Project ID, it should use default value', async () => {
        await cisIntegrationGcp.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_CLOUD_SHELL_TEST_ID);
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.isPostInstallGoogleCloudShellModal(false)) === true).to.be(
          true
        );
      });
      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID, it should use that value', async () => {
        const projectName = 'PRJ_NAME_TEST';
        await cisIntegrationGcp.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_CLOUD_SHELL_TEST_ID);
        await cisIntegrationGcp.fillInTextField('project_id_test_id', projectName);
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (await cisIntegrationGcp.isPostInstallGoogleCloudShellModal(false, '', projectName)) ===
            true
        ).to.be(true);
      });
      it('Add Agent FLyout - Organization ID field on cloud shell command should only be shown if user chose Google Cloud Shell, if user chose Single Account it shouldn not show up', async () => {
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTableAddAgent();
        expect(await cisIntegrationGcp.doesStringExistInCodeBlock('PRJ_NAME_TEST')).to.be(true);
        expect(await cisIntegrationGcp.doesStringExistInCodeBlock('ORG_ID=ORG_NAME_TEST')).to.be(
          false
        );
      });
      it('On add agent modal, if user chose Google Cloud Shell as their setup access; a google cloud shell modal should show up and clicking on the launch button will redirect user to Google cloud shell page', async () => {
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTableAddAgent();
        expect(
          (
            await cisIntegrationGcp.getFieldValueInAddAgentFlyout(
              'launchGoogleCloudShellButtonAgentFlyoutTestId',
              'href'
            )
          ).includes('https://shell.cloud.google.com/cloudshell/')
        ).to.be(true);
      });
      it('Users are able to add CIS_GCP Integration with Manual settings using Credentials File', async () => {
        const projectName = 'PRJ_NAME_TEST';
        const credentialFileName = 'CRED_FILE_TEST_NAME';
        await cisIntegrationGcp.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_MANUAL_TEST_ID);
        await cisIntegrationGcp.fillInTextField(PRJ_ID_TEST_ID, projectName);
        await cisIntegrationGcp.fillInTextField(CREDENTIALS_FILE_TEST_ID, credentialFileName);
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(CREDENTIALS_FILE_TEST_ID)) ===
            credentialFileName
        ).to.be(true);
      });
      it('Users are able to switch credentials_type from/to Credential JSON fields ', async () => {
        const credentialJsonName = 'CRED_JSON_TEST_NAME';
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        await cisIntegrationGcp.chooseDropDown(
          CREDENTIALS_TYPE_TEST_ID,
          'credentials_json_option_test_id'
        );
        await cisIntegrationGcp.fillInTextField(CREDENTIALS_JSON_TEST_ID, credentialJsonName);
        await cisIntegrationGcp.clickSaveIntegrationButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(CREDENTIALS_JSON_TEST_ID)) ===
            credentialJsonName
        ).to.be(true);
      });
      it('Users are able to add CIS_GCP Integration with Manual settings using Credentials JSON', async () => {
        const projectName = 'PRJ_NAME_TEST';
        const credentialJsonName = 'CRED_JSON_TEST_NAME';
        await cisIntegrationGcp.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_MANUAL_TEST_ID);
        await cisIntegrationGcp.fillInTextField(PRJ_ID_TEST_ID, projectName);
        await cisIntegrationGcp.chooseDropDown(
          CREDENTIALS_TYPE_TEST_ID,
          'credentials_json_option_test_id'
        );
        await cisIntegrationGcp.fillInTextField(CREDENTIALS_JSON_TEST_ID, credentialJsonName);
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(CREDENTIALS_JSON_TEST_ID)) ===
            credentialJsonName
        ).to.be(true);
      });
      it('Users are able to switch credentials_type from/to Credential File fields ', async () => {
        const credentialFileName = 'CRED_FILE_TEST_NAME';
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        await cisIntegrationGcp.chooseDropDown(
          CREDENTIALS_TYPE_TEST_ID,
          'credentials_file_option_test_id'
        );
        await cisIntegrationGcp.fillInTextField(CREDENTIALS_FILE_TEST_ID, credentialFileName);
        await cisIntegrationGcp.clickSaveIntegrationButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(CREDENTIALS_FILE_TEST_ID)) ===
            credentialFileName
        ).to.be(true);
      });
    });
  });
}
