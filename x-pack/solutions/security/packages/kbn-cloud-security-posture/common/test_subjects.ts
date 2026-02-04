/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AWS_PROVIDER_TEST_SUBJ = 'cloudSetupAwsTestId';
export const AWS_CLOUD_FORMATION_ACCORDION_TEST_SUBJ =
  'launchAwsCloudFormationAccordianInstructions';
export const AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ = 'launchCloudFormationAgentlessButton';
export const AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ = 'aws-credentials-type-selector';
export const AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS = {
  CLOUDFORMATION: 'aws-cloudformation-setup-option',
  MANUAL: 'aws-manual-setup-option',
};

export const AWS_ORGANIZATION_ACCOUNT_TEST_SUBJ = 'awsOrganizationTestId';
export const AWS_SINGLE_ACCOUNT_TEST_SUBJ = 'awsSingleTestId';

export const AWS_INPUT_TEST_SUBJECTS = {
  ROLE_ARN: 'awsRoleArnInput',
  DIRECT_ACCESS_KEY_ID: 'awsDirectAccessKeyId',
  DIRECT_ACCESS_SECRET_KEY: 'passwordInput-secret-access-key',
  TEMP_ACCESS_KEY_ID: 'awsTemporaryKeysAccessKeyId',
  TEMP_ACCESS_SECRET_KEY: 'passwordInput-secret-access-key',
  TEMP_ACCESS_SESSION_TOKEN: 'awsTemporaryKeysSessionToken',
  SHARED_CREDENTIALS_FILE: 'awsSharedCredentialFile',
  SHARED_CREDENTIALS_PROFILE_NAME: 'awsCredentialProfileName',
  EXTERNAL_ID: 'passwordInput-external-id',
};

export const GCP_PROVIDER_TEST_SUBJ = 'cloudSetupGcpTestId';
export const GCP_ORGANIZATION_ACCOUNT_TEST_SUBJ = 'gcpOrganizationAccountTestId';
export const GCP_SINGLE_ACCOUNT_TEST_SUBJ = 'gcpSingleAccountTestId';

export const GCP_INPUT_FIELDS_TEST_SUBJECTS = {
  GOOGLE_CLOUD_SHELL_SETUP: 'google_cloud_shell_setup_test_id',
  PROJECT_ID: 'project_id_test_id',
  ORGANIZATION_ID: 'organization_id_test_id',
  CREDENTIALS_TYPE: 'credentials_type_test_id',
  CREDENTIALS_FILE: 'credentials_file_test_id',
  CREDENTIALS_JSON: 'textAreaInput-credentials-json',
  CREDENTIALS_JSON_SECRET_PANEL: 'credentials_json_secret_panel_test_id',
};

export const GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS = {
  CLOUD_SHELL: 'gcpGoogleCloudShellOptionTestId',
  MANUAL: 'gcpManualOptionTestId',
};

export const AZURE_PROVIDER_TEST_SUBJ = 'cloudSetupAzureTestId';
export const AZURE_ORGANIZATION_ACCOUNT_TEST_SUBJ = 'azureOrganizationAccountTestId';
export const AZURE_SINGLE_ACCOUNT_TEST_SUBJ = 'azureSingleAccountTestId';
export const AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ = 'azureCredentialsTypeSelector';

export const AZURE_SETUP_FORMAT_TEST_SUBJECTS = {
  ARM_TEMPLATE: 'cloudSetupAzureArmTemplate',
  MANUAL: 'cloudSetupAzureManual',
};

export const AZURE_INPUT_FIELDS_TEST_SUBJECTS = {
  TENANT_ID: 'textInput-tenant-id',
  CLIENT_ID: 'textInput-client-id',
  CLIENT_SECRET: 'passwordInput-client-secret',
  CLIENT_CERTIFICATE_PATH: 'cloudSetupAzureClientCertificatePath',
  CLIENT_CERTIFICATE_PASSWORD: 'passwordInput-client-certificate-password',
  CLIENT_USERNAME: 'cloudSetupAzureClientUsername',
  CLIENT_PASSWORD: 'cloudSetupAzureClientPassword',
  CLOUD_CONNECTOR_ID: 'cloudSetupAzureCloudConnectorId',
};

export const ADVANCED_OPTION_ACCORDION_TEST_SUBJ = 'advancedOptionsAccordion';
export const NAMESPACE_INPUT_TEST_SUBJ = 'namespaceInputTestId';
