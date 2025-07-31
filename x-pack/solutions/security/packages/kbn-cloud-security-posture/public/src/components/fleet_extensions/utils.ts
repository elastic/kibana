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
  PackagePolicyConfigRecordEntry,
  RegistryPolicyTemplate,
  RegistryVarsEntry,
} from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { CSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common/constants';
import { merge } from 'lodash';
import semverValid from 'semver/functions/valid';
import semverCoerce from 'semver/functions/coerce';
import semverLt from 'semver/functions/lt';
import { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import { getFlattenedObject } from '@kbn/std';
import {
  SUPPORTED_CLOUDBEAT_INPUTS,
  SUPPORTED_POLICY_TEMPLATES,
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
  TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR,
  SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS,
  CLOUD_SECURITY_POSTURE_INTEGRATIONS,
  CLOUDBEAT_AWS,
  CLOUDBEAT_AZURE,
  CLOUDBEAT_GCP,
  AWS_SINGLE_ACCOUNT,
  AWS_CREDENTIALS_TYPE,
  AZURE_CREDENTIALS_TYPE,
  GCP_CREDENTIALS_TYPE,
} from './constants';
import type {
  PostureInput,
  CloudSecurityPolicyTemplate,
  CredentialsType,
  NewPackagePolicyPostureInput,
  GetAwsCredentialTypeConfigParams,
  GetCloudConnectorRemoteRoleTemplateParams,
} from './types';
import { getCloudDefaultAwsCredentialConfig } from './aws_credentials_form/aws_utils';
import { getDefaultAzureCredentialsType } from './azure_credentials_form/azure_utils';
import { getDefaultGcpHiddenVars } from './gcp_credentials_form/gcp_utils';

export const isPostureInput = (
  input: NewPackagePolicyInput
): input is NewPackagePolicyPostureInput =>
  SUPPORTED_POLICY_TEMPLATES.includes(input.policy_template as CloudSecurityPolicyTemplate) &&
  SUPPORTED_CLOUDBEAT_INPUTS.includes(input.type as PostureInput);

const getPostureType = (policyTemplateInput: PostureInput) => {
  switch (policyTemplateInput) {
    case CLOUDBEAT_AWS:
    case CLOUDBEAT_AZURE:
    case CLOUDBEAT_GCP:
      return 'cspm';
    default:
      return 'n/a';
  }
};

const getDeploymentType = (policyTemplateInput: PostureInput) => {
  switch (policyTemplateInput) {
    case CLOUDBEAT_AWS:
      return 'aws';
    case CLOUDBEAT_AZURE:
      return 'azure';
    case CLOUDBEAT_GCP:
      return 'gcp';
    default:
      return 'n/a';
  }
};

const getPostureInput = (
  input: NewPackagePolicyInput,
  inputType: PostureInput,
  inputVars?: Record<string, PackagePolicyConfigRecordEntry>
) => {
  const isInputEnabled = input.type === inputType;

  return {
    ...input,
    enabled: isInputEnabled,
    streams: input.streams.map((stream) => ({
      ...stream,
      enabled: isInputEnabled,
      // Merge new vars with existing vars
      ...(isInputEnabled &&
        inputVars && {
          vars: {
            ...stream.vars,
            ...inputVars,
          },
        }),
    })),
  };
};

/**
 * Get a new object with the updated policy input and vars
 */
export const getPosturePolicy = (
  newPolicy: NewPackagePolicy,
  inputType: PostureInput,
  inputVars?: Record<string, PackagePolicyConfigRecordEntry>
): NewPackagePolicy => ({
  ...newPolicy,
  namespace: newPolicy.namespace,
  // Enable new policy input and disable all others
  inputs: newPolicy.inputs.map((item) => getPostureInput(item, inputType, inputVars)),
  // Set hidden policy vars
  vars: merge({}, newPolicy.vars, {
    deployment: { value: getDeploymentType(inputType) },
    posture: { value: getPostureType(inputType) },
  }),
});

type RegistryPolicyTemplateWithInputs = RegistryPolicyTemplate & {
  inputs: Array<{
    vars?: RegistryVarsEntry[];
  }>;
};
// type guard for checking inputs
export const hasPolicyTemplateInputs = (
  policyTemplate: RegistryPolicyTemplate
): policyTemplate is RegistryPolicyTemplateWithInputs => {
  return Object.hasOwn(policyTemplate, 'inputs');
};

export const getDefaultCloudCredentialsType = (
  isAgentless: boolean,
  inputType: Extract<
    PostureInput,
    'cloudbeat/cis_aws' | 'cloudbeat/cis_azure' | 'cloudbeat/cis_gcp'
  >,
  packageInfo: PackageInfo,
  showCloudConnectors: boolean
) => {
  const credentialsTypes: Record<
    Extract<PostureInput, 'cloudbeat/cis_aws' | 'cloudbeat/cis_azure' | 'cloudbeat/cis_gcp'>,
    {
      [key: string]: {
        value: string | boolean;
        type: 'text' | 'bool';
      };
    }
  > = {
    'cloudbeat/cis_aws': getCloudDefaultAwsCredentialConfig({
      isAgentless,
      showCloudConnectors,
      packageInfo,
    }),
    'cloudbeat/cis_gcp': {
      'gcp.credentials.type': {
        value: isAgentless
          ? GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON
          : GCP_CREDENTIALS_TYPE.CREDENTIALS_NONE,
        type: 'text',
      },
    },
    'cloudbeat/cis_azure': {
      'azure.credentials.type': {
        value: isAgentless
          ? AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET
          : AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
        type: 'text',
      },
    },
  };

  return credentialsTypes[inputType];
};

/**
 * Input vars that are hidden from the user
 */
export const getPostureInputHiddenVars = (
  inputType: PostureInput,
  packageInfo: PackageInfo,
  setupTechnology: SetupTechnology,
  showCloudConnectors: boolean
): Record<string, PackagePolicyConfigRecordEntry> | undefined => {
  switch (inputType) {
    case 'cloudbeat/cis_aws':
      return getCloudDefaultAwsCredentialConfig({
        isAgentless: setupTechnology === SetupTechnology.AGENTLESS,
        packageInfo,
        showCloudConnectors,
      });
    case 'cloudbeat/cis_azure':
      return {
        'azure.credentials.type': {
          value: getDefaultAzureCredentialsType(packageInfo, setupTechnology),
          type: 'text',
        },
      };
    case 'cloudbeat/cis_gcp':
      return getDefaultGcpHiddenVars(packageInfo, setupTechnology);
    default:
      return undefined;
  }
};

export const getPolicyTemplateInputOptions = (policyTemplate: CloudSecurityPolicyTemplate) =>
  CLOUD_SECURITY_POSTURE_INTEGRATIONS[policyTemplate].options.map((o) => ({
    tooltip: o.tooltip,
    value: o.type,
    id: o.type,
    label: o.name,
    icon: o.icon,
    disabled: o.disabled,
    isBeta: o.isBeta,
    testId: o.testId,
  }));

export const getMaxPackageName = (
  packageName: string,
  packagePolicies?: Array<{ name: string }>
) => {
  const pkgPoliciesNamePattern = new RegExp(`${packageName}-(\\d+)`);

  const numbers = (packagePolicies ?? [])
    .map((ds) => {
      const match = ds.name.match(pkgPoliciesNamePattern);
      return match ? parseInt(match[1], 10) : undefined;
    })
    .filter((num): num is number => num !== undefined);

  const maxPkgPolicyName = numbers.length > 0 ? Math.max(...numbers) : 0;

  return `${packageName}-${maxPkgPolicyName + 1}`;
};

export const getCspmCloudShellDefaultValue = (packageInfo: PackageInfo): string => {
  if (!packageInfo.policy_templates) return '';

  const policyTemplate = packageInfo.policy_templates.find((p) => p.name === CSPM_POLICY_TEMPLATE);
  if (!policyTemplate) return '';

  const policyTemplateInputs = hasPolicyTemplateInputs(policyTemplate) && policyTemplate.inputs;

  if (!policyTemplateInputs) return '';

  const cloudShellUrl = policyTemplateInputs.reduce((acc, input): string => {
    if (!input.vars) return acc;
    const template = input.vars.find((v) => v.name === 'cloud_shell_url')?.default;
    return template ? String(template) : acc;
  }, '');

  return cloudShellUrl;
};

export const isBelowMinVersion = (version: string, minVersion: string) => {
  const semanticVersion = semverValid(version);
  const versionNumberOnly = semverCoerce(semanticVersion) || '';
  return semverLt(versionNumberOnly, minVersion);
};

/**
 * Searches for a variable definition in a given packageInfo object based on a specified key.
 * It navigates through nested arrays within the packageInfo object to locate the variable definition associated with the provided key.
 * If found, it returns the variable definition object; otherwise, it returns undefined.
 */
export const findVariableDef = (packageInfo: PackageInfo, key: string) => {
  return packageInfo?.data_streams
    ?.filter((datastreams) => datastreams !== undefined)
    .map((ds) => ds.streams)
    .filter((streams) => streams !== undefined)
    .flat()
    .filter((streams) => streams?.vars !== undefined)
    .map((cis) => cis?.vars)
    .flat()
    .find((vars) => vars?.name === key);
};

export const fieldIsInvalid = (value: string | undefined, hasInvalidRequiredVars: boolean) =>
  hasInvalidRequiredVars && !value;

export const POLICY_TEMPLATE_FORM_DTS = {
  LOADER: 'policy-template-form-loader',
};

export const hasErrors = (validationResults: PackagePolicyValidationResults | undefined) => {
  if (!validationResults) return 0;

  const flattenedValidation = getFlattenedObject(validationResults);
  const errors = Object.values(flattenedValidation).filter((value) => Boolean(value)) || [];
  return errors.length;
};

export const isCloudProviderInput = (type: string): boolean => {
  // TODO: ADD azure, gcp when cloud connector is  available on providers
  const providers = ['aws'];
  return providers.some((provider) => type.includes(provider));
};

export const isCloudConnectorsEnabled = (
  credentialsType: CredentialsType | undefined,
  isAgentless: boolean
) => {
  if (!credentialsType || !isAgentless) {
    return false;
  }
  return isAgentless && credentialsType === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS;
};

export const getCloudProviderFromCloudHost = (
  cloudHost: string | undefined
): string | undefined => {
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

export const getCloudConnectorRemoteRoleTemplate = ({
  input,
  cloud,
  packageInfo,
}: GetCloudConnectorRemoteRoleTemplateParams): string | undefined => {
  let elasticResourceId: string | undefined;
  const accountType = input?.streams?.[0]?.vars?.['aws.account_type']?.value ?? AWS_SINGLE_ACCOUNT;

  const provider = getCloudProviderFromCloudHost(cloud?.cloudHost);

  if (!provider || provider !== 'aws') return undefined;

  const deploymentId = getDeploymentIdFromUrl(cloud?.deploymentUrl);

  const kibanaComponentId = getKibanaComponentId(cloud?.cloudId);

  if (cloud?.isServerlessEnabled && cloud?.serverless?.projectId) {
    elasticResourceId = cloud.serverless.projectId;
  }

  if (cloud?.isCloudEnabled && deploymentId && kibanaComponentId) {
    elasticResourceId = kibanaComponentId;
  }

  if (!elasticResourceId) return undefined;

  return getTemplateUrlFromPackageInfo(
    packageInfo,
    input.policy_template,
    SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.CLOUD_FORMATION_CLOUD_CONNECTORS
  )
    ?.replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType)
    ?.replace(TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR, elasticResourceId);
};

export const getCloudProvider = (type: string): string | undefined => {
  if (type.includes('aws')) return 'aws';
  if (type.includes('azure')) return 'azure';
  if (type.includes('gcp')) return 'gcp';
  return undefined;
};

export const getCloudCredentialVarsConfig = ({
  setupTechnology,
  optionId,
  showCloudConnectors,
  inputType,
}: GetAwsCredentialTypeConfigParams): Record<string, PackagePolicyConfigRecordEntry> => {
  const supportsCloudConnector =
    setupTechnology === SetupTechnology.AGENTLESS &&
    optionId === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS &&
    showCloudConnectors;

  const credentialType = `${getCloudProvider(inputType)}.credentials.type`;
  const supportCloudConnectors = `${getCloudProvider(inputType)}.supports_cloud_connectors`;

  if (showCloudConnectors) {
    return {
      [credentialType]: { value: optionId },
      [supportCloudConnectors]: { value: supportsCloudConnector },
    };
  }

  return {
    [credentialType]: { value: optionId },
  };
};
