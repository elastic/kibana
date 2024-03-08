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
const AWS_SINGLE_ACCOUNT_TEST_ID = 'awsSingleTestId';
const GCP_CLOUD_SHELL_TEST_ID = 'gcpGoogleCloudShellOptionTestId';
const GCP_MANUAL_TEST_ID = 'gcpManualOptionTestId';
const AWS_MANUAL_TEST_ID = 'aws-manual-setup-option';
const PRJ_ID_TEST_ID = 'project_id_test_id';
const ORG_ID_TEST_ID = 'organization_id_test_id';
const CREDENTIALS_TYPE_TEST_ID = 'credentials_type_test_id';
const CREDENTIALS_FILE_TEST_ID = 'credentials_file_test_id';
const CREDENTIALS_JSON_TEST_ID = 'credentials_json_test_id';
const AWS_CREDENTIAL_SELECTOR = 'aws-credentials-type-selector';
const ROLE_ARN_TEST_ID = 'roleArnInput';
const ASSUME_ROLE_ID_TEST_ID = 'assumeRoleIdInput';
const ASSUME_ROLE_ID_SECRET_KEY_TEST_ID = 'assumeRoleIdSecretKey';
const TEMP_ACCESS_KEY_ID_TEST_ID = 'temporaryKeysAccessKeyId';
const TEMP_ACCESS_KEY_SECRET_KEY_TEST_ID = 'temporaryKeysSecretAccessKey';
const TEMP_ACCESS_SESSION_TOKEN_TEST_ID = 'temporaryKeysSessionToken';
const SHARED_CREDENTIALS_FILE_TEST_ID = 'sharedCredentialFile';
const SHARED_CREDETIALS_PROFILE_NAME_TEST_ID = 'credentialProfileName';

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

    describe('CIS_AWS Organization Cloud Formation', () => {
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

    describe('CIS_AWS Organization Manual Assume Role', () => {
      it('CIS_AWS Organization Manual Assume Role Workflow', async () => {
        const roleArn = 'RoleArnTestValue';
        await cisIntegrationGcp.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegrationGcp.fillInTextField(ROLE_ARN_TEST_ID, roleArn);
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(ROLE_ARN_TEST_ID)) === roleArn
        ).to.be(true);
      });
    });

    describe('CIS_AWS Organization Manual Direct Access', () => {
      it('CIS_AWS Organization Manual Direct Access Workflow', async () => {
        const directAccessKeyId = 'directAccessKeyIdTest';
        const directAccessSecretKey = 'directAccessSecretKeyTest';
        await cisIntegrationGcp.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegrationGcp.selectValue(AWS_CREDENTIAL_SELECTOR, 'direct_access_keys');
        await cisIntegrationGcp.fillInTextField(ASSUME_ROLE_ID_TEST_ID, directAccessKeyId);
        await cisIntegrationGcp.fillInTextField(
          ASSUME_ROLE_ID_SECRET_KEY_TEST_ID,
          directAccessSecretKey
        );
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(ASSUME_ROLE_ID_TEST_ID)) ===
            directAccessKeyId
        ).to.be(true);
      });
    });

    describe('CIS_AWS Organization Manual Temporary Keys', () => {
      it('CIS_AWS Organization Manual Temporary Keys Workflow', async () => {
        const accessKeyId = 'accessKeyIdTest';
        const accessKeySecretKey = 'accessKeySecretKeyTest';
        const tempAccessSessionToken = 'tempAccessSessionTokenTest';
        await cisIntegrationGcp.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegrationGcp.selectValue(AWS_CREDENTIAL_SELECTOR, 'temporary_keys');
        await cisIntegrationGcp.fillInTextField(TEMP_ACCESS_KEY_ID_TEST_ID, accessKeyId);
        await cisIntegrationGcp.fillInTextField(
          TEMP_ACCESS_KEY_SECRET_KEY_TEST_ID,
          accessKeySecretKey
        );
        await cisIntegrationGcp.fillInTextField(
          TEMP_ACCESS_SESSION_TOKEN_TEST_ID,
          tempAccessSessionToken
        );
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(TEMP_ACCESS_KEY_ID_TEST_ID)) ===
            accessKeyId
        ).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(TEMP_ACCESS_SESSION_TOKEN_TEST_ID)) ===
            tempAccessSessionToken
        ).to.be(true);
      });
    });

    describe('CIS_AWS Organization Manual Shared Access', () => {
      it('CIS_AWS Organization Manual Shared Access Workflow', async () => {
        const sharedCredentialFile = 'sharedCredentialFileTest';
        const sharedCredentialProfileName = 'sharedCredentialProfileNameTest';
        await cisIntegrationGcp.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegrationGcp.selectValue(AWS_CREDENTIAL_SELECTOR, 'shared_credentials');
        await cisIntegrationGcp.fillInTextField(
          SHARED_CREDENTIALS_FILE_TEST_ID,
          sharedCredentialFile
        );
        await cisIntegrationGcp.fillInTextField(
          SHARED_CREDETIALS_PROFILE_NAME_TEST_ID,
          sharedCredentialProfileName
        );
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(SHARED_CREDENTIALS_FILE_TEST_ID)) ===
            sharedCredentialFile
        ).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(
            SHARED_CREDETIALS_PROFILE_NAME_TEST_ID
          )) === sharedCredentialProfileName
        ).to.be(true);
      });
    });

    describe('CIS_AWS Single Cloud Formation', () => {
      it('CIS_AWS Single Cloud Formation workflow', async () => {
        await cisIntegrationGcp.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (await cisIntegration.getUrlOnPostInstallModal()) ===
            'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html'
        );
      });
    });

    describe('CIS_AWS Single Manual Assume Role', () => {
      it('CIS_AWS Single Manual Assume Role Workflow', async () => {
        const roleArn = 'RoleArnTestValue';
        await cisIntegrationGcp.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegrationGcp.fillInTextField(ROLE_ARN_TEST_ID, roleArn);
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(ROLE_ARN_TEST_ID)) === roleArn
        ).to.be(true);
      });
    });

    describe('CIS_AWS Single Manual Direct Access', () => {
      it('CIS_AWS Single Manual Direct Access Workflow', async () => {
        const directAccessKeyId = 'directAccessKeyIdTest';
        const directAccessSecretKey = 'directAccessSecretKeyTest';
        await cisIntegrationGcp.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegrationGcp.selectValue(AWS_CREDENTIAL_SELECTOR, 'direct_access_keys');
        await cisIntegrationGcp.fillInTextField(ASSUME_ROLE_ID_TEST_ID, directAccessKeyId);
        await cisIntegrationGcp.fillInTextField(
          ASSUME_ROLE_ID_SECRET_KEY_TEST_ID,
          directAccessSecretKey
        );
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(ASSUME_ROLE_ID_TEST_ID)) ===
            directAccessKeyId
        ).to.be(true);
      });
    });

    describe('CIS_AWS Single Manual Temporary Keys', () => {
      it('CIS_AWS Single Manual Temporary Keys Workflow', async () => {
        const accessKeyId = 'accessKeyIdTest';
        const accessKeySecretKey = 'accessKeySecretKeyTest';
        const tempAccessSessionToken = 'tempAccessSessionTokenTest';
        await cisIntegrationGcp.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegrationGcp.selectValue(AWS_CREDENTIAL_SELECTOR, 'temporary_keys');
        await cisIntegrationGcp.fillInTextField(TEMP_ACCESS_KEY_ID_TEST_ID, accessKeyId);
        await cisIntegrationGcp.fillInTextField(
          TEMP_ACCESS_KEY_SECRET_KEY_TEST_ID,
          accessKeySecretKey
        );
        await cisIntegrationGcp.fillInTextField(
          TEMP_ACCESS_SESSION_TOKEN_TEST_ID,
          tempAccessSessionToken
        );
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(TEMP_ACCESS_KEY_ID_TEST_ID)) ===
            accessKeyId
        ).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(TEMP_ACCESS_SESSION_TOKEN_TEST_ID)) ===
            tempAccessSessionToken
        ).to.be(true);
      });
    });

    describe('CIS_AWS Single Manual Shared Access', () => {
      it('CIS_AWS Single Manual Shared Access Workflow', async () => {
        const sharedCredentialFile = 'sharedCredentialFileTest';
        const sharedCredentialProfileName = 'sharedCredentialProfileNameTest';
        await cisIntegrationGcp.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegrationGcp.selectValue(AWS_CREDENTIAL_SELECTOR, 'shared_credentials');
        await cisIntegrationGcp.fillInTextField(
          SHARED_CREDENTIALS_FILE_TEST_ID,
          sharedCredentialFile
        );
        await cisIntegrationGcp.fillInTextField(
          SHARED_CREDETIALS_PROFILE_NAME_TEST_ID,
          sharedCredentialProfileName
        );
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(SHARED_CREDENTIALS_FILE_TEST_ID)) ===
            sharedCredentialFile
        ).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegrationGcp.getFieldValueInEditPage(
            SHARED_CREDETIALS_PROFILE_NAME_TEST_ID
          )) === sharedCredentialProfileName
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

      it('Clicking on Launch CloudShell on post install modal should lead user to CloudShell page', async () => {
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

    describe('CIS_GCP Organization Credentials File', () => {
      it('CIS_GCP Organization Credentials File workflow', async () => {
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
    });

    describe('CIS_GCP Organization Credentials JSON', () => {
      it('CIS_GCP Organization Credentials JSON workflow', async () => {
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
