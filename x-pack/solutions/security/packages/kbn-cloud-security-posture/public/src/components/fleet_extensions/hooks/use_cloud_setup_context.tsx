/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext, useMemo } from 'react';
import semverGte from 'semver/functions/gte';
import { i18n } from '@kbn/i18n';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import {
  AWS_PROVIDER_TEST_SUBJ,
  GCP_PROVIDER_TEST_SUBJ,
  AZURE_PROVIDER_TEST_SUBJ,
} from '@kbn/cloud-security-posture-common';
import type { PackageInfo } from '@kbn/fleet-plugin/common';
import type {
  AwsInputFieldMapping,
  CloudProviderConfig,
  CloudProviders,
  CloudSetupConfig,
} from '../types';
import {
  AWS_PROVIDER,
  GCP_PROVIDER,
  AZURE_PROVIDER,
  SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING,
} from '../constants';
import { CloudSetupContext } from '../cloud_setup_context';

export interface CloudSetupContextValue {
  getCloudSetupProviderByInputType: (inputType: string) => CloudProviders;
  config: CloudSetupConfig;
  showCloudTemplates: boolean;
  defaultProvider: CloudProviders;
  defaultProviderType: string;
  awsInputFieldMapping: AwsInputFieldMapping | undefined;
  awsPolicyType: string;
  awsOrganizationEnabled: boolean;
  awsOverviewPath: string;
  isAwsCloudConnectorEnabled: boolean;
  azureEnabled: boolean;
  isAzureCloudConnectorEnabled: boolean;
  azureManualFieldsEnabled?: boolean;
  azureOrganizationEnabled: boolean;
  azureOverviewPath: string;
  azurePolicyType: string;
  gcpEnabled: boolean;
  gcpOrganizationEnabled: boolean;
  isGcpCloudConnectorEnabled: boolean;
  gcpOverviewPath: string;
  gcpPolicyType: string;
  shortName?: string;
  templateInputOptions: Array<{
    value: CloudProviders;
    id: CloudProviders;
    label: string;
    icon: string;
    testId: string;
  }>;
  templateName: string;
  elasticStackId?: string;
}

const isCloudConnectorEnabledForProvider = ({
  provider,
  config,
  packageInfo,
  cloudConnectorsFeatureEnabled,
}: {
  provider: CloudProviders;
  config: CloudSetupConfig;
  packageInfo: PackageInfo;
  cloudConnectorsFeatureEnabled: boolean;
}) => {
  const providerConfig = config.providers[provider];
  const cloudConnectorEnabledVersion = providerConfig.cloudConnectorEnabledVersion;
  const allowedProviders = [AWS_PROVIDER, AZURE_PROVIDER];

  if (!allowedProviders.includes(provider)) {
    return false;
  }

  return !!(
    cloudConnectorsFeatureEnabled &&
    cloudConnectorEnabledVersion &&
    semverGte(packageInfo.version, cloudConnectorEnabledVersion)
  );
};

const buildCloudSetupState = ({
  config,
  packageInfo,
  cloudConnectorsFeatureEnabled,
  cloud,
}: {
  config: CloudSetupConfig;
  packageInfo: PackageInfo;
  cloudConnectorsFeatureEnabled: boolean;
  cloud: CloudSetup;
}): CloudSetupContextValue => {
  const getProviderDetails = (provider: CloudProviders) => {
    const providerConfig = config.providers[provider];
    return {
      enabled: providerConfig.enabled !== undefined ? providerConfig.enabled : true,
      organizationEnabled:
        providerConfig.enableOrganization !== undefined ? providerConfig.enableOrganization : true,
      policyType: providerConfig.type,
      overviewPath: providerConfig.getStartedPath,
    };
  };

  const getCloudSetupProviders = (): CloudProviders[] =>
    Object.keys(config.providers) as CloudProviders[];

  const getCloudSetupProviderConfig = (providerType: CloudProviders): CloudProviderConfig => {
    return config.providers[providerType];
  };

  const CloudSetupProviderOptions = [
    {
      type: AWS_PROVIDER,
      name: i18n.translate('securitySolutionPackages.integrations.awsOption.nameTitle', {
        defaultMessage: 'AWS',
      }),
      icon: 'logoAWS',
    },
    {
      type: GCP_PROVIDER,
      name: i18n.translate('securitySolutionPackages.integrations.gcpOption.nameTitle', {
        defaultMessage: 'GCP',
      }),
      icon: 'logoGCP',
    },
    {
      type: AZURE_PROVIDER,
      name: i18n.translate('securitySolutionPackages.integrations.azureOption.nameTitle', {
        defaultMessage: 'Azure',
      }),
      icon: 'logoAzure',
    },
  ];

  const templateInputOptions = getCloudSetupProviders().map((provider) => ({
    value: provider,
    id: provider,
    label: CloudSetupProviderOptions.find((o) => o.type === provider)?.name ?? provider,
    icon: CloudSetupProviderOptions.find((o) => o.type === provider)?.icon ?? '',
    testId:
      provider === AWS_PROVIDER
        ? AWS_PROVIDER_TEST_SUBJ
        : provider === GCP_PROVIDER
        ? GCP_PROVIDER_TEST_SUBJ
        : provider === AZURE_PROVIDER
        ? AZURE_PROVIDER_TEST_SUBJ
        : '',
  }));

  const getCloudSetupProviderByInputType = (inputType: string) => {
    const provider = getCloudSetupProviders().find(
      (prov) => getCloudSetupProviderConfig(prov).type === inputType
    );

    if (!provider) {
      throw new Error(`Unknown cloud setup provider for input type: ${inputType}`);
    }
    return provider;
  };

  const cloudSetupContextValues = {
    getCloudSetupProviderByInputType,
    config,
    showCloudTemplates: config.showCloudTemplates,
    defaultProvider: config.defaultProvider,
    defaultProviderType: config.providers[config.defaultProvider].type,
    awsInputFieldMapping: config.providers[AWS_PROVIDER].inputFieldMapping,
    awsPolicyType: getProviderDetails(AWS_PROVIDER).policyType,
    awsOrganizationEnabled: getProviderDetails(AWS_PROVIDER).organizationEnabled,
    awsOverviewPath: getProviderDetails(AWS_PROVIDER).overviewPath,
    isAwsCloudConnectorEnabled: isCloudConnectorEnabledForProvider({
      provider: AWS_PROVIDER,
      config,
      packageInfo,
      cloudConnectorsFeatureEnabled,
    }),
    azureEnabled: getProviderDetails(AZURE_PROVIDER).enabled,
    isAzureCloudConnectorEnabled: isCloudConnectorEnabledForProvider({
      provider: AZURE_PROVIDER,
      config,
      packageInfo,
      cloudConnectorsFeatureEnabled,
    }),
    azureManualFieldsEnabled: config.providers[AZURE_PROVIDER].manualFieldsEnabled,
    azureOrganizationEnabled: getProviderDetails(AZURE_PROVIDER).organizationEnabled,
    azureOverviewPath: getProviderDetails(AZURE_PROVIDER).overviewPath,
    azurePolicyType: getProviderDetails(AZURE_PROVIDER).policyType,
    gcpEnabled: getProviderDetails(GCP_PROVIDER).enabled,
    gcpOrganizationEnabled: getProviderDetails(GCP_PROVIDER).organizationEnabled,
    isGcpCloudConnectorEnabled: isCloudConnectorEnabledForProvider({
      provider: GCP_PROVIDER,
      config,
      packageInfo,
      cloudConnectorsFeatureEnabled,
    }),
    gcpOverviewPath: getProviderDetails(GCP_PROVIDER).overviewPath,
    gcpPolicyType: getProviderDetails(GCP_PROVIDER).policyType,
    shortName: config.shortName,
    templateInputOptions,
    templateName: config.policyTemplate,
  };

  return cloudSetupContextValues;
};

export function useCloudSetup(): CloudSetupContextValue {
  const context = useContext(CloudSetupContext);
  if (context === undefined) {
    throw new Error('useCloudSetup must be used within a CloudSetupProvider');
  }

  const cloudConnectorsFeatureEnabled =
    context.uiSettings.get<boolean>(SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING) || false;

  return useMemo(
    () =>
      buildCloudSetupState({
        config: context.config,
        packageInfo: context.packageInfo,
        cloudConnectorsFeatureEnabled,
        cloud: context.cloud,
      }),
    [context.config, context.packageInfo, cloudConnectorsFeatureEnabled, context.cloud]
  );
}
