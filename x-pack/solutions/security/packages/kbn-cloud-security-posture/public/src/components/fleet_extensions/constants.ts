/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AWS_PROVIDER = 'aws';
export const GCP_PROVIDER = 'gcp';
export const AZURE_PROVIDER = 'azure';

export const CLOUD_CONNECTOR_TYPE = 'cloud_connectors';

export const TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR = 'ACCOUNT_TYPE';
export const TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR = 'RESOURCE_ID';

export const SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING =
  'securitySolution:enableCloudConnector';

export const SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS = {
  CLOUD_FORMATION: 'cloud_formation_template',
  CLOUD_FORMATION_CREDENTIALS: 'cloud_formation_credentials_template',
  ARM_TEMPLATE: 'arm_template_url',
  CLOUD_SHELL_URL: 'cloud_shell_url',
  CLOUD_FORMATION_CLOUD_CONNECTORS: 'cloud_formation_cloud_connectors_template',
  ARM_TEMPLATE_CLOUD_CONNECTORS: 'arm_template_cloud_connectors_url',
};

export const ProviderAccountTypeInputNames: Record<
  typeof AWS_PROVIDER | typeof GCP_PROVIDER | typeof AZURE_PROVIDER,
  string
> = {
  aws: 'aws.account_type',
  azure: 'azure.account_type',
  gcp: 'gcp.account_type',
};

// Azure constants
export const AZURE_SETUP_FORMAT = {
  ARM_TEMPLATE: 'arm_template',
  MANUAL: 'manual',
};

export const AZURE_CREDENTIALS_TYPE = {
  ARM_TEMPLATE: 'arm_template',
  CLOUD_CONNECTORS: 'cloud_connectors',
  MANUAL: 'manual',
  SERVICE_PRINCIPAL_WITH_CLIENT_SECRET: 'service_principal_with_client_secret',
  SERVICE_PRINCIPAL_WITH_CLIENT_CERTIFICATE: 'service_principal_with_client_certificate',
  SERVICE_PRINCIPAL_WITH_CLIENT_USERNAME_AND_PASSWORD:
    'service_principal_with_client_username_and_password',
  MANAGED_IDENTITY: 'managed_identity',
} as const;

export const ARM_TEMPLATE_EXTERNAL_DOC_URL =
  'https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/';

export const AWS_SETUP_FORMAT = {
  CLOUD_FORMATION: 'cloud_formation',
  MANUAL: 'manual',
};
// AWS constants

export const AWS_CREDENTIALS_TYPE = {
  CLOUD_CONNECTORS: 'cloud_connectors',
  ASSUME_ROLE: 'assume_role',
  DIRECT_ACCESS_KEYS: 'direct_access_keys',
  TEMPORARY_KEYS: 'temporary_keys',
  SHARED_CREDENTIALS: 'shared_credentials',
  CLOUD_FORMATION: 'cloud_formation',
} as const;

export const DEFAULT_AWS_CREDENTIALS_TYPE = AWS_CREDENTIALS_TYPE.CLOUD_FORMATION;
export const DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE: typeof AWS_CREDENTIALS_TYPE.ASSUME_ROLE =
  AWS_CREDENTIALS_TYPE.ASSUME_ROLE;
export const DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE = AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS;
export const DEFAULT_AGENTLESS_CLOUD_CONNECTORS_AWS_CREDENTIALS_TYPE =
  AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS;

// GCP constants
export const GCP_SETUP_ACCESS = {
  CLOUD_SHELL: 'google_cloud_shell',
  MANUAL: 'manual',
};

export const GCP_CREDENTIALS_TYPE = {
  CREDENTIALS_FILE: 'credentials-file',
  CREDENTIALS_JSON: 'credentials-json',
  CREDENTIALS_NONE: 'credentials-none',
} as const;
