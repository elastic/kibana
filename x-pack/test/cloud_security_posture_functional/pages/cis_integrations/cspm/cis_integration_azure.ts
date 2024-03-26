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
const AZURE_MANUAL_TEST_ID = 'azureManualOptionTestId';
const AZURE_CREDENTIAL_SELECTOR = 'azure-credentials-type-selector';
const AZURE_CLIENT_ID_TEST_ID = 'azureCredentialsClientIdTestId';
const AZURE_TENANT_ID_TEST_ID = 'azureCredentialsTenantIdTestId';
const AZURE_CLIENT_SECRET_TEST_ID = 'azureCredentialsClientSecretTestId';
const AZURE_CLIENT_ID_CERTIFICATE_OPTION_TEST_ID =
  'azureCredentialsClientIdClientCertificateTestOptionId';
const AZURE_TENANT_ID_CERTIFICATE_OPTION_TEST_ID =
  'azureCredentialsTenantIdClientCertificateOptionTestId';
const AZURE_CLIENT_CERTIFICATE_PATH_TEST_ID = 'azureCredentialsClientCertificatePathTestId';

const clientId = 'clientIdTest';
const tenantId = 'tenantIdTest';
const clientCertificatePath = 'clientCertificatePathTest';
const clientSecret = 'clientSecretTest';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getPageObjects, getService } = providerContext;
  const pageObjects = getPageObjects(['cloudPostureDashboard', 'cisAddIntegration', 'header']);
  const kibanaServer = getService('kibanaServer');

  describe('Test adding Cloud Security Posture Integrations CSPM AZURE', function () {
    this.tags(['cloud_security_posture_cis_integration_cspm_azure']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let cisIntegrationAzure: typeof pageObjects.cisAddIntegration.cisAzure;

    beforeEach(async () => {
      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationAzure = pageObjects.cisAddIntegration.cisAzure;

      await cisIntegration.navigateToAddIntegrationCspmPage();
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('Azure Organization ARM Template', () => {
      it('Azure Organization ARM Template Workflow', async () => {
        await cisIntegration.clickOptionButton(CIS_AZURE_OPTION_TEST_ID);
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
        await cisIntegration.clickOptionButton(AZURE_MANUAL_TEST_ID);
        await cisIntegration.selectValue(AZURE_CREDENTIAL_SELECTOR, 'managed_identity');
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
      });
    });

    describe('Azure Organization Manual Service Principle with Client Secret', () => {
      it('Azure Organization Manual Service Principle with Client Secret Workflow', async () => {
        await cisIntegration.clickOptionButton(CIS_AZURE_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AZURE_MANUAL_TEST_ID);
        await cisIntegration.selectValue(
          AZURE_CREDENTIAL_SELECTOR,
          'service_principal_with_client_secret'
        );
        pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.fillInTextField(AZURE_CLIENT_ID_TEST_ID, clientId);
        await cisIntegration.fillInTextField(AZURE_TENANT_ID_TEST_ID, tenantId);
        await cisIntegration.fillInTextField(AZURE_CLIENT_SECRET_TEST_ID, clientSecret);
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        expect(
          (await cisIntegration.getValueInEditPage(AZURE_CLIENT_ID_TEST_ID)) === clientId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(AZURE_TENANT_ID_TEST_ID)) === tenantId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(AZURE_CLIENT_SECRET_TEST_ID)) === clientSecret
        ).to.be(true);
      });
    });

    describe('Azure Organization Manual Service Principle with Client Certificate', () => {
      it('Azure Organization Manual Service Principle with Client Certificate Workflow', async () => {
        await cisIntegration.clickOptionButton(CIS_AZURE_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AZURE_MANUAL_TEST_ID);
        await cisIntegration.selectValue(
          AZURE_CREDENTIAL_SELECTOR,
          'service_principal_with_client_certificate'
        );
        pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.fillInTextField(AZURE_CLIENT_ID_CERTIFICATE_OPTION_TEST_ID, clientId);
        await cisIntegration.fillInTextField(AZURE_TENANT_ID_CERTIFICATE_OPTION_TEST_ID, tenantId);
        await cisIntegration.fillInTextField(
          AZURE_CLIENT_CERTIFICATE_PATH_TEST_ID,
          clientCertificatePath
        );
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        expect(
          (await cisIntegration.getValueInEditPage(AZURE_CLIENT_ID_CERTIFICATE_OPTION_TEST_ID)) ===
            clientId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(AZURE_TENANT_ID_CERTIFICATE_OPTION_TEST_ID)) ===
            tenantId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(AZURE_CLIENT_CERTIFICATE_PATH_TEST_ID)) ===
            clientCertificatePath
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
        await cisIntegration.clickOptionButton(AZURE_MANUAL_TEST_ID);
        await cisIntegration.selectValue(AZURE_CREDENTIAL_SELECTOR, 'managed_identity');
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
      });
    });

    describe('Azure Single Manual Service Principle with Client Secret', () => {
      it('Azure Single Manual Service Principle with Client Secret Workflow', async () => {
        await cisIntegration.clickOptionButton(CIS_AZURE_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AZURE_MANUAL_TEST_ID);
        await cisIntegration.selectValue(
          AZURE_CREDENTIAL_SELECTOR,
          'service_principal_with_client_secret'
        );
        pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.fillInTextField(AZURE_CLIENT_ID_TEST_ID, clientId);
        await cisIntegration.fillInTextField(AZURE_TENANT_ID_TEST_ID, tenantId);
        await cisIntegration.fillInTextField(AZURE_CLIENT_SECRET_TEST_ID, clientSecret);
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        expect(
          (await cisIntegration.getValueInEditPage(AZURE_CLIENT_ID_TEST_ID)) === clientId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(AZURE_TENANT_ID_TEST_ID)) === tenantId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(AZURE_CLIENT_SECRET_TEST_ID)) === clientSecret
        ).to.be(true);
      });
    });

    describe('Azure Single Manual Service Principle with Client Certificate', () => {
      it('Azure Single Manual Service Principle with Client Certificate Workflow', async () => {
        await cisIntegration.clickOptionButton(CIS_AZURE_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AZURE_MANUAL_TEST_ID);
        await cisIntegration.selectValue(
          AZURE_CREDENTIAL_SELECTOR,
          'service_principal_with_client_certificate'
        );
        pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegration.fillInTextField(AZURE_CLIENT_ID_CERTIFICATE_OPTION_TEST_ID, clientId);
        await cisIntegration.fillInTextField(AZURE_TENANT_ID_CERTIFICATE_OPTION_TEST_ID, tenantId);
        await cisIntegration.fillInTextField(
          AZURE_CLIENT_CERTIFICATE_PATH_TEST_ID,
          clientCertificatePath
        );
        await cisIntegration.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegration.getPostInstallModal()) !== undefined).to.be(true);
        await cisIntegration.navigateToIntegrationCspList();
        await cisIntegration.clickFirstElementOnIntegrationTable();
        expect(
          (await cisIntegration.getValueInEditPage(AZURE_CLIENT_ID_CERTIFICATE_OPTION_TEST_ID)) ===
            clientId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(AZURE_TENANT_ID_CERTIFICATE_OPTION_TEST_ID)) ===
            tenantId
        ).to.be(true);
        expect(
          (await cisIntegration.getValueInEditPage(AZURE_CLIENT_CERTIFICATE_PATH_TEST_ID)) ===
            clientCertificatePath
        ).to.be(true);
      });
    });
  });
}
