/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
  PackagePolicyConfigRecord,
} from '@kbn/fleet-plugin/common';
import semver from 'semver';

import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type {
  AwsCloudConnectorVars,
  AzureCloudConnectorVars,
} from '@kbn/fleet-plugin/common/types';
import {
  ROLE_ARN_VAR_NAME,
  AZURE_TENANT_ID_VAR_NAME,
} from '@kbn/fleet-plugin/common/constants/cloud_connector';
import type {
  AwsCloudConnectorCredentials,
  AzureCloudConnectorCredentials,
  CloudConnectorCredentials,
  CloudProviders,
} from './types';
import {
  AWS_CLOUD_CONNECTOR_FIELD_NAMES,
  AZURE_CLOUD_CONNECTOR_FIELD_NAMES,
  CLOUD_FORMATION_TEMPLATE_URL_CLOUD_CONNECTORS,
  ARM_TEMPLATE_URL_CLOUD_CONNECTORS,
  CLOUD_CONNECTOR_ASSET_INVENTORY_REUSABLE_MIN_VERSION,
  CLOUD_CONNECTOR_CSPM_REUSABLE_MIN_VERSION,
  AWS_PROVIDER,
  AZURE_PROVIDER,
} from './constants';

export const isAwsCloudConnectorVars = (
  vars: AwsCloudConnectorVars | AzureCloudConnectorVars,
  provider: string
): vars is AwsCloudConnectorVars => {
  return ROLE_ARN_VAR_NAME in vars && provider === 'aws';
};

export function isAwsCredentials(
  credentials: CloudConnectorCredentials
): credentials is AwsCloudConnectorCredentials {
  return 'roleArn' in credentials;
}

export const isAzureCloudConnectorVars = (
  vars: AwsCloudConnectorVars | AzureCloudConnectorVars,
  provider: string
): vars is AzureCloudConnectorVars => {
  return AZURE_TENANT_ID_VAR_NAME in vars && provider === 'azure';
};

export function isAzureCredentials(
  credentials: CloudConnectorCredentials
): credentials is AzureCloudConnectorCredentials {
  return 'tenantId' in credentials;
}

export function hasValidNewConnectionCredentials(
  credentials: CloudConnectorCredentials,
  provider?: string
): boolean {
  if (!provider) return false;

  switch (provider) {
    case 'aws':
      return isAwsCredentials(credentials) && !!credentials.roleArn;
    case 'azure':
      return isAzureCredentials(credentials) && !!credentials.tenantId;
    default:
      return false;
  }
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
  if (!cloudId) return undefined;

  const base64Part = cloudId.split(':')[1];
  const decoded = atob(base64Part);
  const [, , kibanaComponentId] = decoded.split('$');

  return kibanaComponentId || undefined;
};

export const getTemplateUrlFromPackageInfo = (
  packageInfo: PackageInfo | undefined,
  integrationType: string,
  templateUrlFieldName: string
): string | undefined => {
  if (!packageInfo?.policy_templates) return undefined;

  const policyTemplate = packageInfo.policy_templates.find((p) => p.name === integrationType);
  if (!policyTemplate) return undefined;

  if ('inputs' in policyTemplate) {
    const cloudFormationTemplate = policyTemplate.inputs?.reduce((acc, input): string => {
      if (!input.vars) return acc;
      const template = input.vars.find((v) => v.name === templateUrlFieldName)?.default;
      return template ? String(template) : acc;
    }, '');
    return cloudFormationTemplate !== '' ? cloudFormationTemplate : undefined;
  }
};

type CloudSetupForCloudConnector = Pick<
  CloudSetup,
  | 'isCloudEnabled'
  | 'cloudId'
  | 'cloudHost'
  | 'deploymentUrl'
  | 'serverless'
  | 'isServerlessEnabled'
>;

export const getElasticStackId = (cloud?: CloudSetupForCloudConnector): string | undefined => {
  if (!cloud) return undefined;

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
interface GetCloudConnectorRemoteRoleTemplateParams {
  input: NewPackagePolicyInput;
  cloud: CloudSetupForCloudConnector;
  packageInfo: PackageInfo;
  templateName: string;
  provider: CloudProviders;
}

export const getCloudConnectorRemoteRoleTemplate = ({
  input,
  cloud,
  packageInfo,
  templateName,
  provider,
}: GetCloudConnectorRemoteRoleTemplateParams): string | undefined => {
  const accountTypeField = Object.keys(input?.streams?.[0]?.vars || {}).find((key) =>
    key.includes('account_type')
  );
  const TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR = 'ACCOUNT_TYPE';
  const TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR = 'RESOURCE_ID';

  const accountType = input?.streams?.[0]?.vars?.[accountTypeField || '']?.value;

  if (!accountType) return undefined;

  const hostProvider = getCloudProviderFromCloudHost(cloud?.cloudHost);
  if (!hostProvider || (provider === 'aws' && hostProvider !== provider)) return undefined;

  const elasticStackId = getElasticStackId(cloud);

  if (!elasticStackId) return undefined;

  const templateUrlFieldName =
    provider === AWS_PROVIDER
      ? CLOUD_FORMATION_TEMPLATE_URL_CLOUD_CONNECTORS
      : provider === AZURE_PROVIDER
      ? ARM_TEMPLATE_URL_CLOUD_CONNECTORS
      : undefined;

  if (templateUrlFieldName) {
    return getTemplateUrlFromPackageInfo(packageInfo, templateName, templateUrlFieldName)
      ?.replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType)
      ?.replace(TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR, elasticStackId);
  }

  return undefined;
};

/**
 * Update AWS cloud connector credentials in package policy
 */
export const updatePolicyWithAwsCloudConnectorCredentials = (
  packagePolicy: NewPackagePolicy,
  input: NewPackagePolicyInput,
  credentials: Record<string, string | undefined>
): NewPackagePolicy => {
  if (!credentials) return packagePolicy;

  const updatedPolicy = { ...packagePolicy };

  if (!updatedPolicy.inputs) {
    updatedPolicy.inputs = [];
  }

  if (!input.streams[0].vars) return updatedPolicy;

  const updatedVars = { ...input.streams[0].vars };

  // Update role_arn
  if (credentials[AWS_CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN]) {
    updatedVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN].value =
      credentials[AWS_CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN];
  }
  // Update external_id
  if (credentials[AWS_CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID]) {
    updatedVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID].value =
      credentials[AWS_CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID];
  }
  // Update aws.role_arn
  if (credentials[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN]) {
    updatedVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN].value =
      credentials[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN];
  }
  // Update aws.credentials.external_id
  if (credentials[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID]) {
    updatedVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID].value =
      credentials[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID];
  }

  updatedPolicy.inputs = [
    ...updatedPolicy.inputs
      .map((i) => {
        if (i.enabled && i.streams[0].enabled) {
          return {
            ...i,
            streams: i.streams.map((s) => {
              if (s.enabled) {
                return {
                  ...s,
                  vars: updatedVars,
                };
              }
              return s; // Return the original stream if not enabled
            }),
          };
        }
        return i; // Return the original input if not enabled
      })
      .filter(Boolean), // Filter out undefined values
  ];

  return updatedPolicy;
};

/**
 * Updates input variables with AWS credentials
 * @param inputVars - The original input variables
 * @param credentials - The AWS credentials to apply
 * @returns Updated input variables with AWS credentials applied
 */
export const updateInputVarsWithAwsCredentials = (
  inputVars: PackagePolicyConfigRecord | undefined,
  credentials: AwsCloudConnectorCredentials | undefined
): PackagePolicyConfigRecord | undefined => {
  if (!inputVars || !credentials) return inputVars;

  const updatedInputVars: PackagePolicyConfigRecord = { ...inputVars };

  // Update role_arn fields
  if (credentials.roleArn !== undefined) {
    if (updatedInputVars.role_arn) {
      updatedInputVars.role_arn.value = credentials.roleArn;
    }
    if (updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN]) {
      updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN].value = credentials.roleArn;
    }
  } else {
    // Clear role_arn fields when roleArn is undefined
    if (updatedInputVars.role_arn) {
      updatedInputVars.role_arn = { value: undefined };
    }
    if (updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN]) {
      updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN] = { value: undefined };
    }
  }

  // Update external_id fields
  if (credentials.externalId !== undefined) {
    if (updatedInputVars.external_id) {
      updatedInputVars.external_id = { value: credentials.externalId };
    }
    if (updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID]) {
      updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID] = {
        value: credentials.externalId,
      };
    }
  } else {
    // Clear external_id fields when externalId is undefined
    if (updatedInputVars.external_id) {
      updatedInputVars.external_id = { value: undefined };
    }
    if (updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID]) {
      updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID] = { value: undefined };
    }
  }

  return updatedInputVars;
};

/**
 * Updates input variables with Azure credentials
 * @param inputVars - The original input variables
 * @param credentials - The Azure credentials to apply
 * @returns Updated input variables with Azure credentials applied
 */
export const updateInputVarsWithAzureCredentials = (
  inputVars: PackagePolicyConfigRecord | undefined,
  credentials: AzureCloudConnectorCredentials | undefined
): PackagePolicyConfigRecord | undefined => {
  if (!inputVars || !credentials) return inputVars;

  const updatedInputVars: PackagePolicyConfigRecord = { ...inputVars };

  // Update Azure-specific fields
  if (credentials.tenantId !== undefined) {
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID].value = credentials.tenantId;
    } else {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID] = {
        value: credentials.tenantId,
      };
    }
  } else {
    // Clear tenant_id field when tenantId is undefined
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID] = { value: undefined };
    }
  }

  if (credentials.clientId !== undefined) {
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID].value = credentials.clientId;
    } else {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID] = {
        value: credentials.clientId,
      };
    }
  } else {
    // Clear client_id field when clientId is undefined
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID] = { value: undefined };
    }
  }

  if (credentials.azure_credentials_cloud_connector_id !== undefined) {
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID]) {
      updatedInputVars[
        AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID
      ].value = credentials.azure_credentials_cloud_connector_id;
    } else {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID] = {
        value: credentials.azure_credentials_cloud_connector_id,
      };
    }
  } else {
    // Clear azure_credentials_cloud_connector_id field when azure_credentials_cloud_connector_id is undefined
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID] = {
        value: undefined,
      };
    }
  }

  return updatedInputVars;
};

/**
 * Updates input variables with current credentials
 * @param inputVars - The original input variables
 * @param credentials - The current credentials to apply
 * @returns Updated input variables with credentials applied
 */
export const updateInputVarsWithCredentials = (
  inputVars: PackagePolicyConfigRecord | undefined,
  credentials: CloudConnectorCredentials | undefined
): PackagePolicyConfigRecord | undefined => {
  if (!inputVars || !credentials) return inputVars;

  if (isAwsCredentials(credentials)) {
    return updateInputVarsWithAwsCredentials(inputVars, credentials);
  }

  if (isAzureCredentials(credentials)) {
    return updateInputVarsWithAzureCredentials(inputVars, credentials);
  }

  return inputVars;
};

/**
 * Updates policy inputs with new variables
 * @param updatedPolicy - The policy to update
 * @param inputVars - The variables to apply to the policy
 * @returns Updated policy with new inputs
 */
export const updatePolicyInputs = (
  updatedPolicy: NewPackagePolicy,
  inputVars: PackagePolicyConfigRecord
): NewPackagePolicy => {
  if (!updatedPolicy.inputs || updatedPolicy.inputs.length === 0 || !inputVars) {
    return updatedPolicy;
  }

  const updatedInputs = updatedPolicy.inputs.map((policyInput) => {
    if (policyInput.enabled && policyInput.streams && policyInput.streams.length > 0) {
      const updatedStreams = policyInput.streams.map((stream) => {
        if (stream.enabled) {
          return {
            ...stream,
            vars: inputVars,
          };
        }
        return stream;
      });

      return {
        ...policyInput,
        streams: updatedStreams,
      };
    }
    return policyInput;
  });

  return {
    ...updatedPolicy,
    inputs: updatedInputs,
  };
};

export const isCloudConnectorReusableEnabled = (
  packageInfoVersion: string,
  templateName: string
) => {
  if (templateName === 'cspm') {
    return semver.gte(packageInfoVersion, CLOUD_CONNECTOR_CSPM_REUSABLE_MIN_VERSION);
  }

  if (templateName === 'asset_inventory') {
    return semver.gte(packageInfoVersion, CLOUD_CONNECTOR_ASSET_INVENTORY_REUSABLE_MIN_VERSION);
  }
  return false;
};
