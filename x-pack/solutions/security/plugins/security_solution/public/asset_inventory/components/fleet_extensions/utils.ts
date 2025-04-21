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
import semverValid from 'semver/functions/valid';
import semverCoerce from 'semver/functions/coerce';
import semverLt from 'semver/functions/lt';
import type { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import { getFlattenedObject } from '@kbn/std';
import { i18n } from '@kbn/i18n';
import {
  SUPPORTED_CLOUDBEAT_INPUTS,
  ASSET_POLICY_TEMPLATE,
  CLOUDBEAT_AWS,
  CLOUDBEAT_AZURE,
  CLOUDBEAT_GCP,
} from './constants';

// import type { ASSET_POLICY_TEMPLATE } from './constants';
// import type {
//   AwsCredentialsType,
//   PostureInput,
//   CloudSecurityPolicyTemplate,
// } from '../../../common/types_old';

import {
  DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE,
  DEFAULT_AWS_CREDENTIALS_TYPE,
  DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE,
} from './aws_credentials_form/get_aws_credentials_form_options';
import { GCP_CREDENTIALS_TYPE } from './gcp_credentials_form/gcp_credential_form';
import { AZURE_CREDENTIALS_TYPE } from './azure_credentials_form/azure_credentials_form';
import type { CloudAssetInventoryIntegrations, AssetInput, AwsCredentialsType } from './types';
import googleCloudLogo from './assets/icons/google_cloud_logo.svg';

// Posture policies only support the default namespace
export const ASSET_NAMESPACE = 'default';

type AssetPolicyInput =
  | { type: typeof CLOUDBEAT_AZURE; policy_template: typeof ASSET_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_GCP; policy_template: typeof ASSET_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_AWS; policy_template: typeof ASSET_POLICY_TEMPLATE };

// Extend NewPackagePolicyInput with known string literals for input type and policy template
export type NewPackagePolicyAssetInput = NewPackagePolicyInput & AssetPolicyInput;

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export const isAssetInput = (
  input: NewPackagePolicyAssetInput
): input is NewPackagePolicyAssetInput =>
  SUPPORTED_CLOUDBEAT_INPUTS.includes(input.type as AssetInput);

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

const getPostureInput = (
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
  namespace: ASSET_NAMESPACE,
  // Enable new policy input and disable all others
  inputs: newPolicy.inputs.map((item) => getPostureInput(item, inputType, inputVars)),
  // Set hidden policy vars
  vars: merge({}, newPolicy.vars, {
    deployment: { value: getDeploymentType(inputType) },
    posture: { value: getAssetType(inputType) },
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

export const getCspmCloudFormationDefaultValue = (packageInfo: PackageInfo): string => {
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

  const hasCloudFormationTemplate = !!getCspmCloudFormationDefaultValue(packageInfo);
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

  const hasCloudShellUrl = !!getCspmCloudShellDefaultValue(packageInfo);
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
export const getPostureInputHiddenVars = (
  inputType: AssetInput,
  packageInfo: PackageInfo,
  setupTechnology: SetupTechnology
): Record<string, PackagePolicyConfigRecordEntry> | undefined => {
  switch (inputType) {
    case CLOUDBEAT_AWS:
      return {
        'aws.credentials.type': {
          value: getDefaultAwsCredentialsType(packageInfo, setupTechnology),
          type: 'text',
        },
      };
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

const assetInventoryIntegrations: CloudAssetInventoryIntegrations = {
  asset_inventory: {
    policyTemplate: ASSET_POLICY_TEMPLATE,
    name: i18n.translate('xpack.csp.cspmIntegration.integration.nameTitle', {
      defaultMessage: 'Cloud Asset Inventory',
    }),
    shortName: i18n.translate('xpack.csp.cspmIntegration.integration.shortNameTitle', {
      defaultMessage: 'CAI',
    }),
    options: [
      {
        type: CLOUDBEAT_AWS,
        name: i18n.translate('xpack.csp.cspmIntegration.awsOption.nameTitle', {
          defaultMessage: 'AWS',
        }),
        benchmark: i18n.translate('xpack.csp.cspmIntegration.awsOption.benchmarkTitle', {
          defaultMessage: 'CIS AWS',
        }),
        icon: 'logoAWS',
        testId: 'cisAwsTestId',
      },
      {
        type: CLOUDBEAT_GCP,
        name: i18n.translate('xpack.csp.cspmIntegration.gcpOption.nameTitle', {
          defaultMessage: 'GCP',
        }),
        benchmark: i18n.translate('xpack.csp.cspmIntegration.gcpOption.benchmarkTitle', {
          defaultMessage: 'CIS GCP',
        }),
        icon: googleCloudLogo,
        testId: 'cisGcpTestId',
      },
      {
        type: CLOUDBEAT_AZURE,
        name: i18n.translate('xpack.csp.cspmIntegration.azureOption.nameTitle', {
          defaultMessage: 'Azure',
        }),
        benchmark: i18n.translate('xpack.csp.cspmIntegration.azureOption.benchmarkTitle', {
          defaultMessage: 'CIS Azure',
        }),
        icon: 'logoAzure',
        testId: 'cisAzureTestId',
      },
    ],
  },
};

export const getPolicyTemplateInputOptions = () =>
  assetInventoryIntegrations.asset_inventory.options.map((o) => ({
    tooltip: o.tooltip,
    value: o.type,
    id: o.type,
    label: o.name,
    icon: o.icon,
    disabled: o.disabled,
    isBeta: o.isBeta,
    testId: o.testId,
  }));

// export const getMaxPackageName = (
//   packageName: string,
//   packagePolicies?: Array<{ name: string }>
// ) => {
//   // Retrieve the highest number appended to package policy name and increment it by one
//   const pkgPoliciesNamePattern = new RegExp(`${packageName}-(\\d+)`);

//   const maxPkgPolicyName = Math.max(
//     ...(packagePolicies ?? [])
//       .filter((ds) => Boolean(ds.name.match(pkgPoliciesNamePattern)))
//       .map((ds) => {
//         const match = ds.name.match(pkgPoliciesNamePattern);
//         return match ? parseInt(match[1], 10) : 0;
//       }),
//     0
//   );

//   return `${packageName}-${maxPkgPolicyName + 1}`;
// };

export const getCspmCloudShellDefaultValue = (packageInfo: PackageInfo): string => {
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
