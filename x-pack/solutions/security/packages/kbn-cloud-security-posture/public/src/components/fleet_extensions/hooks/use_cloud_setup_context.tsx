/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { CloudProviderConfig, CloudProviders } from '../types';
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

  return React.useMemo(
    () => ({
      getCloudSetupProviderByInputType,
      templateInputOptions: getCloudSetupTemplateInputOptions(),
      config,
      defaultProvider: config.defaultProvider,
      defaultProviderType: config.providers[config.defaultProvider].type,
      awsPolicyType: config.providers[AWS_PROVIDER].type,
      awsOrganizationMinimumVersion: config.providers[AWS_PROVIDER].organizationMinimumVersion,
      awsOverviewPath: config.providers[AWS_PROVIDER].getStartedPath,
      awsShowCloudConnectors: config.providers[AWS_PROVIDER].showCloudConnectors,
      azurePolicyType: config.providers[AZURE_PROVIDER].type,
      azureOrganizationMinimumVersion: config.providers[AZURE_PROVIDER].organizationMinimumVersion,
      azureOverviewPath: config.providers[AZURE_PROVIDER].getStartedPath,
      azureShowCloudConnectors: config.providers[AZURE_PROVIDER].showCloudConnectors,
      azureShowCloudTemplate: config.providers[AZURE_PROVIDER].showCloudTemplate,
      gcpMinShowVersion: config.providers[GCP_PROVIDER].minShowVersion,
      gcpPolicyType: config.providers[GCP_PROVIDER].type,
      gcpOrganizationMinimumVersion: config.providers[GCP_PROVIDER].organizationMinimumVersion,
      gcpOverviewPath: config.providers[GCP_PROVIDER].getStartedPath,
      gcpShowCloudConnectors: config.providers[GCP_PROVIDER].showCloudConnectors,
      gcpShowCloudTemplate: config.providers[GCP_PROVIDER].showCloudTemplate,
      templateName: config.policyTemplate,
    }),
    [config, getCloudSetupProviderByInputType, getCloudSetupTemplateInputOptions]
  );
}
