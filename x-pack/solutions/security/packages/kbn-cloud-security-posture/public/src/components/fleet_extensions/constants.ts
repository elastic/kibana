/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { CSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common/constants';
import type { CloudPostureIntegrations } from './types';
import googleCloudLogo from '../../assets/icons/google_cloud_logo.svg';

// Posture policies only support the default namespace
export const POSTURE_NAMESPACE = 'default';
export const ORGANIZATION_ACCOUNT = 'organization-account';
export const SINGLE_ACCOUNT = 'single-account';

// Cloud Credentials Template url was implemented in 1.10.0-preview01. See PR - https://github.com/elastic/integrations/pull/9828
export const CLOUD_CREDENTIALS_PACKAGE_VERSION = '1.11.0-preview13';

// Azure constants
export const CLOUDBEAT_AZURE = 'cloudbeat/cis_azure';

export const AZURE_SETUP_FORMAT = {
  ARM_TEMPLATE: 'arm_template',
  MANUAL: 'manual',
};

export const AZURE_SINGLE_ACCOUNT = SINGLE_ACCOUNT;
export const AZURE_ORGANIZATION_ACCOUNT = ORGANIZATION_ACCOUNT;
export const AZURE_CREDENTIALS_TYPE = {
  ARM_TEMPLATE: 'arm_template',
  MANUAL: 'manual',
  SERVICE_PRINCIPAL_WITH_CLIENT_SECRET: 'service_principal_with_client_secret',
  SERVICE_PRINCIPAL_WITH_CLIENT_CERTIFICATE: 'service_principal_with_client_certificate',
  SERVICE_PRINCIPAL_WITH_CLIENT_USERNAME_AND_PASSWORD:
    'service_principal_with_client_username_and_password',
  MANAGED_IDENTITY: 'managed_identity',
} as const;

export const ARM_TEMPLATE_EXTERNAL_DOC_URL =
  'https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/';

// AWS constants
export const CLOUDBEAT_AWS = 'cloudbeat/cis_aws';

export const AWS_SETUP_FORMAT = {
  CLOUD_FORMATION: 'cloud_formation',
  MANUAL: 'manual',
};

export const AWS_SINGLE_ACCOUNT = SINGLE_ACCOUNT;
export const AWS_ORGANIZATION_ACCOUNT = ORGANIZATION_ACCOUNT;
export const AWS_CREDENTIALS_TYPE = {
  CLOUD_CONNECTORS: 'cloud_connectors',
  ASSUME_ROLE: 'assume_role',
  DIRECT_ACCESS_KEYS: 'direct_access_keys',
  TEMPORARY_KEYS: 'temporary_keys',
  SHARED_CREDENTIALS: 'shared_credentials',
  CLOUD_FORMATION: 'cloud_formation',
} as const;

// GCP constants
export const CLOUDBEAT_GCP = 'cloudbeat/cis_gcp';

export const MIN_VERSION_GCP_CIS = '1.5.2';

export const GCP_SETUP_ACCESS = {
  CLOUD_SHELL: 'google_cloud_shell',
  MANUAL: 'manual',
};

export const GCP_SINGLE_ACCOUNT = SINGLE_ACCOUNT;
export const GCP_ORGANIZATION_ACCOUNT = ORGANIZATION_ACCOUNT;
export const GCP_CREDENTIALS_TYPE = {
  CREDENTIALS_FILE: 'credentials-file',
  CREDENTIALS_JSON: 'credentials-json',
  CREDENTIALS_NONE: 'credentials-none',
} as const;

export const SUPPORTED_POLICY_TEMPLATES = [CSPM_POLICY_TEMPLATE] as const;
export const SUPPORTED_CLOUDBEAT_INPUTS = [CLOUDBEAT_AWS, CLOUDBEAT_GCP, CLOUDBEAT_AZURE] as const;
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
};

export const CLOUD_SECURITY_POSTURE_INTEGRATIONS: CloudPostureIntegrations = {
  cspm: {
    policyTemplate: CSPM_POLICY_TEMPLATE,
    name: i18n.translate('securitySolutionPackages.cspmIntegration.integration.nameTitle', {
      defaultMessage: 'Cloud Security Posture Management',
    }),
    shortName: i18n.translate(
      'securitySolutionPackages.cspmIntegration.integration.shortNameTitle',
      {
        defaultMessage: 'CSPM',
      }
    ),
    options: [
      {
        type: CLOUDBEAT_AWS,
        name: i18n.translate('securitySolutionPackages.cspmIntegration.awsOption.nameTitle', {
          defaultMessage: 'AWS',
        }),
        benchmark: i18n.translate(
          'securitySolutionPackages.cspmIntegration.awsOption.benchmarkTitle',
          {
            defaultMessage: 'CIS AWS',
          }
        ),
        icon: 'logoAWS',
        testId: 'cisAwsTestId',
      },
      {
        type: CLOUDBEAT_GCP,
        name: i18n.translate('securitySolutionPackages.cspmIntegration.gcpOption.nameTitle', {
          defaultMessage: 'GCP',
        }),
        benchmark: i18n.translate(
          'securitySolutionPackages.cspmIntegration.gcpOption.benchmarkTitle',
          {
            defaultMessage: 'CIS GCP',
          }
        ),
        icon: googleCloudLogo,
        testId: 'cisGcpTestId',
      },
      {
        type: CLOUDBEAT_AZURE,
        name: i18n.translate('securitySolutionPackages.cspmIntegration.azureOption.nameTitle', {
          defaultMessage: 'Azure',
        }),
        benchmark: i18n.translate(
          'securitySolutionPackages.cspmIntegration.azureOption.benchmarkTitle',
          {
            defaultMessage: 'CIS Azure',
          }
        ),
        icon: 'logoAzure',
        testId: 'cisAzureTestId',
      },
    ],
  },
};

const ELASTIC_BASE_SHORT_URL = 'https://ela.st';

export const cspIntegrationDocsNavigation = {
  cspm: {
    overviewPath: `${ELASTIC_BASE_SHORT_URL}/${CSPM_POLICY_TEMPLATE}`,
    getStartedPath: `${ELASTIC_BASE_SHORT_URL}/${CSPM_POLICY_TEMPLATE}-get-started`,
    awsGetStartedPath: `https://www.elastic.co/guide/en/security/current/cspm-get-started.html`,
    gcpGetStartedPath: `https://www.elastic.co/guide/en/security/current/cspm-get-started-gcp.html`,
    azureGetStartedPath: `https://www.elastic.co/guide/en/security/current/cspm-get-started-azure.html`,
  },
};
