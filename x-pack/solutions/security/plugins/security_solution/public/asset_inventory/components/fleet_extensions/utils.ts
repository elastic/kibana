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
import merge from 'lodash/merge';
import type { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import { getFlattenedObject } from '@kbn/std';
import { i18n } from '@kbn/i18n';

import type { CloudSetup } from '@kbn/cloud-plugin/public';
import {
  SUPPORTED_CLOUDBEAT_INPUTS,
  ASSET_POLICY_TEMPLATE,
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
  TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR,
  SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS,
} from './constants';

import {
  DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE,
  DEFAULT_AGENTLESS_CLOUD_CONNECTORS_AWS_CREDENTIALS_TYPE,
  DEFAULT_AWS_CREDENTIALS_TYPE,
  DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE,
} from './aws_credentials_form/aws_credentials_form_options';
import { GCP_CREDENTIALS_TYPE } from './gcp_credentials_form/gcp_credential_form';
import type { AssetInput, AssetInventoryInputTypes, NewPackagePolicyAssetInput } from './types';
import type { AwsCredentialsType } from './aws_credentials_form/types';
import googleCloudLogo from './assets/icons/google_cloud_logo.svg';
import {
  AWS_CREDENTIALS_TYPE,
  AWS_SINGLE_ACCOUNT,
  CLOUDBEAT_AWS,
} from './aws_credentials_form/constants';
import { CLOUDBEAT_GCP } from './gcp_credentials_form/constants';
import { AZURE_CREDENTIALS_TYPE, CLOUDBEAT_AZURE } from './azure_credentials_form/constants';
import {
  CAI_AWS_OPTION_TEST_SUBJ,
  CAI_AZURE_OPTION_TEST_SUBJ,
  CAI_GCP_OPTION_TEST_SUBJ,
} from './test_subjects';

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export const isAssetInput = (
  input: NewPackagePolicyAssetInput
): input is NewPackagePolicyAssetInput =>
  SUPPORTED_CLOUDBEAT_INPUTS.includes(input.type as AssetInput);

export interface GetAwsCredentialTypeConfigParams {
  setupTechnology: SetupTechnology | undefined;
  optionId: string;
  showCloudConnectors: boolean;
  inputType:
    | 'cloudbeat/asset_inventory_aws'
    | 'cloudbeat/asset_inventory_gcp'
    | 'cloudbeat/asset_inventory_azure';
}

const getAssetType = (policyTemplateInput: AssetInput) => {
  switch (policyTemplateInput) {
    case CLOUDBEAT_AWS:
    case CLOUDBEAT_AZURE:
    case CLOUDBEAT_GCP:
      return 'asset_inventory';
    default:
      return 'n/a';
  }
};

export interface GetCloudConnectorRemoteRoleTemplateParams {
  input: NewPackagePolicyAssetInput;
  cloud: Pick<
    CloudSetup,
    | 'isCloudEnabled'
    | 'cloudId'
    | 'cloudHost'
    | 'deploymentUrl'
    | 'serverless'
    | 'isServerlessEnabled'
  >;
  packageInfo: PackageInfo;
}

const getDeploymentType = (policyTemplateInput: AssetInput) => {
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

const getAssetInput = (
  input: NewPackagePolicyInput,
  inputType: AssetInput,
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
export const getAssetPolicy = (
  newPolicy: NewPackagePolicy,
  inputType: AssetInput,
  inputVars?: Record<string, PackagePolicyConfigRecordEntry>
): NewPackagePolicy => ({
  ...newPolicy,
  // Enable new policy input and disable all others
  inputs: newPolicy.inputs.map((item) => getAssetInput(item, inputType, inputVars)),
  // Set hidden policy vars
  vars: merge({}, newPolicy.vars, {
    deployment: { value: getDeploymentType(inputType) },
    asset: { value: getAssetType(inputType) },
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

export const getAssetCloudFormationDefaultValue = (packageInfo: PackageInfo): string => {
  if (!packageInfo.policy_templates) return '';

  const policyTemplate = packageInfo.policy_templates.find((p) => p.name === ASSET_POLICY_TEMPLATE);
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

export const getDefaultAwsCredentialsType = (
  packageInfo: PackageInfo,
  setupTechnology?: SetupTechnology
): AwsCredentialsType => {
  if (setupTechnology && setupTechnology === SetupTechnology.AGENTLESS) {
    return DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE;
  }

  const hasCloudFormationTemplate = !!getAssetCloudFormationDefaultValue(packageInfo);
  if (hasCloudFormationTemplate) {
    return DEFAULT_AWS_CREDENTIALS_TYPE;
  }

  return DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE;
};

export const getDefaultAzureCredentialsType = (
  packageInfo: PackageInfo,
  setupTechnology?: SetupTechnology
): string => {
  if (setupTechnology && setupTechnology === SetupTechnology.AGENTLESS) {
    return AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET;
  }

  return AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE;
};

export const getArmTemplateUrlFromAssetPackage = (packageInfo: PackageInfo): string => {
  if (!packageInfo.policy_templates) return '';

  const policyTemplate = packageInfo.policy_templates.find((p) => p.name === ASSET_POLICY_TEMPLATE);
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

export const getDefaultGcpHiddenVars = (
  packageInfo: PackageInfo,
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

  const hasCloudShellUrl = !!getAssetCloudShellDefaultValue(packageInfo);
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

export const getCloudDefaultAwsCredentialConfig = ({
  isAgentless,
  showCloudConnectors,
  packageInfo,
}: {
  isAgentless: boolean;
  packageInfo: PackageInfo;
  showCloudConnectors: boolean;
}) => {
  let credentialsType;
  const hasCloudFormationTemplate = !!getAssetCloudFormationDefaultValue(packageInfo);
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

/**
 * Input vars that are hidden from the user
 */
export const getAssetInputHiddenVars = (
  inputType: AssetInput,
  packageInfo: PackageInfo,
  setupTechnology: SetupTechnology,
  showCloudConnectors: boolean
): Record<string, PackagePolicyConfigRecordEntry> | undefined => {
  switch (inputType) {
    case CLOUDBEAT_AWS:
      return getCloudDefaultAwsCredentialConfig({
        isAgentless: setupTechnology === SetupTechnology.AGENTLESS,
        packageInfo,
        showCloudConnectors,
      });
    case CLOUDBEAT_AZURE:
      return {
        'azure.credentials.type': {
          value: getDefaultAzureCredentialsType(packageInfo, setupTechnology),
          type: 'text',
        },
      };
    case CLOUDBEAT_GCP:
      return getDefaultGcpHiddenVars(packageInfo, setupTechnology);
    default:
      return undefined;
  }
};

const assetInventoryCloudServiceProviders: Array<{
  type: AssetInput;
  name: string;
  benchmark: string;
  disabled?: boolean;
  icon?: string;
  tooltip?: string;
  isBeta?: boolean;
  testId?: string;
}> = [
  {
    type: CLOUDBEAT_AWS,
    name: i18n.translate(
      'xpack.securitySolution.assetInventory.assetIntegration.googleCloudShellCredentials.awsOption.nameTitle',
      {
        defaultMessage: 'AWS',
      }
    ),
    benchmark: i18n.translate(
      'xpack.securitySolution.assetInventory.assetIntegration.googleCloudShellCredentials.awsOption.benchmarkTitle',
      {
        defaultMessage: 'CAI AWS',
      }
    ),
    icon: 'logoAWS',
    testId: CAI_AWS_OPTION_TEST_SUBJ,
  },
  {
    type: CLOUDBEAT_GCP,
    name: i18n.translate(
      'xpack.securitySolution.assetInventory.assetIntegration.googleCloudShellCredentials.gcpOption.nameTitle',
      {
        defaultMessage: 'GCP',
      }
    ),
    benchmark: i18n.translate(
      'xpack.securitySolution.assetInventory.assetIntegration.googleCloudShellCredentials.gcpOption.benchmarkTitle',
      {
        defaultMessage: 'CAI GCP',
      }
    ),
    icon: googleCloudLogo,
    testId: CAI_GCP_OPTION_TEST_SUBJ,
  },
  {
    type: CLOUDBEAT_AZURE,
    name: i18n.translate(
      'xpack.securitySolution.assetInventory.assetIntegration.googleCloudShellCredentials.azureOption.nameTitle',
      {
        defaultMessage: 'Azure',
      }
    ),
    benchmark: i18n.translate(
      'xpack.securitySolution.assetInventory.assetIntegration.googleCloudShellCredentials.azureOption.benchmarkTitle',
      {
        defaultMessage: 'CAI Azure',
      }
    ),
    icon: 'logoAzure',
    testId: CAI_AZURE_OPTION_TEST_SUBJ,
  },
];

export const getPolicyTemplateInputOptions = () =>
  assetInventoryCloudServiceProviders.map((o) => ({
    tooltip: o.tooltip,
    value: o.type,
    id: o.type,
    label: o.name,
    icon: o.icon,
    disabled: o.disabled,
    isBeta: o.isBeta,
    testId: o.testId,
  }));

export const getAssetCloudShellDefaultValue = (packageInfo: PackageInfo): string => {
  if (!packageInfo.policy_templates) return '';

  const policyTemplate = packageInfo.policy_templates.find((p) => p.name === ASSET_POLICY_TEMPLATE);
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

export const getAwsCredentialsType = (
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_aws' }>
): AwsCredentialsType | undefined => input.streams[0].vars?.['aws.credentials.type'].value;

export const getDefaultCloudCredentialsType = (
  isAgentless: boolean,
  inputType: Extract<AssetInput, AssetInventoryInputTypes>
) => {
  const credentialsTypes: Record<
    Extract<AssetInput, AssetInventoryInputTypes>,
    {
      [key: string]: {
        value: string;
        type: 'text';
      };
    }
  > = {
    'cloudbeat/asset_inventory_aws': {
      'aws.credentials.type': {
        value: isAgentless
          ? AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS
          : AWS_CREDENTIALS_TYPE.CLOUD_FORMATION,
        type: 'text',
      },
    },
    'cloudbeat/asset_inventory_gcp': {
      'gcp.credentials.type': {
        value: isAgentless
          ? GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON
          : GCP_CREDENTIALS_TYPE.CREDENTIALS_NONE,
        type: 'text',
      },
    },
    'cloudbeat/asset_inventory_azure': {
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
export const getCloudProviderFromCloudHost = (
  cloudHost: string | undefined
): string | undefined => {
  if (!cloudHost) return undefined;
  const match = cloudHost.match(/\b(aws|gcp|azure)\b/);
  return match?.[1];
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
