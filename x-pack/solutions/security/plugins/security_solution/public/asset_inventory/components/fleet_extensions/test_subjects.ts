/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export { SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ } from '@kbn/fleet-plugin/public';

export const AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ = 'aws-credentials-type-selector';
export const AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ = {
  CLOUDFORMATION: 'aws-cloudformation-setup-option',
  MANUAL: 'aws-manual-setup-option',
};
export const GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ = {
  CLOUD_SHELL: 'gcpGoogleCloudShellOptionTestId',
  MANUAL: 'gcpManualOptionTestId',
};
export const CAI_AWS_OPTION_TEST_SUBJ = 'cloudSetupAwsTestId';
export const CAI_GCP_OPTION_TEST_SUBJ = 'cloudSetupGcpTestId';
export const CAI_AZURE_OPTION_TEST_SUBJ = 'cloudSetupAzureTestId';

export const AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ = 'azure-credentials-type-selector';
export const CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS = {
  TENANT_ID: 'cloudSetupAzureTenantId',
  CLIENT_ID: 'cloudSetupAzureClientId',
  CLIENT_SECRET: 'passwordInput-client-secret',
  CLIENT_CERTIFICATE_PATH: 'cloudSetupAzureClientCertificatePath',
  CLIENT_CERTIFICATE_PASSWORD: 'cloudSetupAzureClientCertificatePassword',
  CLIENT_USERNAME: 'cloudSetupAzureClientUsername',
  CLIENT_PASSWORD: 'cloudSetupAzureClientPassword',
};
export const CAI_AZURE_SETUP_FORMAT_TEST_SUBJECTS = {
  ARM_TEMPLATE: 'cloudSetupAzureArmTemplate',
  MANUAL: 'cloudSetupAzureManual',
};
export const CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS = {
  GOOGLE_CLOUD_SHELL_SETUP: 'google_cloud_shell_setup_test_id',
  PROJECT_ID: 'project_id_test_id',
  ORGANIZATION_ID: 'organization_id_test_id',
  CREDENTIALS_TYPE: 'credentials_type_test_id',
  CREDENTIALS_FILE: 'credentials_file_test_id',
  CREDENTIALS_JSON: 'textAreaInput-credentials-json',
};
