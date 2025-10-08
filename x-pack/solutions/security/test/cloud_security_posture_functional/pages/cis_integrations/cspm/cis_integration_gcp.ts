/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  GCP_PROVIDER_TEST_SUBJ,
  GCP_INPUT_FIELDS_TEST_SUBJECTS,
  GCP_ORGANIZATION_ACCOUNT_TEST_SUBJ,
  GCP_SINGLE_ACCOUNT_TEST_SUBJ,
  GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS,
} from '@kbn/cloud-security-posture-common';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { policiesSavedObjects } from '../constants';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getPageObjects, getService } = providerContext;
  const pageObjects = getPageObjects(['cloudPostureDashboard', 'cisAddIntegration', 'header']);
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');

  const saveIntegrationPolicyTimeout = 1000 * 30; // 30 seconds

  describe('Test adding Cloud Security Posture Integrations CSPM GCP', function () {
    this.tags(['cloud_security_posture_cis_integration_cspm_gcp']);
    let cisIntegrationGcp: typeof pageObjects.cisAddIntegration.cisGcp;
    let cisIntegration: typeof pageObjects.cisAddIntegration;

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: policiesSavedObjects });
    });

    beforeEach(async () => {
      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationGcp = pageObjects.cisAddIntegration.cisGcp;
      await cisIntegration.navigateToAddIntegrationCspmPage();
    });

    // FLAKY: https://github.com/elastic/kibana/issues/191027
    describe('CIS_GCP Organization', () => {
      it('Switch between Manual and Google cloud shell', async () => {
        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_ORGANIZATION_ACCOUNT_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL);
        /* Check for existing fields. In Manual, Credential field should be visible */
        expect(
          (await cisIntegrationGcp.checkGcpFieldExist(
            GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID
          )) === 1
        ).to.be(true);
        expect(
          (await cisIntegrationGcp.checkGcpFieldExist(
            GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID
          )) === 1
        ).to.be(true);
        expect(
          (await cisIntegrationGcp.checkGcpFieldExist(
            GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_TYPE
          )) === 1
        ).to.be(true);

        await cisIntegration.clickOptionButton(
          GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUD_SHELL
        );
        /* Check for existing fields. In Google Cloud Shell, Credential field should NOT be visible */
        expect(
          (await cisIntegrationGcp.checkGcpFieldExist(
            GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID
          )) === 1
        ).to.be(true);
        expect(
          (await cisIntegrationGcp.checkGcpFieldExist(
            GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID
          )) === 1
        ).to.be(true);
        expect(
          (await cisIntegrationGcp.checkGcpFieldExist(
            GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_TYPE
          )) === 0
        ).to.be(true);
      });

      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are no Project ID or Organization ID provided, it should use default value', async () => {
        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID);
        await cisIntegration.clickOptionButton(
          GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUD_SHELL
        );
        await cisIntegration.inputUniqueIntegrationName();
        await cisIntegration.clickSaveButton();

        await retry.tryForTime(saveIntegrationPolicyTimeout, async () => {
          await pageObjects.header.waitUntilLoadingHasFinished();
          expect((await cisIntegrationGcp.isPostInstallGoogleCloudShellModal(true)) === true).to.be(
            true
          );
        });
      });

      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID or Organization ID provided, it should use that value', async () => {
        const projectName = 'PRJ_NAME_TEST';
        const organizationName = 'ORG_NAME_TEST';
        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID);
        await cisIntegration.clickOptionButton(
          GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUD_SHELL
        );
        await cisIntegration.fillInTextField('project_id_test_id', projectName);
        await cisIntegration.fillInTextField('organization_id_test_id', organizationName);
        await cisIntegration.inputUniqueIntegrationName();
        await cisIntegration.clickSaveButton();

        await retry.tryForTime(saveIntegrationPolicyTimeout, async () => {
          await pageObjects.header.waitUntilLoadingHasFinished();
          expect(
            (await cisIntegrationGcp.isPostInstallGoogleCloudShellModal(
              true,
              organizationName,
              projectName
            )) === true
          ).to.be(true);
        });
      });

      it('Add Agent FLyout - Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID or Organization ID provided, it should use that value', async () => {
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTableAddAgent();
        expect(await cisIntegration.doesStringExistInCodeBlock('PRJ_NAME_TEST')).to.be(true);
        expect(await cisIntegration.doesStringExistInCodeBlock('ORG_ID=ORG_NAME_TEST')).to.be(true);
      });

      it('Organization ID field on cloud shell command should only be shown if user chose Google Cloud Shell, if user chose Single Account it shouldn not show up', async () => {
        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_SUBJ);
        await cisIntegration.clickOptionButton(
          GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUD_SHELL
        );
        await cisIntegration.inputUniqueIntegrationName();
        await cisIntegration.clickSaveButton();

        await retry.tryForTime(saveIntegrationPolicyTimeout, async () => {
          await pageObjects.header.waitUntilLoadingHasFinished();
          expect(
            (await cisIntegrationGcp.isPostInstallGoogleCloudShellModal(false)) === true
          ).to.be(true);
        });
      });

      it('Hyperlink on PostInstallation Modal should have the correct URL', async () => {
        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.inputUniqueIntegrationName();

        await cisIntegration.clickSaveButton();
        await retry.tryForTime(saveIntegrationPolicyTimeout, async () => {
          await pageObjects.header.waitUntilLoadingHasFinished();
          expect(
            (await cisIntegration.getUrlOnPostInstallModal()) ===
              'https://cloud.google.com/shell/docs'
          );
        });
      });

      it('Clicking on Launch CloudShell on post intall modal should lead user to CloudShell page', async () => {
        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.inputUniqueIntegrationName();

        await cisIntegration.clickSaveButton();
        await retry.tryForTime(saveIntegrationPolicyTimeout, async () => {
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
    });

    // FLAKY: https://github.com/elastic/kibana/issues/190779
    describe('CIS_GCP Organization Credentials File', () => {
      it('CIS_GCP Organization Credentials File workflow', async () => {
        const projectName = 'PRJ_NAME_TEST';
        const credentialFileName = 'CRED_FILE_TEST_NAME';
        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL);
        await cisIntegration.fillInTextField(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID,
          projectName
        );
        await cisIntegration.fillInTextField(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE,
          credentialFileName
        );
        await cisIntegration.inputUniqueIntegrationName();

        await cisIntegration.clickSaveButton();
        await retry.tryForTime(saveIntegrationPolicyTimeout, async () => {
          await pageObjects.header.waitUntilLoadingHasFinished();
          expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
          await cisIntegration.navigateToIntegrationCspList();
          expect(
            (await cisIntegration.getFieldValueInEditPage(
              GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE
            )) === credentialFileName
          ).to.be(true);
        });
      });
    });

    describe('CIS_GCP Organization Credentials JSON', () => {
      it('CIS_GCP Organization Credentials JSON workflow', async () => {
        const projectName = 'PRJ_NAME_TEST';
        const credentialJsonName = 'CRED_JSON_TEST_NAME';
        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL);
        await cisIntegration.fillInTextField(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID,
          projectName
        );
        await cisIntegration.chooseDropDown(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_TYPE,
          'credentials_json_option_test_id'
        );
        await cisIntegration.fillInTextField(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON,
          credentialJsonName
        );
        await cisIntegration.inputUniqueIntegrationName();
        await cisIntegration.clickSaveButton();
        await cisIntegration.waitUntilLaunchCloudFormationButtonAppears();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();

        expect(await cisIntegration.showCredentialJsonSecretPanel()).to.be(true);
      });
    });

    describe('CIS_GCP Single', () => {
      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are no Project ID, it should use default value', async () => {
        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_SUBJ);
        await cisIntegration.clickOptionButton(
          GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUD_SHELL
        );
        await cisIntegration.inputUniqueIntegrationName();
        await cisIntegration.clickSaveButton();

        await retry.tryForTime(saveIntegrationPolicyTimeout, async () => {
          await pageObjects.header.waitUntilLoadingHasFinished();
          expect(
            (await cisIntegrationGcp.isPostInstallGoogleCloudShellModal(false)) === true
          ).to.be(true);
        });
      });
      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID, it should use that value', async () => {
        const projectName = 'PRJ_NAME_TEST';
        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_SUBJ);
        await cisIntegration.clickOptionButton(
          GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUD_SHELL
        );
        await cisIntegration.fillInTextField('project_id_test_id', projectName);
        await cisIntegration.inputUniqueIntegrationName();
        await cisIntegration.clickSaveButton();

        await retry.tryForTime(saveIntegrationPolicyTimeout, async () => {
          await pageObjects.header.waitUntilLoadingHasFinished();
          expect(
            (await cisIntegrationGcp.isPostInstallGoogleCloudShellModal(false, '', projectName)) ===
              true
          ).to.be(true);
        });
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
        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL);
        await cisIntegration.fillInTextField(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID,
          projectName
        );
        await cisIntegration.fillInTextField(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE,
          credentialFileName
        );
        await cisIntegration.inputUniqueIntegrationName();

        await cisIntegration.clickSaveButton();

        await retry.tryForTime(saveIntegrationPolicyTimeout, async () => {
          await pageObjects.header.waitUntilLoadingHasFinished();
          expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
          await cisIntegration.navigateToIntegrationCspList();
          expect(
            (await cisIntegration.getFieldValueInEditPage(
              GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE
            )) === credentialFileName
          ).to.be(true);
        });
      });
      it('Users are able to switch credentials_type from/to Credential JSON fields ', async () => {
        const credentialJsonName = 'CRED_JSON_TEST_NAME';
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        await cisIntegration.chooseDropDown(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_TYPE,
          'credentials_json_option_test_id'
        );
        await cisIntegration.fillInTextField(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON,
          credentialJsonName
        );
        await cisIntegration.clickSaveIntegrationButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.navigateToIntegrationCspList();
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegration.showCredentialJsonSecretPanel()).to.be(true);
      });
      it('Users are able to add CIS_GCP Integration with Manual settings using Credentials JSON', async () => {
        const projectName = 'PRJ_NAME_TEST';
        const credentialJsonName = 'CRED_JSON_TEST_NAME';
        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.fillInTextField(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID,
          projectName
        );
        await cisIntegration.chooseDropDown(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_TYPE,
          'credentials_json_option_test_id'
        );
        await cisIntegration.fillInTextField(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON,
          credentialJsonName
        );
        await cisIntegration.inputUniqueIntegrationName();

        await cisIntegration.clickSaveButton();
        await cisIntegration.waitUntilLaunchCloudFormationButtonAppears();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await cisIntegration.showCredentialJsonSecretPanel()).to.be(true);
      });
      it('Users are able to switch credentials_type from/to Credential File fields ', async () => {
        const credentialFileName = 'CRED_FILE_TEST_NAME';
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        await cisIntegration.chooseDropDown(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_TYPE,
          'credentials_file_option_test_id'
        );
        await cisIntegration.fillInTextField(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE,
          credentialFileName
        );
        await cisIntegration.clickSaveIntegrationButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegration.getFieldValueInEditPage(
            GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE
          )) === credentialFileName
        ).to.be(true);
      });
    });
  });
}
