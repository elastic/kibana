/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

const CIS_AZURE_OPTION_TEST_ID = 'cisAzureTestId';
const CIS_AZURE_SINGLE_SUB_TEST_ID = 'azureSingleAccountTestId';
const AZURE_CREDENTIAL_SELECTOR = 'azure-credentials-type-selector';

const clientId = 'clientIdTest';
const tenantId = 'tenantIdTest';
const clientCertificatePath = 'clientCertificatePathTest';
const clientSecret = 'clientSecretTest';

export const CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS = {
  TENANT_ID: 'cisAzureTenantId',
  CLIENT_ID: 'cisAzureClientId',
  CLIENT_SECRET: 'passwordInput-client-secret',
  CLIENT_CERTIFICATE_PATH: 'cisAzureClientCertificatePath',
  CLIENT_CERTIFICATE_PASSWORD: 'cisAzureClientCertificatePassword',
  CLIENT_USERNAME: 'cisAzureClientUsername',
  CLIENT_PASSWORD: 'cisAzureClientPassword',
};
export const CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS = {
  ARM_TEMPLATE: 'cisAzureArmTemplate',
  MANUAL: 'cisAzureManual',
};

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getPageObjects } = providerContext;
  const pageObjects = getPageObjects(['cloudPostureDashboard', 'cisAddIntegration', 'header']);

  describe('Test adding Cloud Security Posture Integrations CSPM AZURE', function () {
    this.tags(['cloud_security_posture_cis_integration_cspm_azure']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let cisIntegrationAzure: typeof pageObjects.cisAddIntegration.cisAzure;

    beforeEach(async () => {
      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationAzure = pageObjects.cisAddIntegration.cisAzure;

      await cisIntegration.navigateToAddIntegrationCspmPage();
    });

    describe('Azure Organization ARM Template', () => {
      it('Azure Organization ARM Template Workflow', async () => {
        await cisIntegration.clickOptionButton(CIS_AZURE_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS.ARM_TEMPLATE);
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationAzure.getPostInstallArmTemplateModal()) !== undefined).to.be(
          true
        );
        expect(
          (await cisIntegration.getUrlOnPostInstallModal()) ===
            'https://azure.microsoft.com/en-us/get-started/azure-portal/resource-manager'
        );
      });
    });

    describe('Azure Organization Manual Managed Identity', () => {
      it('Azure Organization Manual Workflow', async () => {
        await cisIntegration.clickOptionButton(CIS_AZURE_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL);
        await cisIntegration.selectValue(AZURE_CREDENTIAL_SELECTOR, 'managed_identity');
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
      });
    });

    describe('Azure Organization Manual Service Principle with Client Secret', () => {
      it('Azure Organization Manual Service Principle with Client Secret Workflow', async () => {
        await cisIntegration.clickOptionButton(CIS_AZURE_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL);
        await cisIntegration.selectValue(
          AZURE_CREDENTIAL_SELECTOR,
          'service_principal_with_client_secret'
        );
        pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.fillInTextField(
          CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID,
          clientId
        );
        await cisIntegration.fillInTextField(
          CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID,
          tenantId
        );
        await cisIntegration.fillInTextField(
          CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET,
          clientSecret
        );
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        expect(
          (await cisIntegration.getValueInEditPage(
            CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID
          )) === clientId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(
            CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID
          )) === tenantId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(
            CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET
          )) === clientSecret
        ).to.be(true);
      });
    });

    describe('Azure Organization Manual Service Principle with Client Certificate', () => {
      it('Azure Organization Manual Service Principle with Client Certificate Workflow', async () => {
        await cisIntegration.clickOptionButton(CIS_AZURE_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL);
        await cisIntegration.selectValue(
          AZURE_CREDENTIAL_SELECTOR,
          'service_principal_with_client_certificate'
        );
        pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.fillInTextField(
          CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID,
          clientId
        );
        await cisIntegration.fillInTextField(
          CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID,
          tenantId
        );
        await cisIntegration.fillInTextField(
          CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_CERTIFICATE_PATH,
          clientCertificatePath
        );
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        expect(
          (await cisIntegration.getValueInEditPage(
            CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID
          )) === clientId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(
            CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID
          )) === tenantId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(
            CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_CERTIFICATE_PATH
          )) === clientCertificatePath
        ).to.be(true);
      });
    });

    describe('Azure Single ARM Template', () => {
      it('Azure Single ARM Template Workflow', async () => {
        await cisIntegration.clickOptionButton(CIS_AZURE_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(CIS_AZURE_SINGLE_SUB_TEST_ID);
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationAzure.getPostInstallArmTemplateModal()) !== undefined).to.be(
          true
        );
        expect(
          (await cisIntegration.getUrlOnPostInstallModal()) ===
            'https://azure.microsoft.com/en-us/get-started/azure-portal/resource-manager'
        );
      });
    });

    describe('Azure Single Manual Managed Identity', () => {
      it('Azure Single Manual Workflow', async () => {
        await cisIntegration.clickOptionButton(CIS_AZURE_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(CIS_AZURE_SINGLE_SUB_TEST_ID);
        await cisIntegration.clickOptionButton(CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL);
        await cisIntegration.selectValue(AZURE_CREDENTIAL_SELECTOR, 'managed_identity');
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
      });
    });

    describe('Azure Single Manual Service Principle with Client Secret', () => {
      it('Azure Single Manual Service Principle with Client Secret Workflow', async () => {
        await cisIntegration.clickOptionButton(CIS_AZURE_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL);
        await cisIntegration.selectValue(
          AZURE_CREDENTIAL_SELECTOR,
          'service_principal_with_client_secret'
        );
        pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.fillInTextField(
          CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID,
          clientId
        );
        await cisIntegration.fillInTextField(
          CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID,
          tenantId
        );
        await cisIntegration.fillInTextField(
          CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET,
          clientSecret
        );
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        expect(
          (await cisIntegration.getValueInEditPage(
            CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID
          )) === clientId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(
            CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID
          )) === tenantId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(
            CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET
          )) === clientSecret
        ).to.be(true);
      });
    });

    describe('Azure Single Manual Service Principle with Client Certificate', () => {
      it('Azure Single Manual Service Principle with Client Certificate Workflow', async () => {
        await cisIntegration.clickOptionButton(CIS_AZURE_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL);
        await cisIntegration.selectValue(
          AZURE_CREDENTIAL_SELECTOR,
          'service_principal_with_client_certificate'
        );
        pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.fillInTextField(
          CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID,
          clientId
        );
        await cisIntegration.fillInTextField(
          CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID,
          tenantId
        );
        await cisIntegration.fillInTextField(
          CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_CERTIFICATE_PATH,
          clientCertificatePath
        );
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        expect(
          (await cisIntegration.getValueInEditPage(
            CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID
          )) === clientId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(
            CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID
          )) === tenantId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(
            CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_CERTIFICATE_PATH
          )) === clientCertificatePath
        ).to.be(true);
      });
    });
  });
}
