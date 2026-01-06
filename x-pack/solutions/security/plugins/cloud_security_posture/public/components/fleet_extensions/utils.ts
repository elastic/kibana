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
import { merge } from 'lodash';
import {
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
} from '@kbn/cloud-security-posture-common/constants';
import { i18n } from '@kbn/i18n';
import type { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import { getFlattenedObject } from '@kbn/std';
import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_AZURE,
  CLOUDBEAT_EKS,
  CLOUDBEAT_GCP,
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_VULN_MGMT_AWS,
  SUPPORTED_CLOUDBEAT_INPUTS,
  SUPPORTED_POLICY_TEMPLATES,
  VULN_MGMT_POLICY_TEMPLATE,
} from '../../../common/constants';
import type {
  PostureInput,
  CloudSecurityPolicyTemplate,
  AwsCredentialsType,
} from '../../../common/types_old';
import type { CloudPostureIntegrations } from '../../common/constants';
import eksLogo from '../../assets/icons/cis_eks_logo.svg';

const cloudPostureIntegrations: CloudPostureIntegrations = {
  cspm: {
    policyTemplate: CSPM_POLICY_TEMPLATE,
    name: i18n.translate('xpack.csp.cspmIntegration.integration.nameTitle', {
      defaultMessage: 'Cloud Security Posture Management',
    }),
    shortName: i18n.translate('xpack.csp.cspmIntegration.integration.shortNameTitle', {
      defaultMessage: 'CSPM',
    }),
  },
  kspm: {
    policyTemplate: KSPM_POLICY_TEMPLATE,
    name: i18n.translate('xpack.csp.kspmIntegration.integration.nameTitle', {
      defaultMessage: 'Kubernetes Security Posture Management',
    }),
    shortName: i18n.translate('xpack.csp.kspmIntegration.integration.shortNameTitle', {
      defaultMessage: 'KSPM',
    }),
    options: [
      {
        type: CLOUDBEAT_VANILLA,
        name: i18n.translate('xpack.csp.kspmIntegration.vanillaOption.nameTitle', {
          defaultMessage: 'Self-Managed',
        }),
        benchmark: i18n.translate('xpack.csp.kspmIntegration.vanillaOption.benchmarkTitle', {
          defaultMessage: 'CIS Kubernetes',
        }),
        icon: 'logoKubernetes',
        testId: 'cisK8sTestId',
      },
      {
        type: CLOUDBEAT_EKS,
        name: i18n.translate('xpack.csp.kspmIntegration.eksOption.nameTitle', {
          defaultMessage: 'EKS',
        }),
        benchmark: i18n.translate('xpack.csp.kspmIntegration.eksOption.benchmarkTitle', {
          defaultMessage: 'CIS EKS',
        }),
        icon: eksLogo,
        tooltip: i18n.translate('xpack.csp.kspmIntegration.eksOption.tooltipContent', {
          defaultMessage: 'Elastic Kubernetes Service',
        }),
        testId: 'cisEksTestId',
      },
    ],
  },
  vuln_mgmt: {
    policyTemplate: VULN_MGMT_POLICY_TEMPLATE,
    name: 'Vulnerability Management', // TODO: we should use i18n and fix this
    shortName: 'VULN_MGMT', // TODO: we should use i18n and fix this
    options: [
      {
        type: CLOUDBEAT_VULN_MGMT_AWS,
        name: i18n.translate('xpack.csp.vulnMgmtIntegration.awsOption.nameTitle', {
          defaultMessage: 'Amazon Web Services',
        }),
        icon: 'logoAWS',
        benchmark: 'N/A', // TODO: change benchmark to be optional
      },
    ],
  },
};

const DEFAULT_EKS_VARS_GROUP: AwsCredentialsType = 'assume_role';

type PosturePolicyInput =
  | { type: typeof CLOUDBEAT_AZURE; policy_template: typeof CSPM_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_GCP; policy_template: typeof CSPM_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_AWS; policy_template: typeof CSPM_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_VANILLA; policy_template: typeof KSPM_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_EKS; policy_template: typeof KSPM_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_VULN_MGMT_AWS; policy_template: typeof VULN_MGMT_POLICY_TEMPLATE };

// Extend NewPackagePolicyInput with known string literals for input type and policy template
export type NewPackagePolicyPostureInput = NewPackagePolicyInput & PosturePolicyInput;

export const isPostureInput = (
  input: NewPackagePolicyInput
): input is NewPackagePolicyPostureInput =>
  SUPPORTED_POLICY_TEMPLATES.includes(input.policy_template as CloudSecurityPolicyTemplate) &&
  SUPPORTED_CLOUDBEAT_INPUTS.includes(input.type as PostureInput);

export const getPostureType = (policyTemplateInput: PostureInput) => {
  switch (policyTemplateInput) {
    case CLOUDBEAT_AWS:
    case CLOUDBEAT_AZURE:
    case CLOUDBEAT_GCP:
      return 'cspm';
    case CLOUDBEAT_VANILLA:
    case CLOUDBEAT_EKS:
      return 'kspm';
    case CLOUDBEAT_VULN_MGMT_AWS:
      return 'vuln_mgmt';
    default:
      return 'n/a';
  }
};

export const getDeploymentType = (policyTemplateInput: PostureInput) => {
  switch (policyTemplateInput) {
    case CLOUDBEAT_AWS:
    case CLOUDBEAT_VULN_MGMT_AWS:
      return 'aws';
    case CLOUDBEAT_AZURE:
      return 'azure';
    case CLOUDBEAT_GCP:
      return 'gcp';
    case CLOUDBEAT_VANILLA:
      return 'self_managed';
    case CLOUDBEAT_EKS:
      return 'eks';
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

export const getVulnMgmtCloudFormationDefaultValue = (packageInfo: PackageInfo): string => {
  if (!packageInfo.policy_templates) return '';

  const vulnMgmtPolicyTemplate = packageInfo.policy_templates.find(
    (p) => p.name === VULN_MGMT_POLICY_TEMPLATE
  );
  if (!vulnMgmtPolicyTemplate) return '';

  const vulnMgmtInputs =
    hasPolicyTemplateInputs(vulnMgmtPolicyTemplate) && vulnMgmtPolicyTemplate.inputs;

  if (!vulnMgmtInputs) return '';

  const cloudFormationTemplate = vulnMgmtInputs.reduce((acc, input): string => {
    if (!input.vars) return acc;
    const template = input.vars.find((v) => v.name === 'cloud_formation_template')?.default;
    return template ? String(template) : acc;
  }, '');

  return cloudFormationTemplate;
};

/**
 * Input vars that are hidden from the user
 */
export const getPostureInputHiddenVars = (
  inputType: PostureInput
): Record<string, PackagePolicyConfigRecordEntry> | undefined => {
  switch (inputType) {
    case 'cloudbeat/cis_eks':
      return { 'aws.credentials.type': { value: DEFAULT_EKS_VARS_GROUP, type: 'text' } };
    default:
      return undefined;
  }
};

export const hasErrors = (validationResults: PackagePolicyValidationResults | undefined) => {
  if (!validationResults) return 0;

  const flattenedValidation = getFlattenedObject(validationResults);
  const errors = Object.values(flattenedValidation).filter((value) => Boolean(value)) || [];
  return errors.length;
};

export const getPolicyTemplateInputOptions = (policyTemplate: CloudSecurityPolicyTemplate) =>
  cloudPostureIntegrations[policyTemplate].options?.map((o) => ({
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
  // Retrieve the highest number appended to package policy name and increment it by one
  const pkgPoliciesNamePattern = new RegExp(`${packageName}-(\\d+)`);

  const maxPkgPolicyName = Math.max(
    ...(packagePolicies ?? [])
      .filter((ds) => Boolean(ds.name.match(pkgPoliciesNamePattern)))
      .map((ds) => parseInt(ds.name.match(pkgPoliciesNamePattern)![1], 10)),
    0
  );

  return `${packageName}-${maxPkgPolicyName + 1}`;
};

export const POLICY_TEMPLATE_FORM_DTS = {
  LOADER: 'policy-template-form-loader',
};
