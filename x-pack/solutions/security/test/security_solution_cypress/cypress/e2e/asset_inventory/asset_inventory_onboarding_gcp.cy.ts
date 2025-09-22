/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectAccountType } from '../../tasks/asset_inventory/onboarding_gcp';
import {
  GCP_PROVIDER_TEST_ID,
  SAVE_BUTTON,
  SAVE_EDIT_BUTTON,
} from '../../screens/asset_inventory/common';
import {
  checkInputValue,
  shouldBeChecked,
  shouldBeDisabled,
  shouldBeEnabled,
  shouldBeSelected,
} from '../../helpers/common';
import { login } from '../../tasks/login';
import { visit } from '../../tasks/navigation';
import { ASSET_INVENTORY_INTEGRATION_URL } from '../../urls/navigation';
import {
  changePolicyName,
  checkPolicyName,
  clickSaveEditButton,
  findPolicyLink,
  saveIntegration,
  selectCloudProvider,
  selectPolicyForEditing,
} from '../../tasks/asset_inventory/common';
import {
  GCP_CLOUDSHELL_CANCEL_BUTTON_TEST_ID,
  GCP_CLOUDSHELL_TEST_ID,
  GCP_CREDENTIALS_FILE_TEST_ID,
  GCP_CREDENTIALS_JSON_TEST_ID,
  GCP_CREDENTIALS_SELECTOR_TEST_ID,
  GCP_CREDENTIALS_TYPE_FILE_TEST_ID,
  GCP_CREDENTIALS_TYPE_JSON_TEST_ID,
  GCP_LAUNCH_GOOGLE_CLOUD_SHELL_TEST_ID,
  GCP_MANUAL_SETUP_TEST_ID,
  GCP_ORGANIZATION_ACCOUNT_TEST_ID,
  GCP_ORGANIZATION_ID_TEST_ID,
  GCP_PROJECT_ID_TEST_ID,
  GCP_SINGLE_ACCOUNT_TEST_ID,
} from '../../screens/asset_inventory/onboarding_gcp';

const GCP_ORGANIZATION_ID = 'org-123456789012';
const GCP_PROJECT_ID = 'project-123456789012';
const GCP_CREDENTIALS_FILE = 'gcp_credentials.json';
const GCP_CREDENTIALS_JSON =
  '{ "type": "service_account", "project_id": "project-123456789012", "private_key_id": "key-id", "private_key": "-----BEGIN PRIVATE KEY-----\\FakEpRIVateKey...\\n-----END PRIVATE KEY-----\\n", "client_email": "test@example.com" }';

describe('Asset Inventory integration onboarding - GCP', { tags: ['@ess'] }, () => {
  beforeEach(() => {
    login();
    visit('/app/integrations/browse');
    cy.get('button[role="switch"]').click();
    visit(ASSET_INVENTORY_INTEGRATION_URL);
  });

  it('should save a package policy with GCP Cloud Shell', () => {
    const policyName = changePolicyName('asset_inventory-gcp-cloudshell');
    selectCloudProvider('gcp');
    shouldBeChecked(GCP_PROVIDER_TEST_ID);
    shouldBeChecked(GCP_CLOUDSHELL_TEST_ID);
    shouldBeEnabled(SAVE_BUTTON);

    selectAccountType('single');

    shouldBeChecked(GCP_SINGLE_ACCOUNT_TEST_ID);
    shouldBeEnabled(SAVE_BUTTON);

    cy.get(GCP_ORGANIZATION_ID_TEST_ID).should('not.exist');
    cy.get(GCP_PROJECT_ID_TEST_ID).should('be.visible');

    selectAccountType('organization');
    cy.get(GCP_ORGANIZATION_ID_TEST_ID).should('be.visible');
    cy.get(GCP_PROJECT_ID_TEST_ID).should('be.visible');

    cy.get(GCP_ORGANIZATION_ID_TEST_ID).type(GCP_ORGANIZATION_ID);
    cy.get(GCP_PROJECT_ID_TEST_ID).type(GCP_PROJECT_ID);

    cy.get(SAVE_BUTTON).click();
    cy.get(GCP_CLOUDSHELL_CANCEL_BUTTON_TEST_ID).click();

    selectPolicyForEditing(policyName);
    checkPolicyName(policyName);
    shouldBeChecked(GCP_ORGANIZATION_ACCOUNT_TEST_ID);
    shouldBeChecked(GCP_CLOUDSHELL_TEST_ID);
    shouldBeDisabled(SAVE_EDIT_BUTTON);

    const newPolicyName = changePolicyName('asset_inventory-gcp-cloudshell-edited');
    shouldBeDisabled(GCP_ORGANIZATION_ID_TEST_ID);
    shouldBeDisabled(GCP_PROJECT_ID_TEST_ID);

    shouldBeEnabled(SAVE_EDIT_BUTTON);

    clickSaveEditButton();
    findPolicyLink(newPolicyName);

    selectPolicyForEditing(newPolicyName);
    checkPolicyName(newPolicyName);
    checkInputValue(GCP_ORGANIZATION_ID_TEST_ID, `${GCP_ORGANIZATION_ID}`);
    checkInputValue(GCP_PROJECT_ID_TEST_ID, `${GCP_PROJECT_ID}`);
    shouldBeDisabled(SAVE_EDIT_BUTTON);
  });

  it('should save a package policy with credentials file', () => {
    selectCloudProvider('gcp');
    const policyName = changePolicyName('asset_inventory-gcp-credentials-file');

    selectAccountType('single');
    cy.get(GCP_MANUAL_SETUP_TEST_ID).click();
    shouldBeDisabled(SAVE_BUTTON);
    shouldBeSelected(GCP_CREDENTIALS_TYPE_FILE_TEST_ID);

    cy.get(GCP_PROJECT_ID_TEST_ID).type(GCP_PROJECT_ID);
    shouldBeDisabled(SAVE_BUTTON);

    cy.get(GCP_CREDENTIALS_FILE_TEST_ID).type(GCP_CREDENTIALS_FILE);
    shouldBeEnabled(SAVE_BUTTON);
    saveIntegration(policyName);
    selectPolicyForEditing(policyName);
    checkPolicyName(policyName);

    shouldBeChecked(GCP_SINGLE_ACCOUNT_TEST_ID);
    shouldBeChecked(GCP_MANUAL_SETUP_TEST_ID);

    checkInputValue(GCP_PROJECT_ID_TEST_ID, GCP_PROJECT_ID);
    shouldBeDisabled(GCP_PROJECT_ID_TEST_ID);
    checkInputValue(GCP_CREDENTIALS_FILE_TEST_ID, GCP_CREDENTIALS_FILE);
    shouldBeDisabled(SAVE_EDIT_BUTTON);

    cy.get(GCP_CREDENTIALS_FILE_TEST_ID).type('-edited');
    shouldBeEnabled(SAVE_EDIT_BUTTON);
    clickSaveEditButton();

    selectPolicyForEditing(policyName);
    checkInputValue(GCP_CREDENTIALS_FILE_TEST_ID, `${GCP_CREDENTIALS_FILE}-edited`);
    shouldBeDisabled(SAVE_EDIT_BUTTON);
  });

  it('should save a package policy with credentials JSON', () => {
    selectCloudProvider('gcp');
    const policyName = changePolicyName('asset_inventory-gcp-credentials-json');
    selectAccountType('single');
    cy.get(GCP_MANUAL_SETUP_TEST_ID).click();
    shouldBeDisabled(SAVE_BUTTON);

    cy.get(GCP_PROJECT_ID_TEST_ID).type(GCP_PROJECT_ID);
    shouldBeDisabled(SAVE_BUTTON);

    cy.get(GCP_CREDENTIALS_SELECTOR_TEST_ID).select('credentials-json');
    shouldBeSelected(GCP_CREDENTIALS_TYPE_JSON_TEST_ID);

    cy.get(GCP_CREDENTIALS_JSON_TEST_ID).type(GCP_CREDENTIALS_JSON, {
      parseSpecialCharSequences: false,
    });
    shouldBeEnabled(SAVE_BUTTON);
    saveIntegration(policyName);

    selectPolicyForEditing(policyName);
    checkPolicyName(policyName);
    shouldBeChecked(GCP_SINGLE_ACCOUNT_TEST_ID);

    shouldBeChecked(GCP_MANUAL_SETUP_TEST_ID);

    checkInputValue(GCP_PROJECT_ID_TEST_ID, GCP_PROJECT_ID);
    shouldBeDisabled(GCP_PROJECT_ID_TEST_ID);

    shouldBeDisabled(SAVE_EDIT_BUTTON);
  });
});

describe(
  'Asset Inventory Agentless integration onboarding - GCP ',
  { tags: ['@serverless'] },
  () => {
    beforeEach(() => {
      login();
      visit('/app/integrations/browse');
      cy.get('button[role="switch"]').click();
      visit(ASSET_INVENTORY_INTEGRATION_URL);
    });

    it('should save an agentless package policy with organization account type', () => {
      changePolicyName('asset_inventory-gcp-agentless-organization');
      selectCloudProvider('gcp');
      shouldBeChecked(GCP_PROVIDER_TEST_ID);
      cy.get(GCP_LAUNCH_GOOGLE_CLOUD_SHELL_TEST_ID).should('be.visible');
      shouldBeDisabled(SAVE_BUTTON);

      selectAccountType('organization');
      cy.get(GCP_ORGANIZATION_ID_TEST_ID).should('be.visible');
      cy.get(GCP_PROJECT_ID_TEST_ID).should('not.exist');

      cy.get(GCP_ORGANIZATION_ID_TEST_ID).type(GCP_ORGANIZATION_ID);
      cy.get(GCP_CREDENTIALS_JSON_TEST_ID).type(GCP_CREDENTIALS_JSON, {
        parseSpecialCharSequences: false,
      });

      cy.get(SAVE_BUTTON).click();
    });

    it('should save an agentless package policy with single account type', () => {
      changePolicyName('asset_inventory-gcp-agentless-single');
      selectCloudProvider('gcp');
      shouldBeChecked(GCP_PROVIDER_TEST_ID);
      cy.get(GCP_LAUNCH_GOOGLE_CLOUD_SHELL_TEST_ID).should('be.visible');
      shouldBeDisabled(SAVE_BUTTON);

      selectAccountType('single');

      shouldBeChecked(GCP_SINGLE_ACCOUNT_TEST_ID);
      shouldBeDisabled(SAVE_BUTTON);

      cy.get(GCP_ORGANIZATION_ID_TEST_ID).should('not.exist');
      cy.get(GCP_PROJECT_ID_TEST_ID).should('be.visible');

      cy.get(GCP_PROJECT_ID_TEST_ID).type(GCP_PROJECT_ID);
      cy.get(GCP_CREDENTIALS_JSON_TEST_ID).type(GCP_CREDENTIALS_JSON, {
        parseSpecialCharSequences: false,
      });

      cy.get(SAVE_BUTTON).click();
    });
  }
);
