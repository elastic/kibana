/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import type { CloudProviderConfig, CloudProviders } from '../types';
import {
  AWS_PROVIDER,
  GCP_PROVIDER,
  AZURE_PROVIDER,
  AWS_PROVIDER_TEST_ID,
  AZURE_PROVIDER_TEST_ID,
  GCP_PROVIDER_TEST_ID,
} from '../constants';
import { CloudSetupContext } from '../cloud_setup_context';
interface ICloudSetupProviderOptions {
  type: CloudProviders;
  name: string;
  icon: string;
  label?: string;
}

export function useCloudSetup() {
  const context = useContext(CloudSetupContext);
  if (context === undefined) {
    throw new Error('useCloudSetup must be used within a CloudSetupProvider');
  }

  const config = context.config;

  const getCloudSetupProviders = React.useCallback(
    (): CloudProviders[] => Object.keys(config.providers) as CloudProviders[],
    [config.providers]
  );

  const getCloudSetupProviderConfig = React.useCallback(
    (providerType: CloudProviders): CloudProviderConfig => {
      return config.providers[providerType];
    },
    [config.providers]
  );

  const getCloudSetupProviderByInputType = React.useCallback(
    (inputType: string) => {
      const provider = getCloudSetupProviders().find(
        (prov) => getCloudSetupProviderConfig(prov).type === inputType
      );

      if (!provider) {
        throw new Error(`Unknown cloud setup provider for input type: ${inputType}`);
      }
      return provider;
    },
    [getCloudSetupProviders, getCloudSetupProviderConfig]
  );

  const CloudSetupProviderOptions = React.useMemo<ICloudSetupProviderOptions[]>(
    () => [
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
        icon: 'logoGCP',
      },
      {
        type: AZURE_PROVIDER,
        name: i18n.translate('securitySolutionPackages.cspmIntegration.azureOption.nameTitle', {
          defaultMessage: 'Azure',
        }),
        icon: 'logoAzure',
      },
    ],
    []
  );

  const getCloudSetupTemplateInputOptions = React.useCallback(
    () =>
      getCloudSetupProviders().map((provider) => ({
        value: provider,
        id: provider,
        label: CloudSetupProviderOptions.find((o) => o.type === provider)?.name ?? provider,
        icon: CloudSetupProviderOptions.find((o) => o.type === provider)?.icon ?? '',
        testId:
          provider === AWS_PROVIDER
            ? AWS_PROVIDER_TEST_ID
            : provider === GCP_PROVIDER
            ? GCP_PROVIDER_TEST_ID
            : provider === AZURE_PROVIDER
            ? AZURE_PROVIDER_TEST_ID
            : '',
      })),
    [getCloudSetupProviders, CloudSetupProviderOptions]
  );

  // To reduce repetition and improve maintainability, extract provider-specific logic into a helper function.
  const getProviderDetails = React.useCallback(
    (provider: CloudProviders) => {
      const providerConfig = config.providers[provider];
      return {
        enabled: providerConfig.enabled !== undefined ? providerConfig.enabled : true,
        organizationEnabled:
          providerConfig.enableOrganization !== undefined
            ? providerConfig.enableOrganization
            : true,
        manualFieldsEnabled:
          providerConfig.manualFieldsEnabled !== undefined
            ? providerConfig.manualFieldsEnabled
            : true,
        policyType: providerConfig.type,
        overviewPath: providerConfig.getStartedPath,
      };
    },
    [config.providers]
  );

  return React.useMemo(
    () => ({
      getCloudSetupProviderByInputType,
      templateInputOptions: getCloudSetupTemplateInputOptions(),
      config,
      cloudConnectorEnabledVersion: config.cloudConnectorEnabledVersion,
      showCloudTemplates: config.showCloudTemplates,
      defaultProvider: config.defaultProvider,
      defaultProviderType: config.providers[config.defaultProvider].type,
      awsPolicyType: getProviderDetails(AWS_PROVIDER).policyType,
      awsOrganizationEnabled: getProviderDetails(AWS_PROVIDER).organizationEnabled,
      awsOverviewPath: getProviderDetails(AWS_PROVIDER).overviewPath,
      azurePolicyType: getProviderDetails(AZURE_PROVIDER).policyType,
      azureEnabled: getProviderDetails(AZURE_PROVIDER).enabled,
      azureManualFieldsEnabled: getProviderDetails(AZURE_PROVIDER).manualFieldsEnabled,
      azureOrganizationEnabled: getProviderDetails(AZURE_PROVIDER).organizationEnabled,
      azureOverviewPath: getProviderDetails(AZURE_PROVIDER).overviewPath,
      gcpEnabled: getProviderDetails(GCP_PROVIDER).enabled,
      gcpPolicyType: getProviderDetails(GCP_PROVIDER).policyType,
      gcpOrganizationEnabled: getProviderDetails(GCP_PROVIDER).organizationEnabled,
      gcpOverviewPath: getProviderDetails(GCP_PROVIDER).overviewPath,
      templateName: config.policyTemplate,
    }),
    [
      config,
      getCloudSetupProviderByInputType,
      getCloudSetupTemplateInputOptions,
      getProviderDetails,
    ]
  );
}
