import { i18n } from '@kbn/i18n';
import googleCloudLogo from '../../assets/icons/google_cloud_logo.svg';
import { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AWS_PROVIDER = 'aws';
export const GCP_PROVIDER = 'gcp';
export const AZURE_PROVIDER = 'azure';

export type CloudProviders = typeof AWS_PROVIDER | typeof GCP_PROVIDER | typeof AZURE_PROVIDER;

type CloudProviderConfig = {
  type: string;
  showCloudConnectors: boolean;
  showCloudTemplate: boolean;
  organizationMinimumVersion?: string;
  getStartedPath: string;
  minShowVersion?: string;
  testId: string;
};
export type CloudSetupConfig = {
  policyTemplate: string;
  name: string;
  shortName: string;
  defaultProvider: CloudProviders;
  namespaceSupportEnabled?: boolean;
  overviewPath: string;
  getStartedPath: string;
  providers: Record<CloudProviders, CloudProviderConfig>;
};

// Add this constant before TEMP_CSPM_MAPPING
const AWS_ORG_MINIMUM_PACKAGE_VERSION = '1.5.0-preview20';
const GCP_ORG_MINIMUM_PACKAGE_VERSION = '1.6.0';
const AZURE_ORG_MINIMUM_PACKAGE_VERSION = '1.7.0';
const MIN_VERSION_GCP_CIS = '1.5.2';

const TEMP_CSPM_MAPPING: CloudSetupConfig = {
  policyTemplate: 'cspm',
  defaultProvider: AWS_PROVIDER,
  namespaceSupportEnabled: true,
  name: i18n.translate('securitySolutionPackages.cspmIntegration.integration.nameTitle', {
    defaultMessage: 'Cloud Security Posture Management',
  }),
  shortName: i18n.translate('securitySolutionPackages.cspmIntegration.integration.shortNameTitle', {
    defaultMessage: 'CSPM',
  }),
  overviewPath: `https://ela.st/cspm-overview`,
  getStartedPath: `https://ela.st/cspm-get-started`,
  providers: {
    aws: {
      type: 'cloudbeat/cis_aws',
      showCloudConnectors: true,
      showCloudTemplate: true, // this should be checking the package version and set in CSPM
      organizationMinimumVersion: AWS_ORG_MINIMUM_PACKAGE_VERSION,
      getStartedPath: `https://www.elastic.co/guide/en/security/current/cspm-get-started.html`,
      testId: 'cisAwsTestId',
    },
    gcp: {
      type: 'cloudbeat/cis_gcp',
      showCloudConnectors: false,
      showCloudTemplate: true, // this should be checking the package version and set in CSPM
      organizationMinimumVersion: GCP_ORG_MINIMUM_PACKAGE_VERSION,
      getStartedPath: `https://www.elastic.co/guide/en/security/current/cspm-get-started-gcp.html`,
      minShowVersion: MIN_VERSION_GCP_CIS,
      testId: 'cisGcpTestId',
    },
    azure: {
      type: 'cloudbeat/cis_azure',
      showCloudConnectors: false,
      showCloudTemplate: true, // this should be checking the package version and set in CSPM
      organizationMinimumVersion: AZURE_ORG_MINIMUM_PACKAGE_VERSION,
      getStartedPath: `https://www.elastic.co/guide/en/security/current/cspm-get-started-azure.html`,
      testId: 'cisAzureTestId',
    },
  },
};

export const getCloudSetupConfig = (): CloudSetupConfig => TEMP_CSPM_MAPPING;

export const getCloudSetupDefaultProvider = (): CloudProviders => TEMP_CSPM_MAPPING.defaultProvider;

export const getCloudSetupProviders = (): CloudProviders[] =>
  Object.keys(TEMP_CSPM_MAPPING.providers) as CloudProviders[];

export const getCloudSetupProviderConfig = (providerType: CloudProviders): CloudProviderConfig => {
  return TEMP_CSPM_MAPPING.providers[providerType];
};

export const showCloudTemplate = (providerType: CloudProviders): boolean => {
  const providerConfig = getCloudSetupProviderConfig(providerType);
  return providerConfig.showCloudTemplate;
};

export const isCloudSetupProvider = (input: NewPackagePolicyInput): boolean =>
  !!input.policy_template && !!getCloudSetupProviderByInputType(input.type);

export const getCloudSetupPolicyType = (provider: CloudProviders): string | undefined => {
  switch (provider) {
    case AWS_PROVIDER:
      return TEMP_CSPM_MAPPING.providers.aws.type;
    case GCP_PROVIDER:
      return TEMP_CSPM_MAPPING.providers.gcp.type;
    case AZURE_PROVIDER:
      return TEMP_CSPM_MAPPING.providers.azure.type;
    default:
      return undefined;
  }
};

export const getCloudSetupProviderByInputType = (inputType: string) => {
  const provider = getCloudSetupProviders().find(
    (provider) => getCloudSetupProviderConfig(provider).type === inputType
  );

  if (!provider) {
    throw new Error(`Unknown cloud setup provider for input type: ${inputType}`);
  }
  return provider;
};

export const getCloudSetupPolicyTemplate = (): string => TEMP_CSPM_MAPPING.policyTemplate;

export const getCloudSetupProviderOverviewPath = (provider: CloudProviders): string => {
  const providerConfig = getCloudSetupProviderConfig(provider);
  return providerConfig.getStartedPath;
};

export const getCloudSetupOverviewPath = (): string => {
  return TEMP_CSPM_MAPPING.overviewPath;
};

interface ICloudSetupProviderOptions {
  type: CloudProviders;
  name: string;
  icon: string;
  label?: string;
}

export const CloudSetupProviderOptions: ICloudSetupProviderOptions[] = [
  {
    type: AWS_PROVIDER,
    name: i18n.translate('securitySolutionPackages.cspmIntegration.awsOption.nameTitle', {
      defaultMessage: 'AWS',
    }),
    icon: 'logoAWS',
  },
  {
    type: GCP_PROVIDER,
    name: i18n.translate('securitySolutionPackages.cspmIntegration.gcpOption.nameTitle', {
      defaultMessage: 'GCP',
    }),
    icon: googleCloudLogo,
  },
  {
    type: AZURE_PROVIDER,
    name: i18n.translate('securitySolutionPackages.cspmIntegration.azureOption.nameTitle', {
      defaultMessage: 'Azure',
    }),
    icon: 'logoAzure',
  },
];

export const getCloudSetupTemplateInputOptions = () =>
  getCloudSetupProviders().map((provider) => ({
    value: provider,
    id: provider,
    label: CloudSetupProviderOptions.find((o) => o.type === provider)?.name ?? provider,
    icon: CloudSetupProviderOptions.find((o) => o.type === provider)?.icon ?? '',
    testId: getCloudSetupProviderConfig(provider).testId,
  }));
