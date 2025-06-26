/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AZURE_SINGLE_ACCOUNT = 'single-account';
export const AZURE_ORGANIZATION_ACCOUNT = 'organization-account';

export const CLOUDBEAT_AZURE = 'cloudbeat/asset_inventory_azure';

export const AZURE_SETUP_FORMAT = {
  ARM_TEMPLATE: 'arm_template',
  MANUAL: 'manual',
} as const;

export const AZURE_CREDENTIALS_TYPE = {
  ARM_TEMPLATE: 'arm_template',
  MANUAL: 'manual',
  SERVICE_PRINCIPAL_WITH_CLIENT_SECRET: 'service_principal_with_client_secret',
  SERVICE_PRINCIPAL_WITH_CLIENT_CERTIFICATE: 'service_principal_with_client_certificate',
  SERVICE_PRINCIPAL_WITH_CLIENT_USERNAME_AND_PASSWORD:
    'service_principal_with_client_username_and_password',
  MANAGED_IDENTITY: 'managed_identity',
} as const;
