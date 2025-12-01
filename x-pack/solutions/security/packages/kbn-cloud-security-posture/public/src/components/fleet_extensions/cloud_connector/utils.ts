/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  NewPackagePolicyInputStream,
  PackageInfo,
  PackagePolicyConfigRecord,
} from '@kbn/fleet-plugin/common';
import semver from 'semver';

import type {
  AwsCloudConnectorVars,
  AzureCloudConnectorVars,
  CloudConnectorVars,
} from '@kbn/fleet-plugin/common/types';
import type {
  AwsCloudConnectorCredentials,
  AzureCloudConnectorCredentials,
  CloudConnectorCredentials,
  CloudProviders,
  GetCloudConnectorRemoteRoleTemplateParams,
} from './types';
import {
  AWS_CLOUD_CONNECTOR_FIELD_NAMES,
  AZURE_CLOUD_CONNECTOR_FIELD_NAMES,
  CLOUD_FORMATION_TEMPLATE_URL_CLOUD_CONNECTORS,
  ARM_TEMPLATE_URL_CLOUD_CONNECTORS,
  CLOUD_CONNECTOR_AWS_ASSET_INVENTORY_REUSABLE_MIN_VERSION,
  CLOUD_CONNECTOR_AWS_CSPM_REUSABLE_MIN_VERSION,
  CLOUD_CONNECTOR_AZURE_CSPM_REUSABLE_MIN_VERSION,
  CLOUD_CONNECTOR_AZURE_ASSET_INVENTORY_REUSABLE_MIN_VERSION,
  AWS_PROVIDER,
  AZURE_PROVIDER,
  AWS_SINGLE_ACCOUNT,
  AZURE_SINGLE_ACCOUNT,
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
  TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR,
  AZURE_ACCOUNT_TYPE_INPUT_VAR_NAME,
  AWS_ACCOUNT_TYPE_INPUT_VAR_NAME,
} from './constants';

export type AzureCloudConnectorFieldNames =
  (typeof AZURE_CLOUD_CONNECTOR_FIELD_NAMES)[keyof typeof AZURE_CLOUD_CONNECTOR_FIELD_NAMES];

export type AwsCloudConnectorFieldNames =
  (typeof AWS_CLOUD_CONNECTOR_FIELD_NAMES)[keyof typeof AWS_CLOUD_CONNECTOR_FIELD_NAMES];

export const isAwsCloudConnectorVars = (
  vars: CloudConnectorVars,
  provider: string
): vars is AwsCloudConnectorVars => {
  return (
    (AWS_CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN in vars ||
      AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN in vars) &&
    provider === AWS_PROVIDER
  );
};

export function isAwsCredentials(
  credentials: CloudConnectorCredentials
): credentials is AwsCloudConnectorCredentials {
  return 'roleArn' in credentials;
}

export const isAzureCloudConnectorVars = (
  vars: CloudConnectorVars | PackagePolicyConfigRecord,
  provider: string
): vars is AzureCloudConnectorVars => {
  return (
    (AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID in vars ||
      AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID in vars) &&
    provider === AZURE_PROVIDER
  );
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
    case AWS_PROVIDER:
      return isAwsCredentials(credentials) && !!credentials.roleArn;
    case AZURE_PROVIDER:
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

export const getDeploymentIdFromUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  const match = url.match(/\/deployments\/([^/?#]+)/);
  return match?.[1];
};

export const getKibanaComponentId = (cloudId: string | undefined): string | undefined => {
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

const getAccountTypeFromInput = (
  input: NewPackagePolicyInput,
  provider: CloudProviders
): string | undefined => {
  switch (provider) {
    case AWS_PROVIDER:
      return (
        input?.streams?.[0]?.vars?.[AWS_ACCOUNT_TYPE_INPUT_VAR_NAME]?.value ?? AWS_SINGLE_ACCOUNT
      );
    case AZURE_PROVIDER:
      return (
        input?.streams?.[0]?.vars?.[AZURE_ACCOUNT_TYPE_INPUT_VAR_NAME]?.value ??
        AZURE_SINGLE_ACCOUNT
      );
  }
  return undefined;
};

const getTemplateFieldNameByProvider = (provider: CloudProviders): string | undefined => {
  switch (provider) {
    case AWS_PROVIDER:
      return CLOUD_FORMATION_TEMPLATE_URL_CLOUD_CONNECTORS;
    case AZURE_PROVIDER:
      return ARM_TEMPLATE_URL_CLOUD_CONNECTORS;
    default:
      return undefined;
  }
};

export const getCloudConnectorRemoteRoleTemplate = ({
  input,
  cloud,
  packageInfo,
  templateName,
  provider,
}: GetCloudConnectorRemoteRoleTemplateParams): string | undefined => {
  let elasticResourceId: string | undefined;
  const accountType = getAccountTypeFromInput(input, provider);

  const hostProvider = getCloudProviderFromCloudHost(cloud?.cloudHost);

  if (!hostProvider || (provider === AWS_PROVIDER && hostProvider !== provider)) return undefined;

  const deploymentId = getDeploymentIdFromUrl(cloud?.deploymentUrl);
  const kibanaComponentId = getKibanaComponentId(cloud?.cloudId);
  const templateUrlFieldName = getTemplateFieldNameByProvider(provider);

  if (cloud?.isServerlessEnabled && cloud?.serverless?.projectId) {
    elasticResourceId = cloud.serverless.projectId;
  }

  if (cloud?.isCloudEnabled && deploymentId && kibanaComponentId) {
    elasticResourceId = kibanaComponentId;
  }

  if (!elasticResourceId || !templateUrlFieldName || !accountType) return undefined;

  return getTemplateUrlFromPackageInfo(packageInfo, templateName, templateUrlFieldName)
    ?.replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType)
    ?.replace(TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR, elasticResourceId);
};

/**
 * Helper function to update policy inputs with new variables
 * @param policy - The package policy to update
 * @param updatedVars - The updated variables to apply
 * @returns Updated policy with new input variables
 */
const updatePolicyInputsWithVars = (
  policy: NewPackagePolicy,
  updatedVars: PackagePolicyConfigRecord
): NewPackagePolicy => {
  // Create a deep copy to avoid circular references
  const updatedPolicy: NewPackagePolicy = {
    ...policy,
    inputs: policy.inputs
      .map((input: NewPackagePolicyInput) => {
        if (input.enabled && input.streams[0]?.enabled) {
          return {
            ...input,
            streams: input.streams.map((stream: NewPackagePolicyInputStream) => {
              if (stream.enabled) {
                return {
                  ...stream,
                  vars: { ...updatedVars }, // Create a shallow copy instead of referencing directly
                };
              }
              return { ...stream }; // Return a copy of the original stream if not enabled
            }),
          };
        }
        return { ...input }; // Return a copy of the original input if not enabled
      })
      .filter(Boolean), // Filter out undefined values
  };

  return updatedPolicy;
};

/**
 * Update AWS cloud connector credentials in package policy
 */
export const updatePolicyWithAwsCloudConnectorCredentials = (
  packagePolicy: NewPackagePolicy,
  input: NewPackagePolicyInput,
  inputCredentials: Partial<Record<AwsCloudConnectorFieldNames, string | undefined>>
): NewPackagePolicy => {
  if (!inputCredentials) return packagePolicy;

  const updatedPolicy = { ...packagePolicy };

  if (!updatedPolicy.inputs) {
    updatedPolicy.inputs = [];
  }

  if (!input.streams[0].vars) return updatedPolicy;

  const updatedVars = { ...input.streams[0].vars };

  // Update role_arn if it exists in inputCredentials
  if (inputCredentials.role_arn) {
    updatedVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN].value = inputCredentials.role_arn;
  }
  // Update external_id if it exists in inputCredentials
  if (inputCredentials.external_id) {
    updatedVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID].value = inputCredentials.external_id;
  }
  // Update aws.role_arn if it exists in inputCredentials
  if (inputCredentials[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN]) {
    updatedVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN].value =
      inputCredentials[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN];
  }
  // Update aws.credentials.external_id if it exists in inputCredentials
  if (inputCredentials[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID]) {
    updatedVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID].value =
      inputCredentials[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID];
  }

  return updatePolicyInputsWithVars(updatedPolicy, updatedVars);
};

/**
 * Updates input variables with Aazure credentials
 * @param inputVars - The original input variables
 * @param inputCredentials - The Azure credentials to apply
 * @returns Updated input variables with Azure credentials applied
 */
export const updatePolicyWithAzureCloudConnectorCredentials = (
  packagePolicy: NewPackagePolicy,
  input: NewPackagePolicyInput,
  inputCredentials: Partial<Record<AzureCloudConnectorFieldNames, string | undefined>>
): NewPackagePolicy => {
  if (!inputCredentials) return packagePolicy;

  const updatedPolicy = { ...packagePolicy };

  if (!updatedPolicy.inputs || !updatedPolicy.inputs[0]) {
    return updatedPolicy;
  }

  if (!input.streams || !input.streams[0].vars) return updatedPolicy;

  const updatedVars = { ...input.streams[0].vars };

  // Update tenant_id if it exists in inputCredentials
  if (inputCredentials.tenant_id) {
    updatedVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID].value = inputCredentials.tenant_id;
  }

  // Update client_id if it exists in inputCredentials
  if (inputCredentials.client_id) {
    updatedVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID].value = inputCredentials.client_id;
  }

  // Update azure.credentials.tenant_id if exists in inputCredentials
  if (inputCredentials[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID]) {
    updatedVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID].value =
      inputCredentials[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID];
  }

  // Update azure.credentials.client_id if exists in inputCredentials
  if (inputCredentials[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID]) {
    updatedVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID].value =
      inputCredentials[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID];
  }

  // Update azure_credentials_cloud_connector_id if exists in inputCredentials
  if (inputCredentials.azure_credentials_cloud_connector_id) {
    updatedVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID].value =
      inputCredentials[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID];
  }

  return updatePolicyInputsWithVars(updatedPolicy, updatedVars);
};

/**
 * Updates input variables with AWS credentials
 * @param inputVars - The original input variables
 * @param inputCredentials - The AWS credentials to apply
 * @returns Updated input variables with AWS credentials applied
 */
export const updateInputVarsWithAwsCredentials = (
  inputVars: PackagePolicyConfigRecord | undefined,
  inputCredentials: AwsCloudConnectorCredentials | undefined
): PackagePolicyConfigRecord | undefined => {
  if (!inputVars) return inputVars;

  // Use spread operator - it works fine as long as we don't mutate nested objects
  const updatedInputVars: PackagePolicyConfigRecord = { ...inputVars };

  // Update role_arn fields - always create new objects instead of mutating
  if (inputCredentials?.roleArn !== undefined) {
    if (updatedInputVars.role_arn) {
      updatedInputVars.role_arn = {
        ...updatedInputVars.role_arn,
        value: inputCredentials.roleArn,
      };
    }
    if (updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN]) {
      updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN] = {
        ...updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN],
        value: inputCredentials.roleArn,
      };
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
  if (inputCredentials?.externalId !== undefined) {
    if (updatedInputVars.external_id) {
      updatedInputVars.external_id = { value: inputCredentials.externalId };
    }
    if (updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID]) {
      updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID] = {
        value: inputCredentials.externalId,
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
  if (!inputVars) return inputVars;

  // Use spread operator but ensure we create new objects for nested properties
  const updatedInputVars: PackagePolicyConfigRecord = { ...inputVars };

  // Update Azure-specific fields - always create new objects instead of mutating
  if (credentials?.tenantId !== undefined) {
    // Update tenant_id if it exists
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID] = {
        ...updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID],
        value: credentials.tenantId,
      };
    }
    // Update azure.credentials.tenant_id if it exists
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID] = {
        ...updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID],
        value: credentials.tenantId,
      };
    }
  } else {
    // Clear tenant_id field when tenantId is undefined - clear BOTH possible field variations
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID] = { value: undefined };
    }
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID] = { value: undefined };
    }
  }

  if (credentials?.clientId !== undefined) {
    // Update client_id if it exists
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID] = {
        ...updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID],
        value: credentials.clientId,
      };
    }
    // Update azure.credentials.client_id if it exists
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID] = {
        ...updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID],
        value: credentials.clientId,
      };
    }
  } else {
    // Clear client_id field when clientId is undefined - clear BOTH possible field variations
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID] = { value: undefined };
    }
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID] = { value: undefined };
    }
  }

  if (credentials?.azure_credentials_cloud_connector_id !== undefined) {
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID] = {
        ...updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID],
        value: credentials.azure_credentials_cloud_connector_id,
      };
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
  if (!inputVars) return inputVars;

  // If credentials is undefined, clear all credential fields (both AWS and Azure)
  if (!credentials) {
    let clearedVars = updateInputVarsWithAwsCredentials(inputVars, undefined);
    clearedVars = updateInputVarsWithAzureCredentials(clearedVars, undefined);
    return clearedVars;
  }

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
  provider: string,
  packageInfoVersion: string,
  templateName: string
) => {
  if (provider === AWS_PROVIDER) {
    if (templateName === 'cspm') {
      return semver.gte(packageInfoVersion, CLOUD_CONNECTOR_AWS_CSPM_REUSABLE_MIN_VERSION);
    }
    if (templateName === 'asset_inventory') {
      return semver.gte(
        packageInfoVersion,
        CLOUD_CONNECTOR_AWS_ASSET_INVENTORY_REUSABLE_MIN_VERSION
      );
    }
  } else if (provider === AZURE_PROVIDER) {
    if (templateName === 'cspm') {
      return semver.gte(packageInfoVersion, CLOUD_CONNECTOR_AZURE_CSPM_REUSABLE_MIN_VERSION);
    }
    if (templateName === 'asset_inventory') {
      return semver.gte(
        packageInfoVersion,
        CLOUD_CONNECTOR_AZURE_ASSET_INVENTORY_REUSABLE_MIN_VERSION
      );
    }
  }
  return false;
};
