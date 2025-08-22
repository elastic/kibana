/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  checkInputValue,
  getDataTestSubjectSelector,
  shouldBeChecked,
  shouldBeDisabled,
  shouldBeEnabled,
} from '../../helpers/common';
import { login } from '../../tasks/login';
import { visit } from '../../tasks/navigation';
import { ASSET_INVENTORY_INTEGRATION_URL } from '../../urls/navigation';
import {
  SAVE_BUTTON,
  SAVE_EDIT_BUTTON,
  changePolicyName,
  checkPolicyName,
  clickSaveEditButton,
  findPolicyLink,
  saveIntegration,
  selectPolicyForEditing,
  selectCloudProvider,
} from '../../tasks/asset_inventory/common';

const AZURE_ORGANIZATION_ACCOUNT_TEST_ID = '#organization-account';
const AZURE_SINGLE_ACCOUNT_TEST_ID = '#single-account';
const AZURE_MANUAL_SETUP_TEST_ID = '#manual';

const AZURE_ARM_TEMPLATE_TEST_ID = `${getDataTestSubjectSelector('caiAzureArmTemplate')} input`;
const AZURE_LAUNCH_CLOUD_FORMATION_LATER_TEST_ID = getDataTestSubjectSelector(
  'confirmAzureArmTemplateModalCancelButton'
);
const AZURE_CREDENTIALS_SELECTOR_TEST_ID = getDataTestSubjectSelector(
  'azure-credentials-type-selector'
);

const AZURE_CLIENT_ID_TEST_ID = '#azure\\.credentials\\.client_id';
const AZURE_CLIENT_ID = 'azure-client-id';
const AZURE_TENANT_ID_TEST_ID = '#azure\\.credentials\\.tenant_id';
const AZURE_TENANT_ID = 'azure-tenant-id';
const AZURE_SECRET_TEST_ID = getDataTestSubjectSelector('passwordInput-client-secret');
const AZURE_SECRET = 'azure-client-secret';
const AZURE_CLIENT_CERTIFICATE_PATH_TEST_ID = '#azure\\.credentials\\.client_certificate_path';
const AZURE_CLIENT_CERTIFICATE_PATH = 'azure-client-certificate-path';
const AZURE_CLIENT_CERTIFICATE_PASSWORD_TEST_ID = getDataTestSubjectSelector(
  'passwordInput-client-certificate-password'
);
const AZURE_CLIENT_CERTIFICATE_PASSWORD = 'azure-client-certificate-password';
const AZURE_CLIENT_SECRET_TEST_ID = getDataTestSubjectSelector('passwordInput-client-secret');
const AZURE_CLIENT_SECRET = 'azure-client-secret';

describe('Asset Inventory integration onboarding - Azure', { tags: ['@ess'] }, () => {
  beforeEach(() => {
    login();
    visit('/app/integrations/browse');
    cy.get('button[role="switch"]').click();
    visit(ASSET_INVENTORY_INTEGRATION_URL);
  });

  it('should save an organization account package policy with ARM template', () => {
    const policyName = changePolicyName('asset_inventory-azure-organization-arm-template');
    selectCloudProvider('azure');

    shouldBeChecked(AZURE_ORGANIZATION_ACCOUNT_TEST_ID);
    shouldBeChecked(AZURE_ARM_TEMPLATE_TEST_ID);
    shouldBeEnabled(SAVE_BUTTON);

    cy.get(SAVE_BUTTON).click();

    cy.get(AZURE_LAUNCH_CLOUD_FORMATION_LATER_TEST_ID).click();

    selectPolicyForEditing(policyName);

    checkPolicyName(policyName);
    shouldBeChecked(AZURE_ORGANIZATION_ACCOUNT_TEST_ID);
    shouldBeChecked(AZURE_ARM_TEMPLATE_TEST_ID);
    shouldBeDisabled(SAVE_EDIT_BUTTON);

    const newPolicyName = changePolicyName(policyName + '-edited');
    clickSaveEditButton();
    findPolicyLink(newPolicyName);
  });

  it('should save a single account package policy with ARM template', () => {
    const policyName = changePolicyName('asset_inventory-azure-single-arm-template');
    selectCloudProvider('azure');
    cy.get(AZURE_SINGLE_ACCOUNT_TEST_ID).click();
    shouldBeChecked(AZURE_SINGLE_ACCOUNT_TEST_ID);
    shouldBeChecked(AZURE_ARM_TEMPLATE_TEST_ID);
    shouldBeEnabled(SAVE_BUTTON);

    cy.get(SAVE_BUTTON).click();

    cy.get(AZURE_LAUNCH_CLOUD_FORMATION_LATER_TEST_ID).click();

    selectPolicyForEditing(policyName);

    checkPolicyName(policyName);
    shouldBeChecked(AZURE_SINGLE_ACCOUNT_TEST_ID);
    shouldBeChecked(AZURE_ARM_TEMPLATE_TEST_ID);
    shouldBeDisabled(SAVE_EDIT_BUTTON);

    const newPolicyName = changePolicyName(policyName + '-edited');
    clickSaveEditButton();
    findPolicyLink(newPolicyName);
  });

  it('should save an organization account package policy with managed identity', () => {
    const policyName = changePolicyName('asset_inventory-azure-organization-managed-identity');
    selectCloudProvider('azure');

    shouldBeChecked(AZURE_ORGANIZATION_ACCOUNT_TEST_ID);

    cy.get(AZURE_MANUAL_SETUP_TEST_ID).click();
    shouldBeChecked(AZURE_MANUAL_SETUP_TEST_ID);

    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).should('have.value', 'managed_identity');

    saveIntegration(policyName);

    selectPolicyForEditing(policyName);

    checkPolicyName(policyName);
    shouldBeChecked(AZURE_ORGANIZATION_ACCOUNT_TEST_ID);
    shouldBeChecked(AZURE_MANUAL_SETUP_TEST_ID);
    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).should('have.value', 'managed_identity');
    shouldBeDisabled(SAVE_EDIT_BUTTON);

    const newPolicyName = changePolicyName(policyName + '-edited');
    clickSaveEditButton();
    findPolicyLink(newPolicyName);
  });

  it('should save a single account package policy with managed identity', () => {
    const policyName = changePolicyName('asset_inventory-azure-single-managed-identity');
    selectCloudProvider('azure');
    cy.get(AZURE_SINGLE_ACCOUNT_TEST_ID).click();

    shouldBeChecked(AZURE_SINGLE_ACCOUNT_TEST_ID);

    cy.get(AZURE_MANUAL_SETUP_TEST_ID).click();
    shouldBeChecked(AZURE_MANUAL_SETUP_TEST_ID);

    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).should('have.value', 'managed_identity');

    saveIntegration(policyName);

    selectPolicyForEditing(policyName);

    checkPolicyName(policyName);
    shouldBeChecked(AZURE_SINGLE_ACCOUNT_TEST_ID);
    shouldBeChecked(AZURE_MANUAL_SETUP_TEST_ID);
    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).should('have.value', 'managed_identity');
    shouldBeDisabled(SAVE_EDIT_BUTTON);

    const newPolicyName = changePolicyName(policyName + '-edited');
    clickSaveEditButton();
    findPolicyLink(newPolicyName);
  });

  it('should save an organization package policy with client secret', () => {
    const policyName = changePolicyName('asset_inventory-azure-organization-client-secret');
    selectCloudProvider('azure');

    shouldBeChecked(AZURE_ORGANIZATION_ACCOUNT_TEST_ID);

    cy.get(AZURE_MANUAL_SETUP_TEST_ID).click();
    shouldBeChecked(AZURE_MANUAL_SETUP_TEST_ID);

    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).select('service_principal_with_client_secret');
    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).should(
      'have.value',
      'service_principal_with_client_secret'
    );
    shouldBeDisabled(SAVE_BUTTON);

    cy.get(AZURE_CLIENT_ID_TEST_ID).type(AZURE_CLIENT_ID);
    cy.get(AZURE_TENANT_ID_TEST_ID).type(AZURE_TENANT_ID);
    cy.get(AZURE_SECRET_TEST_ID).type(AZURE_SECRET);
    shouldBeEnabled(SAVE_BUTTON);

    saveIntegration(policyName);

    selectPolicyForEditing(policyName);

    checkPolicyName(policyName);
    shouldBeChecked(AZURE_ORGANIZATION_ACCOUNT_TEST_ID);
    shouldBeChecked(AZURE_MANUAL_SETUP_TEST_ID);
    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).should(
      'have.value',
      'service_principal_with_client_secret'
    );
    checkInputValue(AZURE_CLIENT_ID_TEST_ID, AZURE_CLIENT_ID);
    checkInputValue(AZURE_TENANT_ID_TEST_ID, AZURE_TENANT_ID);
    shouldBeDisabled(SAVE_EDIT_BUTTON);

    const newPolicyName = changePolicyName(policyName + '-edited');
    clickSaveEditButton();
    findPolicyLink(newPolicyName);
  });

  it('should save a single account package policy with client secret', () => {
    const policyName = changePolicyName('asset_inventory-azure-single-client-secret');
    selectCloudProvider('azure');
    cy.get(AZURE_SINGLE_ACCOUNT_TEST_ID).click();

    shouldBeChecked(AZURE_SINGLE_ACCOUNT_TEST_ID);

    cy.get(AZURE_MANUAL_SETUP_TEST_ID).click();
    shouldBeChecked(AZURE_MANUAL_SETUP_TEST_ID);

    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).select('service_principal_with_client_secret');
    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).should(
      'have.value',
      'service_principal_with_client_secret'
    );
    shouldBeDisabled(SAVE_BUTTON);

    cy.get(AZURE_CLIENT_ID_TEST_ID).type(AZURE_CLIENT_ID);
    cy.get(AZURE_TENANT_ID_TEST_ID).type(AZURE_TENANT_ID);
    cy.get(AZURE_SECRET_TEST_ID).type(AZURE_SECRET);
    shouldBeEnabled(SAVE_BUTTON);

    saveIntegration(policyName);

    selectPolicyForEditing(policyName);

    checkPolicyName(policyName);
    shouldBeChecked(AZURE_SINGLE_ACCOUNT_TEST_ID);
    shouldBeChecked(AZURE_MANUAL_SETUP_TEST_ID);
    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).should(
      'have.value',
      'service_principal_with_client_secret'
    );
    checkInputValue(AZURE_CLIENT_ID_TEST_ID, AZURE_CLIENT_ID);
    checkInputValue(AZURE_TENANT_ID_TEST_ID, AZURE_TENANT_ID);

    shouldBeDisabled(SAVE_EDIT_BUTTON);

    const newPolicyName = changePolicyName(policyName + '-edited');
    clickSaveEditButton();
    findPolicyLink(newPolicyName);
  });

  it('should save an organization package policy with client certificate', () => {
    const policyName = changePolicyName('asset_inventory-azure-organization-client-certificate');
    selectCloudProvider('azure');

    shouldBeChecked(AZURE_ORGANIZATION_ACCOUNT_TEST_ID);

    cy.get(AZURE_MANUAL_SETUP_TEST_ID).click();
    shouldBeChecked(AZURE_MANUAL_SETUP_TEST_ID);

    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).select('service_principal_with_client_certificate');
    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).should(
      'have.value',
      'service_principal_with_client_certificate'
    );
    shouldBeDisabled(SAVE_BUTTON);

    cy.get(AZURE_CLIENT_ID_TEST_ID).type(AZURE_CLIENT_ID);
    cy.get(AZURE_TENANT_ID_TEST_ID).type(AZURE_TENANT_ID);
    cy.get(AZURE_CLIENT_CERTIFICATE_PATH_TEST_ID).type(AZURE_CLIENT_CERTIFICATE_PATH);
    cy.get(AZURE_CLIENT_CERTIFICATE_PASSWORD_TEST_ID).type(AZURE_CLIENT_CERTIFICATE_PASSWORD);
    shouldBeEnabled(SAVE_BUTTON);

    saveIntegration(policyName);

    selectPolicyForEditing(policyName);

    checkPolicyName(policyName);
    shouldBeChecked(AZURE_ORGANIZATION_ACCOUNT_TEST_ID);
    shouldBeChecked(AZURE_MANUAL_SETUP_TEST_ID);
    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).should(
      'have.value',
      'service_principal_with_client_certificate'
    );
    checkInputValue(AZURE_CLIENT_ID_TEST_ID, AZURE_CLIENT_ID);
    checkInputValue(AZURE_TENANT_ID_TEST_ID, AZURE_TENANT_ID);
    checkInputValue(AZURE_CLIENT_CERTIFICATE_PATH_TEST_ID, AZURE_CLIENT_CERTIFICATE_PATH);
    shouldBeDisabled(SAVE_EDIT_BUTTON);

    const newPolicyName = changePolicyName(policyName + '-edited');
    clickSaveEditButton();
    findPolicyLink(newPolicyName);
  });

  it('should save a single account package policy with client certificate', () => {
    const policyName = changePolicyName('asset_inventory-azure-single-client-certificate');
    selectCloudProvider('azure');
    cy.get(AZURE_SINGLE_ACCOUNT_TEST_ID).click();

    shouldBeChecked(AZURE_SINGLE_ACCOUNT_TEST_ID);
    cy.get(AZURE_MANUAL_SETUP_TEST_ID).click();
    shouldBeChecked(AZURE_MANUAL_SETUP_TEST_ID);
    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).select('service_principal_with_client_certificate');
    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).should(
      'have.value',
      'service_principal_with_client_certificate'
    );
    shouldBeDisabled(SAVE_BUTTON);
    cy.get(AZURE_CLIENT_ID_TEST_ID).type(AZURE_CLIENT_ID);
    cy.get(AZURE_TENANT_ID_TEST_ID).type(AZURE_TENANT_ID);
    cy.get(AZURE_CLIENT_CERTIFICATE_PATH_TEST_ID).type(AZURE_CLIENT_CERTIFICATE_PATH);
    cy.get(AZURE_CLIENT_CERTIFICATE_PASSWORD_TEST_ID).type(AZURE_CLIENT_CERTIFICATE_PASSWORD);
    shouldBeEnabled(SAVE_BUTTON);
    saveIntegration(policyName);

    selectPolicyForEditing(policyName);
    checkPolicyName(policyName);
    shouldBeChecked(AZURE_SINGLE_ACCOUNT_TEST_ID);
    shouldBeChecked(AZURE_MANUAL_SETUP_TEST_ID);
    cy.get(AZURE_CREDENTIALS_SELECTOR_TEST_ID).should(
      'have.value',
      'service_principal_with_client_certificate'
    );
    checkInputValue(AZURE_CLIENT_ID_TEST_ID, AZURE_CLIENT_ID);
    checkInputValue(AZURE_TENANT_ID_TEST_ID, AZURE_TENANT_ID);
    checkInputValue(AZURE_CLIENT_CERTIFICATE_PATH_TEST_ID, AZURE_CLIENT_CERTIFICATE_PATH);
    shouldBeDisabled(SAVE_EDIT_BUTTON);
    const newPolicyName = changePolicyName(policyName + '-edited');
    clickSaveEditButton();
    findPolicyLink(newPolicyName);
  });
});

describe(
  'Asset Inventory Agentless integration onboarding - Azure',
  { tags: ['@serverless'] },
  () => {
    beforeEach(() => {
      login();
      visit('/app/integrations/browse');
      cy.get('button[role="switch"]').click();
      visit(ASSET_INVENTORY_INTEGRATION_URL);
    });

    it('should save an organization package policy', () => {
      changePolicyName('asset_inventory-azure-agentless');
      selectCloudProvider('azure');

      shouldBeChecked(AZURE_ORGANIZATION_ACCOUNT_TEST_ID);
      shouldBeDisabled(SAVE_BUTTON);

      cy.get(AZURE_CLIENT_ID_TEST_ID).type(AZURE_CLIENT_ID);
      cy.get(AZURE_TENANT_ID_TEST_ID).type(AZURE_TENANT_ID);
      shouldBeDisabled(SAVE_BUTTON);

      cy.get(AZURE_CLIENT_SECRET_TEST_ID).type(AZURE_CLIENT_SECRET);
      shouldBeEnabled(SAVE_BUTTON);
      cy.get(SAVE_BUTTON).click();
    });

    it('should save a single account package policy', () => {
      changePolicyName('asset_inventory-azure-agentless-single-account');
      selectCloudProvider('azure');
      cy.get(AZURE_SINGLE_ACCOUNT_TEST_ID).click();

      shouldBeChecked(AZURE_SINGLE_ACCOUNT_TEST_ID);
      shouldBeDisabled(SAVE_BUTTON);

      cy.get(AZURE_CLIENT_ID_TEST_ID).type(AZURE_CLIENT_ID);
      cy.get(AZURE_TENANT_ID_TEST_ID).type(AZURE_TENANT_ID);
      shouldBeDisabled(SAVE_BUTTON);

      cy.get(AZURE_CLIENT_SECRET_TEST_ID).type(AZURE_CLIENT_SECRET);
      shouldBeEnabled(SAVE_BUTTON);
      cy.get(SAVE_BUTTON).click();
    });
  }
);
