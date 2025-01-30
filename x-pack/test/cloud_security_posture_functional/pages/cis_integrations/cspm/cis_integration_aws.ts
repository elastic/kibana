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
  CIS_AWS_OPTION_TEST_ID,
  AWS_SINGLE_ACCOUNT_TEST_ID,
  AWS_MANUAL_TEST_ID,
  AWS_CREDENTIAL_SELECTOR,
  ROLE_ARN_TEST_ID,
  DIRECT_ACCESS_KEY_ID_TEST_ID,
  DIRECT_ACCESS_SECRET_KEY_TEST_ID,
  TEMP_ACCESS_KEY_ID_TEST_ID,
  TEMP_ACCESS_KEY_SECRET_KEY_TEST_ID,
  TEMP_ACCESS_SESSION_TOKEN_TEST_ID,
  SHARED_CREDENTIALS_FILE_TEST_ID,
  SHARED_CREDETIALS_PROFILE_NAME_TEST_ID,
} = testSubjectIds;

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getPageObjects, getService } = providerContext;
  const pageObjects = getPageObjects(['cloudPostureDashboard', 'cisAddIntegration', 'header']);
  const retry = getService('retry');
  const logger = getService('log');

  describe('Test adding Cloud Security Posture Integrations CSPM AWS', function () {
    this.tags(['cloud_security_posture_cis_integration_cspm_aws']);
    let cisIntegrationAws: typeof pageObjects.cisAddIntegration.cisAws;
    let cisIntegration: typeof pageObjects.cisAddIntegration;

    beforeEach(async () => {
      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationAws = pageObjects.cisAddIntegration.cisAws;
      await cisIntegration.closeAllOpenTabs();
      await cisIntegration.navigateToAddIntegrationCspmPage();
    });

    describe('CIS_AWS Organization Cloud Formation', () => {
      it('Initial form state, AWS Org account, and CloudFormation should be selected by default', async () => {
        expect((await cisIntegration.isRadioButtonChecked('cloudbeat/cis_aws')) === true);
        expect((await cisIntegration.isRadioButtonChecked('organization-account')) === true);
        expect((await cisIntegration.isRadioButtonChecked('cloud_formation')) === true);
      });
      it('Hyperlink on PostInstallation Modal should have the correct URL', async () => {
        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationAws.getPostInstallCloudFormationModal()) !== undefined).to.be(
          true
        );
        await pageObjects.header.waitUntilLoadingHasFinished();
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
            await cisIntegration.getFieldValueInAddAgentFlyout(
              'launchCloudFormationButtonAgentFlyoutTestId',
              'href'
            )
          )?.includes('https://console.aws.amazon.com/cloudformation/')
        ).to.be(true);
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/187470
    describe('CIS_AWS Organization Manual Assume Role', () => {
      it('CIS_AWS Organization Manual Assume Role Workflow', async () => {
        const roleArn = 'RoleArnTestValue';
        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegration.fillInTextField(ROLE_ARN_TEST_ID, roleArn);
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();

        /*
         * sometimes it takes a while to save the integration so added timeout to wait for post install modal
         */
        await retry.try(async () => {
          const modal = await cisIntegration.getPostInstallModal();
          if (!modal) {
            logger.debug('Post install modal not found');
          }
          expect(modal !== undefined).to.be(true);
        });

        await cisIntegration.navigateToIntegrationCspList();
        expect((await cisIntegration.getFieldValueInEditPage(ROLE_ARN_TEST_ID)) === roleArn).to.be(
          true
        );
      });
    });

    describe('CIS_AWS Organization Manual Direct Access', () => {
      it('CIS_AWS Organization Manual Direct Access Workflow', async () => {
        const directAccessKeyId = 'directAccessKeyIdTest';
        const directAccessSecretKey = 'directAccessSecretKeyTest';
        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegration.selectValue(AWS_CREDENTIAL_SELECTOR, 'direct_access_keys');
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegration.fillInTextField(DIRECT_ACCESS_KEY_ID_TEST_ID, directAccessKeyId);
        await cisIntegration.fillInTextField(
          DIRECT_ACCESS_SECRET_KEY_TEST_ID,
          directAccessSecretKey
        );
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegration.getFieldValueInEditPage(DIRECT_ACCESS_KEY_ID_TEST_ID)) ===
            directAccessKeyId
        ).to.be(true);
        expect(await cisIntegration.getReplaceSecretButton('secret-access-key')).to.not.be(null);
      });
    });

    describe('CIS_AWS Organization Manual Temporary Keys', () => {
      it('CIS_AWS Organization Manual Temporary Keys Workflow', async () => {
        const accessKeyId = 'accessKeyIdTest';
        const accessKeySecretKey = 'accessKeySecretKeyTest';
        const tempAccessSessionToken = 'tempAccessSessionTokenTest';
        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegration.selectValue(AWS_CREDENTIAL_SELECTOR, 'temporary_keys');
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegration.fillInTextField(TEMP_ACCESS_KEY_ID_TEST_ID, accessKeyId);
        await cisIntegration.fillInTextField(
          TEMP_ACCESS_KEY_SECRET_KEY_TEST_ID,
          accessKeySecretKey
        );
        await cisIntegration.fillInTextField(
          TEMP_ACCESS_SESSION_TOKEN_TEST_ID,
          tempAccessSessionToken
        );
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        expect(
          (await cisIntegration.getValueInEditPage(TEMP_ACCESS_KEY_ID_TEST_ID)) === accessKeyId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(TEMP_ACCESS_SESSION_TOKEN_TEST_ID)) ===
            tempAccessSessionToken
        ).to.be(true);
        expect(await cisIntegration.getReplaceSecretButton('secret-access-key')).to.not.be(null);
      });
    });

    describe('CIS_AWS Organization Manual Shared Access', () => {
      it('CIS_AWS Organization Manual Shared Access Workflow', async () => {
        const sharedCredentialFile = 'sharedCredentialFileTest';
        const sharedCredentialProfileName = 'sharedCredentialProfileNameTest';
        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegration.selectValue(AWS_CREDENTIAL_SELECTOR, 'shared_credentials');
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegration.fillInTextField(SHARED_CREDENTIALS_FILE_TEST_ID, sharedCredentialFile);
        await cisIntegration.fillInTextField(
          SHARED_CREDETIALS_PROFILE_NAME_TEST_ID,
          sharedCredentialProfileName
        );
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        expect(
          (await cisIntegration.getValueInEditPage(SHARED_CREDENTIALS_FILE_TEST_ID)) ===
            sharedCredentialFile
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(SHARED_CREDETIALS_PROFILE_NAME_TEST_ID)) ===
            sharedCredentialProfileName
        ).to.be(true);
      });
    });

    describe('CIS_AWS Single Cloud Formation', () => {
      it('CIS_AWS Single Cloud Formation workflow', async () => {
        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (await cisIntegration.getUrlOnPostInstallModal()) ===
            'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html'
        );
      });
    });

    describe('CIS_AWS Single Manual Assume Role', () => {
      it('CIS_AWS Single Manual Assume Role Workflow', async () => {
        const roleArn = 'RoleArnTestValue';
        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegration.fillInTextField(ROLE_ARN_TEST_ID, roleArn);
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect((await cisIntegration.getFieldValueInEditPage(ROLE_ARN_TEST_ID)) === roleArn).to.be(
          true
        );
      });
    });

    describe('CIS_AWS Single Manual Direct Access', () => {
      it('CIS_AWS Single Manual Direct Access Workflow', async () => {
        const directAccessKeyId = 'directAccessKeyIdTest';
        const directAccessSecretKey = 'directAccessSecretKeyTest';
        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegration.selectValue(AWS_CREDENTIAL_SELECTOR, 'direct_access_keys');
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegration.fillInTextField(DIRECT_ACCESS_KEY_ID_TEST_ID, directAccessKeyId);
        await cisIntegration.fillInTextField(
          DIRECT_ACCESS_SECRET_KEY_TEST_ID,
          directAccessSecretKey
        );
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        expect(
          (await cisIntegration.getFieldValueInEditPage(DIRECT_ACCESS_KEY_ID_TEST_ID)) ===
            directAccessKeyId
        ).to.be(true);
        expect(await cisIntegration.getReplaceSecretButton('secret-access-key')).to.not.be(null);
      });
    });

    describe('CIS_AWS Single Manual Temporary Keys', () => {
      it('CIS_AWS Single Manual Temporary Keys Workflow', async () => {
        const accessKeyId = 'accessKeyIdTest';
        const accessKeySecretKey = 'accessKeySecretKeyTest';
        const tempAccessSessionToken = 'tempAccessSessionTokenTest';
        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegration.selectValue(AWS_CREDENTIAL_SELECTOR, 'temporary_keys');
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegration.fillInTextField(TEMP_ACCESS_KEY_ID_TEST_ID, accessKeyId);
        await cisIntegration.fillInTextField(
          TEMP_ACCESS_KEY_SECRET_KEY_TEST_ID,
          accessKeySecretKey
        );
        await cisIntegration.fillInTextField(
          TEMP_ACCESS_SESSION_TOKEN_TEST_ID,
          tempAccessSessionToken
        );
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        expect(
          (await cisIntegration.getValueInEditPage(TEMP_ACCESS_KEY_ID_TEST_ID)) === accessKeyId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(TEMP_ACCESS_SESSION_TOKEN_TEST_ID)) ===
            tempAccessSessionToken
        ).to.be(true);
        expect(await cisIntegration.getReplaceSecretButton('secret-access-key')).to.not.be(null);
      });
    });

    describe('CIS_AWS Single Manual Shared Access', () => {
      it('CIS_AWS Single Manual Shared Access Workflow', async () => {
        const sharedCredentialFile = 'sharedCredentialFileTest';
        const sharedCredentialProfileName = 'sharedCredentialProfileNameTest';
        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegration.selectValue(AWS_CREDENTIAL_SELECTOR, 'shared_credentials');
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.clickOptionButton(AWS_MANUAL_TEST_ID);
        await cisIntegration.fillInTextField(SHARED_CREDENTIALS_FILE_TEST_ID, sharedCredentialFile);
        await cisIntegration.fillInTextField(
          SHARED_CREDETIALS_PROFILE_NAME_TEST_ID,
          sharedCredentialProfileName
        );
        await cisIntegration.clickSaveButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        expect(
          (await cisIntegration.getValueInEditPage(SHARED_CREDENTIALS_FILE_TEST_ID)) ===
            sharedCredentialFile
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(SHARED_CREDETIALS_PROFILE_NAME_TEST_ID)) ===
            sharedCredentialProfileName
        ).to.be(true);
      });
    });
  });
}
