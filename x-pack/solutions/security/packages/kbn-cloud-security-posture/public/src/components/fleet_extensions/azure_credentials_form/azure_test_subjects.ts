/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ = 'azure-credentials-type-selector';

export const AZURE_SETUP_FORMAT_TEST_SUBJECTS = {
  ARM_TEMPLATE: 'cloudSetupAzureArmTemplate',
  MANUAL: 'cloudSetupAzureManual',
};

export const AZURE_INPUT_FIELDS_TEST_SUBJECTS = {
  TENANT_ID: 'cloudSetupAzureTenantId',
  CLIENT_ID: 'cloudSetupAzureClientId',
  CLIENT_SECRET: 'passwordInput-client-secret',
  CLIENT_CERTIFICATE_PATH: 'cloudSetupAzureClientCertificatePath',
  CLIENT_CERTIFICATE_PASSWORD: 'cloudSetupAzureClientCertificatePassword',
  CLIENT_USERNAME: 'cloudSetupAzureClientUsername',
  CLIENT_PASSWORD: 'cloudSetupAzureClientPassword',
};
