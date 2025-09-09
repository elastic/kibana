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
} from '@kbn/fleet-plugin/common';
import type { GetCloudConnectorRemoteRoleTemplateParams, PackagePolicyVars } from './types';

import type { CloudConnectorCredentials } from './hooks/use_cloud_connector_setup';
import {
  AWS_SINGLE_ACCOUNT,
  CLOUD_CONNECTOR_FIELD_NAMES,
  CLOUD_FORMATION_TEMPLATE_URL_CLOUD_CONNECTORS,
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
  TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR,
} from './constants';

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
    templateName,
    CLOUD_FORMATION_TEMPLATE_URL_CLOUD_CONNECTORS
  )
    ?.replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType)
    ?.replace(TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR, elasticResourceId);
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
  if (credentials[CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN]) {
    updatedVars[CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN].value =
      credentials[CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN];
  }
  // Update external_id
  if (credentials[CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID]) {
    updatedVars[CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID].value =
      credentials[CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID];
  }
  // Update aws.role_arn
  if (credentials[CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN]) {
    updatedVars[CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN].value =
      credentials[CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN];
  }
  // Update aws.credentials.external_id
  if (credentials[CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID]) {
    updatedVars[CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID].value =
      credentials[CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID];
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
 * Updates input variables with current credentials
 * @param inputVars - The original input variables
 * @param credentials - The current credentials to apply
 * @returns Updated input variables with credentials applied
 */
export const updateInputVarsWithCredentials = (
  inputVars: PackagePolicyVars | undefined,
  credentials: CloudConnectorCredentials | undefined,
  isNewCredentials: boolean = false
): PackagePolicyVars | undefined => {
  if (!inputVars) return inputVars;

  const updatedInputVars: PackagePolicyVars = { ...inputVars };

  // Update role_arn fields
  if (credentials?.roleArn !== undefined) {
    if (updatedInputVars.role_arn) {
      updatedInputVars.role_arn.value = credentials.roleArn;
    }
    if (updatedInputVars['aws.role_arn']) {
      updatedInputVars['aws.role_arn'].value = credentials.roleArn;
    }
  } else {
    // Clear role_arn fields when roleArn is undefined
    if (updatedInputVars.role_arn) {
      updatedInputVars.role_arn = { value: undefined };
    }
    if (updatedInputVars['aws.role_arn']) {
      updatedInputVars['aws.role_arn'] = { value: undefined };
    }
  }

  // Update external_id fields
  if (credentials?.externalId !== undefined) {
    if (updatedInputVars.external_id) {
      updatedInputVars.external_id = isNewCredentials
        ? { value: credentials.externalId }
        : credentials.externalId;
    }
    if (updatedInputVars['aws.credentials.external_id']) {
      updatedInputVars['aws.credentials.external_id'] = { value: credentials.externalId };
    }
  } else {
    // Clear external_id fields when externalId is undefined
    if (updatedInputVars.external_id) {
      updatedInputVars.external_id = { value: undefined };
    }
    if (updatedInputVars['aws.credentials.external_id']) {
      updatedInputVars['aws.credentials.external_id'] = { value: undefined };
    }
  }

  return updatedInputVars;
};

/**
 * Updates policy inputs with new variables
 * @param updatedPolicy - The policy to update
 * @param inputVars - The variables to apply to the policy
 * @returns Updated policy with new inputs
 */
export const updatePolicyInputs = (
  updatedPolicy: NewPackagePolicy,
  inputVars: PackagePolicyVars
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
