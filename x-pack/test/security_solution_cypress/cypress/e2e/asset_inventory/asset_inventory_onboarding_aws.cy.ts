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
} from './constants';

const ROLE_ARN = getDataTestSubjectSelector('awsRoleArnInput');
const ACCESS_KEY = getDataTestSubjectSelector('awsDirectAccessKeyId');
const SECRET_KEY = getDataTestSubjectSelector('passwordInput-secret-access-key');

const TEMPORARY_KEY_ACCESS_KEY = getDataTestSubjectSelector('awsTemporaryKeysAccessKeyId');
const TEMPORARY_KEY_SECRET_KEY = getDataTestSubjectSelector('passwordInput-secret-access-key');
const TEMPORARY_KEY_SESSION = getDataTestSubjectSelector('awsTemporaryKeysSessionToken');

const SHARED_CREDENTIAL_FILE = getDataTestSubjectSelector('awsSharedCredentialFile');
const SHARED_CREDENTIAL_PROFILE = getDataTestSubjectSelector('awsCredentialProfileName');

const AWS_SINGLE_ACCOUNT_TEST_ID = `${getDataTestSubjectSelector('awsSingleTestId')} input`;
const AWS_ORGANIZATION_ACCOUNT_TEST_ID = `${getDataTestSubjectSelector(
  'awsOrganizationTestId'
)} input`;
const AWS_CLOUD_FORMATION_TEST_ID = `${getDataTestSubjectSelector(
  'aws-cloudformation-setup-option'
)} input`;
const AWS_MANUAL_SETUP_TEST_ID = `${getDataTestSubjectSelector('aws-manual-setup-option')} input`;
const AWS_CREDENTIALS_SELECTOR_TEST_ID = getDataTestSubjectSelector(
  'aws-credentials-type-selector'
);

const LAUNCH_CLOUD_FORMATION_LATER_TEST_ID = getDataTestSubjectSelector(
  'confirmCloudFormationModalCancelButton'
);

describe('Asset Inventory integration onboarding - AWS', { tags: ['@serverless'] }, () => {
  beforeEach(() => {
    login();
    visit('/app/integrations/browse');
    // cy.contains('button', 'Display beta integrations').click();
    cy.get('button[role="switch"]').click();
    visit(ASSET_INVENTORY_INTEGRATION_URL);
  });

  it('should save a package policy with AWS Cloud Formation', () => {
    const policyName = changePolicyName('asset_inventory-cloudformation');

    shouldBeChecked(AWS_ORGANIZATION_ACCOUNT_TEST_ID);
    // cy.get(AWS_ORGANIZATION_ACCOUNT).should('be.checked');
    shouldBeChecked(AWS_CLOUD_FORMATION_TEST_ID);
    shouldBeEnabled(SAVE_BUTTON);

    cy.get(AWS_SINGLE_ACCOUNT_TEST_ID).click();
    shouldBeChecked(AWS_CLOUD_FORMATION_TEST_ID);
    shouldBeEnabled(SAVE_BUTTON);

    cy.get(SAVE_BUTTON).click();

    cy.get(LAUNCH_CLOUD_FORMATION_LATER_TEST_ID).click();

    selectPolicyForEditing(policyName);

    checkPolicyName(policyName);
    shouldBeChecked(AWS_SINGLE_ACCOUNT_TEST_ID);
    shouldBeChecked(AWS_CLOUD_FORMATION_TEST_ID);
    shouldBeDisabled(SAVE_EDIT_BUTTON);

    const newPolicyName = changePolicyName('edited-asset_inventory-cloudformation');
    clickSaveEditButton();
    findPolicyLink(newPolicyName);
  });

  it('should save a package policy with role ARNs', () => {
    const policyName = changePolicyName('asset_inventory-role-arns');
    const arns = 'arn:aws:iam::123456789012:role/test-role';

    cy.get(AWS_SINGLE_ACCOUNT_TEST_ID).click();
    cy.get(AWS_MANUAL_SETUP_TEST_ID).click();
    shouldBeDisabled(SAVE_BUTTON);

    cy.get(ROLE_ARN).type(arns);
    shouldBeEnabled(SAVE_BUTTON);

    saveIntegration(policyName);
    selectPolicyForEditing(policyName);

    checkPolicyName(policyName);
    shouldBeChecked(AWS_SINGLE_ACCOUNT_TEST_ID);
    shouldBeChecked(AWS_MANUAL_SETUP_TEST_ID);
    checkInputValue(ROLE_ARN, arns);
    shouldBeDisabled(SAVE_EDIT_BUTTON);

    cy.get(ROLE_ARN).type('-edited');
    clickSaveEditButton();

    selectPolicyForEditing(policyName);
    checkInputValue(ROLE_ARN, `${arns}-edited`);
  });

  it('should save a package policy with permanent keys', () => {
    const policyName = changePolicyName('asset_inventory-permanent-keys');
    const testAccessKey = 'test-access-key';
    const testSecretKey = 'test-secret-key';

    cy.get(AWS_SINGLE_ACCOUNT_TEST_ID).click();
    cy.get(AWS_MANUAL_SETUP_TEST_ID).click();
    shouldBeDisabled(SAVE_BUTTON);

    cy.get(AWS_CREDENTIALS_SELECTOR_TEST_ID).select('direct_access_keys');

    cy.get(ACCESS_KEY).type(testAccessKey);
    shouldBeDisabled(SAVE_BUTTON);

    cy.get(SECRET_KEY).type(testSecretKey);
    shouldBeEnabled(SAVE_BUTTON);

    saveIntegration(policyName);
    selectPolicyForEditing(policyName);

    checkPolicyName(policyName);
    shouldBeChecked(AWS_SINGLE_ACCOUNT_TEST_ID);
    shouldBeChecked(AWS_MANUAL_SETUP_TEST_ID);
    checkInputValue(ACCESS_KEY, testAccessKey);
    // checkInputValue(SECRET_KEY, testSecretKey);
    shouldBeDisabled(SAVE_EDIT_BUTTON);

    cy.get(ACCESS_KEY).type('-edited');
    // cy.get(SECRET_KEY).type('-edited');
    clickSaveEditButton();

    selectPolicyForEditing(policyName);
    checkInputValue(ACCESS_KEY, `${testAccessKey}-edited`);
    // checkInputValue(SECRET_KEY, `${testSecretKey}-edited`);
  });

  it('should save a package policy with temporary keys', () => {
    const policyName = changePolicyName('asset_inventory-temporary-keys');
    const testAccessKey = 'test-temporary-access-key';
    const testSecretKey = 'test-temporary-secret-key';
    const testSession = 'test-temporary-key-session';

    cy.get(AWS_SINGLE_ACCOUNT_TEST_ID).click();
    cy.get(AWS_MANUAL_SETUP_TEST_ID).click();
    shouldBeDisabled(SAVE_BUTTON);

    cy.get(AWS_CREDENTIALS_SELECTOR_TEST_ID).select('temporary_keys');

    cy.get(TEMPORARY_KEY_ACCESS_KEY).type(testAccessKey);
    shouldBeDisabled(SAVE_BUTTON);

    cy.get(TEMPORARY_KEY_SECRET_KEY).type(testSecretKey);
    shouldBeDisabled(SAVE_BUTTON);

    cy.get(TEMPORARY_KEY_SESSION).type(testSession);
    shouldBeEnabled(SAVE_BUTTON);

    saveIntegration(policyName);

    selectPolicyForEditing(policyName);

    checkPolicyName(policyName);
    shouldBeChecked(AWS_SINGLE_ACCOUNT_TEST_ID);
    shouldBeChecked(AWS_MANUAL_SETUP_TEST_ID);
    checkInputValue(TEMPORARY_KEY_ACCESS_KEY, testAccessKey);
    // checkInputValue(TEMPORARY_KEY_SECRET_KEY, testSecretKey);
    checkInputValue(TEMPORARY_KEY_SESSION, testSession);
    shouldBeDisabled(SAVE_EDIT_BUTTON);

    cy.get(TEMPORARY_KEY_ACCESS_KEY).type('-edited');
    cy.get(TEMPORARY_KEY_SESSION).type('-edited');
    // cy.get(TEMPORARY_KEY_SECRET_KEY).type('-edited');
    clickSaveEditButton();

    selectPolicyForEditing(policyName);
    checkInputValue(TEMPORARY_KEY_ACCESS_KEY, `${testAccessKey}-edited`);
    checkInputValue(TEMPORARY_KEY_SESSION, `${testSession}-edited`);
    // checkInputValue(TEMPORARY_KEY_SECRET_KEY, `${testSecretKey}-edited`);
  });

  it('should save a package policy with shared credentials', () => {
    const policyName = changePolicyName('asset_inventory-shared-credentials');
    const testSharedCredentialsFile = 'test-shared-credentials-file';
    const testSharedCredentialsProfile = 'test-shared-credentials-profile';

    cy.get(AWS_SINGLE_ACCOUNT_TEST_ID).click();
    cy.get(AWS_MANUAL_SETUP_TEST_ID).click();
    shouldBeDisabled(SAVE_BUTTON);

    cy.get(AWS_CREDENTIALS_SELECTOR_TEST_ID).select('shared_credentials');

    cy.get(SHARED_CREDENTIAL_FILE).type(testSharedCredentialsFile);
    shouldBeDisabled(SAVE_BUTTON);

    cy.get(SHARED_CREDENTIAL_PROFILE).type(testSharedCredentialsProfile);
    shouldBeEnabled(SAVE_BUTTON);

    saveIntegration(policyName);
    selectPolicyForEditing(policyName);

    checkPolicyName(policyName);
    shouldBeChecked(AWS_SINGLE_ACCOUNT_TEST_ID);
    shouldBeChecked(AWS_MANUAL_SETUP_TEST_ID);
    checkInputValue(SHARED_CREDENTIAL_FILE, testSharedCredentialsFile);
    // checkInputValue(TEMPORARY_KEY_SECRET_KEY, testSecretKey);
    checkInputValue(SHARED_CREDENTIAL_PROFILE, testSharedCredentialsProfile);
    shouldBeDisabled(SAVE_EDIT_BUTTON);

    cy.get(SHARED_CREDENTIAL_FILE).type('-edited');
    cy.get(SHARED_CREDENTIAL_PROFILE).type('-edited');
    // cy.get(TEMPORARY_KEY_SECRET_KEY).type('-edited');
    clickSaveEditButton();

    selectPolicyForEditing(policyName);
    checkInputValue(SHARED_CREDENTIAL_FILE, `${testSharedCredentialsFile}-edited`);
    checkInputValue(SHARED_CREDENTIAL_PROFILE, `${testSharedCredentialsProfile}-edited`);
    // checkInputValue(TEMPORARY_KEY_SECRET_KEY, `${testSecretKey}-edited`);
  });
});
