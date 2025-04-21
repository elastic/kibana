/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ = 'aws-credentials-type-selector';
export const AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ = {
  CLOUDFORMATION: 'aws-cloudformation-setup-option',
  MANUAL: 'aws-manual-setup-option',
};
export const GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ = {
  CLOUD_SHELL: 'gcpGoogleCloudShellOptionTestId',
  MANUAL: 'gcpManualOptionTestId',
};
export const CIS_GCP_OPTION_TEST_SUBJ = 'cisGcpTestId';
export const CIS_AZURE_OPTION_TEST_SUBJ = 'cisAzureTestId';

export const SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ = 'setup-technology-selector';
export const SETUP_TECHNOLOGY_SELECTOR_AGENTLESS_TEST_SUBJ =
  'setup-technology-selector-agentless-radio';
export const SETUP_TECHNOLOGY_SELECTOR_AGENT_BASED_TEST_SUBJ =
  'setup-technology-selector-agentbased-radio';
export const AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ = 'azure-credentials-type-selector';
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
export const CIS_GCP_INPUT_FIELDS_TEST_SUBJECTS = {
  GOOGLE_CLOUD_SHELL_SETUP: 'google_cloud_shell_setup_test_id',
  PROJECT_ID: 'project_id_test_id',
  ORGANIZATION_ID: 'organization_id_test_id',
  CREDENTIALS_TYPE: 'credentials_type_test_id',
  CREDENTIALS_FILE: 'credentials_file_test_id',
  CREDENTIALS_JSON: 'credentials_json_test_id',
};
