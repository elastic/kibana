/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext, useMemo } from 'react';
import semverGte from 'semver/functions/gte';
import type { CloudSetup } from '@kbn/cloud-plugin/public/types';
import { i18n } from '@kbn/i18n';
import {
  AWS_PROVIDER_TEST_SUBJ,
  GCP_PROVIDER_TEST_SUBJ,
  AZURE_PROVIDER_TEST_SUBJ,
  AWS_SINGLE_ACCOUNT,
  GCP_SINGLE_ACCOUNT,
  AZURE_SINGLE_ACCOUNT,
} from '@kbn/cloud-security-posture-common';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
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
  ProviderAccountTypeInputNames,
  SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS,
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
  TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR,
} from '../constants';
import { CloudSetupContext } from '../cloud_setup_context';
import { getInputByType, getTemplateUrlFromPackageInfo } from '../utils';

type CloudForCloudConnector = Pick<
  CloudSetup,
  | 'isCloudEnabled'
  | 'cloudId'
  | 'cloudHost'
  | 'deploymentUrl'
  | 'serverless'
  | 'isServerlessEnabled'
>;

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
  awsCloudConnectorRemoteRoleTemplate?: string;
  isAwsCloudConnectorEnabled: boolean;
  azureEnabled: boolean;
  azureCloudConnectorRemoteRoleTemplate?: string;
  isAzureCloudConnectorEnabled: boolean;
  azureManualFieldsEnabled?: boolean;
  azureOrganizationEnabled: boolean;
  azureOverviewPath: string;
  azurePolicyType: string;
  gcpEnabled: boolean;
  gcpOrganizationEnabled: boolean;
  gcpCloudConnectorRemoteRoleTemplate?: string;
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

interface GetCloudConnectorRemoteRoleTemplateParams {
  input: NewPackagePolicyInput;
  cloud: CloudForCloudConnector;
  packageInfo: PackageInfo;
  templateName: string;
  provider: CloudProviders;
}

const getCloudProviderFromCloudHost = (cloudHost: string | undefined): string | undefined => {
  if (!cloudHost) return undefined;
  const match = cloudHost.match(/\b(aws|gcp|azure)\b/)?.[1];
  return match;
};

const getDeploymentIdFromUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  const match = url.match(/\/deployments\/([^/?#]+)/);
  return match?.[1];
};

const getKibanaComponentId = (cloudId: string | undefined): string | undefined => {
  if (!cloudId || !cloudId.includes(':')) return undefined;

  const base64Part = cloudId.split(':')[1];
  const decoded = atob(base64Part);
  const [, , kibanaComponentId] = decoded.split('$');

  return kibanaComponentId || undefined;
};

const getElasticStackId = (cloud: CloudForCloudConnector): string | undefined => {
  if (cloud?.isServerlessEnabled && cloud?.serverless?.projectId) {
    return cloud.serverless.projectId;
  }

  const deploymentId = getDeploymentIdFromUrl(cloud?.deploymentUrl);
  const kibanaComponentId = getKibanaComponentId(cloud?.cloudId);

  if (cloud?.isCloudEnabled && deploymentId && kibanaComponentId) {
    return kibanaComponentId;
  }

  return undefined;
};

const getCloudConnectorRemoteRoleTemplate: (
  params: GetCloudConnectorRemoteRoleTemplateParams
) => string | undefined = ({
  input,
  cloud,
  packageInfo,
  templateName,
  provider,
}: GetCloudConnectorRemoteRoleTemplateParams): string | undefined => {
  const defaultAccountType =
    provider === AWS_PROVIDER
      ? AWS_SINGLE_ACCOUNT
      : provider === GCP_PROVIDER
      ? GCP_SINGLE_ACCOUNT
      : AZURE_SINGLE_ACCOUNT;

  const accountType =
    input?.streams?.[0]?.vars?.[ProviderAccountTypeInputNames[provider]]?.value ??
    defaultAccountType;

  const hostProvider = getCloudProviderFromCloudHost(cloud?.cloudHost);
  if (!hostProvider || (provider === 'aws' && hostProvider !== provider)) return undefined;

  const elasticResourceId = getElasticStackId(cloud);

  if (!elasticResourceId) return undefined;

  const templateUrlFieldName =
    provider === AWS_PROVIDER
      ? SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.CLOUD_FORMATION_CLOUD_CONNECTORS
      : provider === AZURE_PROVIDER
      ? SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.ARM_TEMPLATE_CLOUD_CONNECTORS
      : undefined;

  if (templateUrlFieldName) {
    const templateUrl = getTemplateUrlFromPackageInfo(
      packageInfo,
      templateName,
      templateUrlFieldName
    )
      ?.replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType)
      ?.replace(TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR, elasticResourceId);

    return templateUrl;
  }

  return undefined;
};

const getProviderCloudConnectorState = ({
  provider,
  config,
  cloud,
  newPolicy,
  packageInfo,
  cloudConnectorsFeatureEnabled,
}: {
  provider: CloudProviders;
  config: CloudSetupConfig;
  cloud: CloudSetup;
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  cloudConnectorsFeatureEnabled: boolean;
}) => {
  const providerConfig = config.providers[provider];
  const cloudConnectorEnabledVersion = providerConfig.cloudConnectorEnabledVersion;
  const remoteRoleTemplate = getCloudConnectorRemoteRoleTemplate({
    input: getInputByType(newPolicy.inputs, providerConfig.type),
    cloud,
    packageInfo,
    templateName: config.policyTemplate,
    provider,
  });

  const showCloudConnectors =
    cloudConnectorsFeatureEnabled &&
    !!cloudConnectorEnabledVersion &&
    !!remoteRoleTemplate &&
    semverGte(packageInfo.version, cloudConnectorEnabledVersion);

  return {
    cloudConnectorEnabledVersion,
    remoteRoleTemplate,
    showCloudConnectors,
  };
};

const buildCloudSetupState = ({
  config,
  cloud,
  packageInfo,
  newPolicy,
  cloudConnectorsFeatureEnabled,
}: {
  config: CloudSetupConfig;
  cloud: CloudSetup;
  packageInfo: PackageInfo;
  newPolicy: NewPackagePolicy;
  cloudConnectorsFeatureEnabled: boolean;
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

  const {
    remoteRoleTemplate: awsCloudConnectorRemoteRoleTemplate,
    showCloudConnectors: isAwsCloudConnectorEnabled,
  } = getProviderCloudConnectorState({
    provider: AWS_PROVIDER,
    config,
    newPolicy,
    cloud,
    packageInfo,
    cloudConnectorsFeatureEnabled: cloud.isCloudEnabled || cloud.isServerlessEnabled,
  });

  const {
    remoteRoleTemplate: gcpCloudConnectorRemoteRoleTemplate,
    showCloudConnectors: isGcpCloudConnectorEnabled,
  } = getProviderCloudConnectorState({
    provider: GCP_PROVIDER,
    config,
    newPolicy,
    cloud,
    packageInfo,
    cloudConnectorsFeatureEnabled: false,
  });

  const {
    remoteRoleTemplate: azureCloudConnectorRemoteRoleTemplate,
    showCloudConnectors: isAzureCloudConnectorEnabled,
  } = getProviderCloudConnectorState({
    provider: AZURE_PROVIDER,
    config,
    newPolicy,
    cloud,
    packageInfo,
    cloudConnectorsFeatureEnabled: cloudConnectorsFeatureEnabled && cloud.isServerlessEnabled,
  });

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
    awsCloudConnectorRemoteRoleTemplate,
    isAwsCloudConnectorEnabled,
    azureEnabled: getProviderDetails(AZURE_PROVIDER).enabled,
    azureCloudConnectorRemoteRoleTemplate,
    isAzureCloudConnectorEnabled,
    azureManualFieldsEnabled: config.providers[AZURE_PROVIDER].manualFieldsEnabled,
    azureOrganizationEnabled: getProviderDetails(AZURE_PROVIDER).organizationEnabled,
    azureOverviewPath: getProviderDetails(AZURE_PROVIDER).overviewPath,
    azurePolicyType: getProviderDetails(AZURE_PROVIDER).policyType,
    gcpEnabled: getProviderDetails(GCP_PROVIDER).enabled,
    gcpOrganizationEnabled: getProviderDetails(GCP_PROVIDER).organizationEnabled,
    gcpCloudConnectorRemoteRoleTemplate,
    isGcpCloudConnectorEnabled,
    gcpOverviewPath: getProviderDetails(GCP_PROVIDER).overviewPath,
    gcpPolicyType: getProviderDetails(GCP_PROVIDER).policyType,
    shortName: config.shortName,
    templateInputOptions,
    templateName: config.policyTemplate,
    elasticStackId: getElasticStackId(cloud),
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
        cloud: context.cloud,
        newPolicy: context.packagePolicy,
        packageInfo: context.packageInfo,
        cloudConnectorsFeatureEnabled,
      }),
    [
      context.config,
      context.cloud,
      context.packagePolicy,
      context.packageInfo,
      cloudConnectorsFeatureEnabled,
    ]
  );
}
