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
import type { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import { getFlattenedObject } from '@kbn/std';
import { i18n } from '@kbn/i18n';
import { AWS_SINGLE_ACCOUNT } from '@kbn/cloud-security-posture-common';
import {
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
  TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR,
  SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS,
  AWS_CREDENTIALS_TYPE,
  AZURE_CREDENTIALS_TYPE,
  GCP_CREDENTIALS_TYPE,
  AWS_PROVIDER,
  GCP_PROVIDER,
  AZURE_PROVIDER,
  DEFAULT_AWS_CREDENTIALS_TYPE,
  DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE,
  DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE,
  DEFAULT_AGENTLESS_CLOUD_CONNECTORS_AWS_CREDENTIALS_TYPE,
} from './constants';
import type {
  AwsCredentialsType,
  CloudProviders,
  GcpCredentialsType,
  GcpFields,
  GcpInputFields,
  GetAwsCredentialTypeConfigParams,
  GetCloudConnectorRemoteRoleTemplateParams,
} from './types';

const buildPolicyInput = (
  input: NewPackagePolicyInput,
  selectedPolicyType: string,
  inputVars?: Record<string, PackagePolicyConfigRecordEntry>
) => {
  const isInputEnabled = input.type === selectedPolicyType;

  const newInput = {
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

  return newInput;
};

/**
 * Get a new object with the updated policy input and vars
 */
export const updatePolicyWithInputs = (
  newPolicy: NewPackagePolicy,
  selectedPolicyType?: string,
  inputVars?: Record<string, PackagePolicyConfigRecordEntry>
): NewPackagePolicy => {
  if (!selectedPolicyType) {
    return newPolicy;
  }
  const inputs = newPolicy.inputs.map((item) =>
    buildPolicyInput(item, selectedPolicyType, inputVars)
  );
  return {
    ...newPolicy,
    namespace: newPolicy.namespace,
    // Enable new policy input and disable all others
    inputs,
  };
};

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

export const getDefaultAwsCredentialsType = (
  packageInfo: PackageInfo,
  showCloudConnectors: boolean,
  templateName: string,
  setupTechnology?: SetupTechnology
): AwsCredentialsType => {
  if (setupTechnology && setupTechnology === SetupTechnology.AGENTLESS) {
    return showCloudConnectors
      ? AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS
      : AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS;
  }
  const hasCloudFormationTemplate = !!getCloudFormationDefaultValue(packageInfo, templateName);

  if (hasCloudFormationTemplate) {
    return AWS_CREDENTIALS_TYPE.CLOUD_FORMATION;
  }

  return DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE;
};

export const getAwsCredentialsType = (
  input: NewPackagePolicyInput
): AwsCredentialsType | undefined => input.streams[0].vars?.['aws.credentials.type'].value;

export const getCloudFormationDefaultValue = (
  packageInfo: PackageInfo,
  templateName: string
): string => {
  if (!packageInfo.policy_templates) return '';

  const policyTemplate = packageInfo.policy_templates.find((p) => p.name === templateName);
  if (!policyTemplate) return '';

  const policyTemplateInputs = hasPolicyTemplateInputs(policyTemplate) && policyTemplate.inputs;

  if (!policyTemplateInputs) return '';

  const cloudFormationTemplate = policyTemplateInputs.reduce((acc, input): string => {
    if (!input.vars) return acc;
    const template = input.vars.find((v) => v.name === 'cloud_formation_template')?.default;
    return template ? String(template) : acc;
  }, '');

  return cloudFormationTemplate;
};

const getCloudDefaultAwsCredentialConfig = ({
  isAgentless,
  showCloudConnectors,
  packageInfo,
  templateName,
}: {
  isAgentless: boolean;
  packageInfo: PackageInfo;
  showCloudConnectors: boolean;
  templateName: string;
}) => {
  let credentialsType;
  const hasCloudFormationTemplate = !!getCloudFormationDefaultValue(packageInfo, templateName);
  if (!showCloudConnectors && isAgentless) {
    credentialsType = DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE;
  } else if (showCloudConnectors && isAgentless) {
    credentialsType = DEFAULT_AGENTLESS_CLOUD_CONNECTORS_AWS_CREDENTIALS_TYPE;
  } else if (hasCloudFormationTemplate && !isAgentless) {
    credentialsType = DEFAULT_AWS_CREDENTIALS_TYPE;
  } else {
    credentialsType = DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE;
  }
  const config: {
    [key: string]: {
      value: string | boolean;
      type: 'text' | 'bool';
    };
  } = {
    'aws.credentials.type': {
      value: credentialsType,
      type: 'text',
    },
    ...(showCloudConnectors && {
      'aws.supports_cloud_connectors': {
        value: showCloudConnectors,
        type: 'bool',
      },
    }),
  };

  return config;
};

export const getDefaultCloudCredentialsType = (
  isAgentless: boolean,
  provider: CloudProviders,
  packageInfo: PackageInfo,
  showCloudConnectors: boolean,
  templateName: string
) => {
  const credentialsTypes: Record<
    CloudProviders,
    {
      [key: string]: {
        value: string | boolean;
        type: 'text' | 'bool';
      };
    }
  > = {
    aws: getCloudDefaultAwsCredentialConfig({
      isAgentless,
      showCloudConnectors,
      packageInfo,
      templateName,
    }),
    gcp: {
      'gcp.credentials.type': {
        value: isAgentless
          ? GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON
          : GCP_CREDENTIALS_TYPE.CREDENTIALS_NONE,
        type: 'text',
      },
    },
    azure: {
      'azure.credentials.type': {
        value: isAgentless
          ? AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET
          : AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
        type: 'text',
      },
    },
  };

  return credentialsTypes[provider];
};

export const gcpField: GcpInputFields = {
  fields: {
    'gcp.organization_id': {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.organizationIdFieldLabel',
        {
          defaultMessage: 'Organization ID',
        }
      ),
      type: 'text',
    },
    'gcp.project_id': {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.projectidFieldLabel',
        {
          defaultMessage: 'Project ID',
        }
      ),
      type: 'text',
    },
    'gcp.credentials.file': {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcpgcpInputText.credentialFileText',
        {
          defaultMessage: 'Path to JSON file containing the credentials and key used to subscribe',
        }
      ),
      type: 'text',
    },
    'gcp.credentials.json': {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcpgcpInputText.credentialJSONText',
        {
          defaultMessage: 'JSON blob containing the credentials and key used to subscribe',
        }
      ),
      type: 'password',
      isSecret: true,
    },
    'gcp.credentials.type': {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcpgcpInputText.credentialSelectBoxTitle',
        {
          defaultMessage: 'Credential',
        }
      ),
      type: 'text',
    },
  },
};

export const getGcpInputVarsFields = (input: NewPackagePolicyInput, fields: GcpFields) =>
  Object.entries(input.streams[0].vars || {})
    .filter(([id]) => id in fields)
    .map(([id, inputVar]) => {
      const field = fields[id];
      return {
        id,
        label: field.label,
        type: field.type || 'text',
        value: inputVar.value,
      } as const;
    });

export const getGcpCredentialsType = (
  input: NewPackagePolicyInput
): GcpCredentialsType | undefined => input.streams[0].vars?.['gcp.credentials.type'].value;

export const getDefaultGcpHiddenVars = (
  packageInfo: PackageInfo,
  templateName: string,
  setupTechnology?: SetupTechnology
): Record<string, PackagePolicyConfigRecordEntry> => {
  if (setupTechnology && setupTechnology === SetupTechnology.AGENTLESS) {
    return {
      'gcp.credentials.type': {
        value: GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON,
        type: 'text',
      },
    };
  }

  const hasCloudShellUrl = !!getCloudShellDefaultValue(packageInfo, templateName);

  if (hasCloudShellUrl) {
    return {
      'gcp.credentials.type': {
        value: GCP_CREDENTIALS_TYPE.CREDENTIALS_NONE,
        type: 'text',
      },
    };
  }

  return {
    'gcp.credentials.type': {
      value: GCP_CREDENTIALS_TYPE.CREDENTIALS_FILE,
      type: 'text',
    },
  };
};

/**
 * Input vars that are hidden from the user
 */
export const getInputHiddenVars = (
  provider: CloudProviders,
  packageInfo: PackageInfo,
  templateName: string,
  setupTechnology: SetupTechnology,
  showCloudConnectors: boolean
): Record<string, PackagePolicyConfigRecordEntry> | undefined => {
  switch (provider) {
    case AWS_PROVIDER:
      return getCloudDefaultAwsCredentialConfig({
        isAgentless: setupTechnology === SetupTechnology.AGENTLESS,
        packageInfo,
        showCloudConnectors,
        templateName,
      });
    case AZURE_PROVIDER:
      return {
        'azure.credentials.type': {
          value: getDefaultAzureCredentialsType(packageInfo, templateName, setupTechnology),
          type: 'text',
        },
      };
    case GCP_PROVIDER:
      return getDefaultGcpHiddenVars(packageInfo, templateName, setupTechnology);
    default:
      return undefined;
  }
};

export const getCloudShellDefaultValue = (
  packageInfo: PackageInfo,
  templateName: string
): string => {
  if (!packageInfo.policy_templates) return '';

  const policyTemplate = packageInfo.policy_templates.find((p) => p.name === templateName);

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

export const getArmTemplateUrlFromPackage = (
  packageInfo: PackageInfo,
  templateName: string
): string => {
  if (!packageInfo.policy_templates) return '';

  const policyTemplate = packageInfo.policy_templates.find((p) => p.name === templateName);
  if (!policyTemplate) return '';

  const policyTemplateInputs = hasPolicyTemplateInputs(policyTemplate) && policyTemplate.inputs;
  if (!policyTemplateInputs) return '';

  const armTemplateUrl = policyTemplateInputs.reduce((acc, input): string => {
    if (!input.vars) return acc;
    const template = input.vars.find((v) => v.name === 'arm_template_url')?.default;
    return template ? String(template) : acc;
  }, '');

  return armTemplateUrl;
};

export const getDefaultAzureCredentialsType = (
  packageInfo: PackageInfo,
  templateName: string,
  setupTechnology: SetupTechnology
): string => {
  if (setupTechnology && setupTechnology === SetupTechnology.AGENTLESS) {
    return AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET;
  }

  const hasArmTemplateUrl = !!getArmTemplateUrlFromPackage(packageInfo, templateName);
  if (hasArmTemplateUrl) {
    return AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE;
  }

  return AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY;
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

export const hasErrors = (validationResults: PackagePolicyValidationResults | undefined) => {
  if (!validationResults) return 0;

  const flattenedValidation = getFlattenedObject(validationResults);
  const errors = Object.values(flattenedValidation).filter((value) => Boolean(value)) || [];
  return errors.length;
};

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

export const getCloudConnectorRemoteRoleTemplate = ({
  input,
  cloud,
  packageInfo,
  templateName,
}: GetCloudConnectorRemoteRoleTemplateParams): string | undefined => {
  let elasticResourceId: string | undefined;
  const accountType = input?.streams?.[0]?.vars?.['aws.account_type']?.value ?? AWS_SINGLE_ACCOUNT;

  const provider = getCloudProviderFromCloudHost(cloud?.cloudHost);

  if (!provider || provider !== AWS_PROVIDER) return undefined;

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
    templateName,
    SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.CLOUD_FORMATION_CLOUD_CONNECTORS
  )
    ?.replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType)
    ?.replace(TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR, elasticResourceId);
};

export const getCloudCredentialVarsConfig = ({
  setupTechnology,
  optionId,
  showCloudConnectors,
  provider,
}: GetAwsCredentialTypeConfigParams): Record<string, PackagePolicyConfigRecordEntry> => {
  const supportsCloudConnector =
    setupTechnology === SetupTechnology.AGENTLESS &&
    optionId === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS &&
    showCloudConnectors;

  const credentialType = `${provider}.credentials.type`;
  const supportCloudConnectors = `${provider}.supports_cloud_connectors`;

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
