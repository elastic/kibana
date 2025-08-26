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
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import { CLOUD_CONNECTOR_FIELD_NAMES } from './types';
import {
  AWS_SINGLE_ACCOUNT,
  CLOUD_FORMATION_TEMPLATE_URL_CLOUD_CONNECTORS,
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
  TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR,
} from './constants';
export interface GetCloudConnectorRemoteRoleTemplateParams {
  input: NewPackagePolicyInput;
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
  templateName: string;
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
  credentials: Record<string, string>
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
