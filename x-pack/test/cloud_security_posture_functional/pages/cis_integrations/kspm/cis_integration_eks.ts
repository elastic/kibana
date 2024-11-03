/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

const CIS_EKS_OPTION_TEST_ID = 'cisEksTestId';
const EKS_DIRECT_ACCESS_TEST_ID = 'directAccessKeyTestId';
const EKS_TEMPORARY_KEYS_TEST_ID = 'temporaryKeyTestId';
const EKS_SHARED_CREDENTIAL_TEST_ID = 'sharedCredentialsTestId';
const ROLE_ARN_TEST_ID = 'roleArnInput';
const DIRECT_ACCESS_KEY_ID_TEST_ID = 'directAccessKeyId';
const DIRECT_ACCESS_SECRET_KEY_TEST_ID = 'passwordInput-secret-access-key';
const TEMP_ACCESS_KEY_ID_TEST_ID = 'temporaryKeysAccessKeyId';
const TEMP_ACCESS_KEY_SECRET_KEY_TEST_ID = 'passwordInput-secret-access-key';
const TEMP_ACCESS_SESSION_TOKEN_TEST_ID = 'temporaryKeysSessionToken';
const SHARED_CREDENTIALS_FILE_TEST_ID = 'sharedCredentialFile';
const SHARED_CREDETIALS_PROFILE_NAME_TEST_ID = 'credentialProfileName';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getPageObjects } = providerContext;
  const pageObjects = getPageObjects(['cloudPostureDashboard', 'cisAddIntegration', 'header']);

  describe('Test adding Cloud Security Posture Integrations KSPM EKS', function () {
    this.tags(['cloud_security_posture_cis_integration_kspm_eks']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;

    beforeEach(async () => {
      cisIntegration = pageObjects.cisAddIntegration;
      await cisIntegration.navigateToAddIntegrationKspmPage();
    });

    describe('KSPM EKS Assume Role', async () => {
      it('KSPM EKS Assume Role workflow', async () => {
        const roleArn = 'RoleArnTestValue';
        await cisIntegration.clickOptionButton(CIS_EKS_OPTION_TEST_ID);
        await cisIntegration.inputUniqueIntegrationName();
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

    describe('KSPM EKS Direct Access', async () => {
      it('KSPM EKS Direct Access Workflow', async () => {
        const directAccessKeyId = 'directAccessKeyIdTest';
        const directAccessSecretKey = 'directAccessSecretKeyTest';
        await cisIntegration.clickOptionButton(CIS_EKS_OPTION_TEST_ID);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.clickOptionButton(EKS_DIRECT_ACCESS_TEST_ID);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.inputUniqueIntegrationName();
        await cisIntegration.fillInTextField(DIRECT_ACCESS_KEY_ID_TEST_ID, directAccessKeyId);
        await cisIntegration.fillInTextField(
          DIRECT_ACCESS_SECRET_KEY_TEST_ID,
          directAccessSecretKey
        );
        await pageObjects.header.waitUntilLoadingHasFinished();
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

    describe('KSPM EKS Temporary Keys', () => {
      it('KSPM EKS Temporary Keys Workflow', async () => {
        const accessKeyId = 'accessKeyIdTest';
        const accessKeySecretKey = 'accessKeySecretKeyTest';
        const tempAccessSessionToken = 'tempAccessSessionTokenTest';
        await cisIntegration.clickOptionButton(CIS_EKS_OPTION_TEST_ID);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.clickOptionButton(EKS_TEMPORARY_KEYS_TEST_ID);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.inputUniqueIntegrationName();
        await cisIntegration.fillInTextField(TEMP_ACCESS_KEY_ID_TEST_ID, accessKeyId);
        await cisIntegration.fillInTextField(
          TEMP_ACCESS_KEY_SECRET_KEY_TEST_ID,
          accessKeySecretKey
        );
        await cisIntegration.fillInTextField(
          TEMP_ACCESS_SESSION_TOKEN_TEST_ID,
          tempAccessSessionToken
        );
        await pageObjects.header.waitUntilLoadingHasFinished();
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

    describe('KSPM EKS Shared Credentials', () => {
      it('KSPM EKS Shared Credentials Workflow', async () => {
        const sharedCredentialFile = 'sharedCredentialFileTest';
        const sharedCredentialProfileName = 'sharedCredentialProfileNameTest';
        await cisIntegration.clickOptionButton(CIS_EKS_OPTION_TEST_ID);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.clickOptionButton(EKS_SHARED_CREDENTIAL_TEST_ID);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.inputUniqueIntegrationName();
        await cisIntegration.fillInTextField(SHARED_CREDENTIALS_FILE_TEST_ID, sharedCredentialFile);
        await cisIntegration.fillInTextField(
          SHARED_CREDETIALS_PROFILE_NAME_TEST_ID,
          sharedCredentialProfileName
        );
        await pageObjects.header.waitUntilLoadingHasFinished();
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
