/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ = 'azure-credentials-type-selector';

export const CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS = {
  ARM_TEMPLATE: 'cisAzureArmTemplate',
  MANUAL: 'cisAzureManual',
};

export const CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS = {
  TENANT_ID: 'cisAzureTenantId',
  CLIENT_ID: 'cisAzureClientId',
  CLIENT_SECRET: 'passwordInput-client-secret',
  CLIENT_CERTIFICATE_PATH: 'cisAzureClientCertificatePath',
  CLIENT_CERTIFICATE_PASSWORD: 'cisAzureClientCertificatePassword',
  CLIENT_USERNAME: 'cisAzureClientUsername',
  CLIENT_PASSWORD: 'cisAzureClientPassword',
};
