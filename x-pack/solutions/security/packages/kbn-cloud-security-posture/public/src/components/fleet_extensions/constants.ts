/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { CloudPostureIntegrations } from './types';
import googleCloudLogo from './assets/icons/google_cloud_logo.svg';
import { CLOUDBEAT_AZURE } from './azure_credentials_form/azure_constants';
import { CLOUDBEAT_AWS } from './aws_credentials_form/aws_constants';
import { CLOUDBEAT_GCP } from './gcp_credentials_form/gcp_constants';

// Posture policies only support the default namespace
export const POSTURE_NAMESPACE = 'default';
export const ORGANIZATION_ACCOUNT = 'organization-account';
export const SINGLE_ACCOUNT = 'single-account';

export const CSPM_POLICY_TEMPLATE = 'cspm';

// Cloud Credentials Template url was implemented in 1.10.0-preview01. See PR - https://github.com/elastic/integrations/pull/9828
export const CLOUD_CREDENTIALS_PACKAGE_VERSION = '1.11.0-preview13';

export const SUPPORTED_POLICY_TEMPLATES = [CSPM_POLICY_TEMPLATE] as const;
export const SUPPORTED_CLOUDBEAT_INPUTS = [CLOUDBEAT_AWS, CLOUDBEAT_GCP, CLOUDBEAT_AZURE] as const;
export const TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR = 'ACCOUNT_TYPE';
export const TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR = 'RESOURCE_ID';

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
    name: i18n.translate('xpack.csp.cspmIntegration.integration.nameTitle', {
      defaultMessage: 'Cloud Security Posture Management',
    }),
    shortName: i18n.translate('xpack.csp.cspmIntegration.integration.shortNameTitle', {
      defaultMessage: 'CSPM',
    }),
    options: [
      {
        type: CLOUDBEAT_AWS,
        name: i18n.translate('xpack.csp.cspmIntegration.awsOption.nameTitle', {
          defaultMessage: 'AWS',
        }),
        benchmark: i18n.translate('xpack.csp.cspmIntegration.awsOption.benchmarkTitle', {
          defaultMessage: 'CIS AWS',
        }),
        icon: 'logoAWS',
        testId: 'cisAwsTestId',
      },
      {
        type: CLOUDBEAT_GCP,
        name: i18n.translate('xpack.csp.cspmIntegration.gcpOption.nameTitle', {
          defaultMessage: 'GCP',
        }),
        benchmark: i18n.translate('xpack.csp.cspmIntegration.gcpOption.benchmarkTitle', {
          defaultMessage: 'CIS GCP',
        }),
        icon: googleCloudLogo,
        testId: 'cisGcpTestId',
      },
      {
        type: CLOUDBEAT_AZURE,
        name: i18n.translate('xpack.csp.cspmIntegration.azureOption.nameTitle', {
          defaultMessage: 'Azure',
        }),
        benchmark: i18n.translate('xpack.csp.cspmIntegration.azureOption.benchmarkTitle', {
          defaultMessage: 'CIS Azure',
        }),
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
