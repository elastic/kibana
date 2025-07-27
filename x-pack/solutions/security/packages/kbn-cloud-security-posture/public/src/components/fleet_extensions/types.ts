/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudSetup } from '@kbn/cloud-plugin/public/types';
import { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { CSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common/constants';
import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_AZURE,
  CLOUDBEAT_GCP,
  SUPPORTED_CLOUDBEAT_INPUTS,
  SUPPORTED_POLICY_TEMPLATES,
} from './constants';
import { AwsCredentialsType } from './aws_credentials_form/aws_types';

type PosturePolicyInput =
  | { type: typeof CLOUDBEAT_AZURE; policy_template: typeof CSPM_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_GCP; policy_template: typeof CSPM_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_AWS; policy_template: typeof CSPM_POLICY_TEMPLATE };

export type CloudSetupAccessInputType = 'cloudbeat/cis_aws' | 'cloudbeat/cloud_connectors_aws'; // we need to add more types depending integrations such Asset Inventory

export interface GetCloudConnectorRemoteRoleTemplateParams {
  input: NewPackagePolicyPostureInput;
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

export interface GetAwsCredentialTypeConfigParams {
  setupTechnology: SetupTechnology | undefined;
  optionId: string;
  showCloudConnectors: boolean;
  inputType: CloudSetupAccessInputType;
}

// Extend NewPackagePolicyInput with known string literals for input type and policy template
export type NewPackagePolicyPostureInput = NewPackagePolicyInput & PosturePolicyInput;

// Fleet Integration types
export type PostureInput = (typeof SUPPORTED_CLOUDBEAT_INPUTS)[number];
export type CloudSecurityPolicyTemplate = (typeof SUPPORTED_POLICY_TEMPLATES)[number];

export interface CloudPostureIntegrationProps {
  policyTemplate: CloudSecurityPolicyTemplate;
  name: string;
  shortName: string;
  options: Array<{
    type: PostureInput;
    name: string;
    benchmark: string;
    disabled?: boolean;
    icon?: string;
    tooltip?: string;
    isBeta?: boolean;
    testId?: string;
  }>;
}

export type CloudConnectorType = 'cloud_connectors';

export type CredentialsType = Extract<
  AwsCredentialsType,
  'direct_access_keys' | 'assume_role' | 'temporary_keys' | 'cloud_connectors'
>;

export type CloudPostureIntegrations = Record<
  CloudSecurityPolicyTemplate,
  CloudPostureIntegrationProps
>;
