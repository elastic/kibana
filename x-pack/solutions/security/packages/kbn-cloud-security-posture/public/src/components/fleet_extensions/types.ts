/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudSetup } from '@kbn/cloud-plugin/public/types';
import { NewPackagePolicy, NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { CSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common/constants';
import {
  AWS_ORGANIZATION_ACCOUNT,
  AWS_SETUP_FORMAT,
  AWS_SINGLE_ACCOUNT,
  AZURE_ORGANIZATION_ACCOUNT,
  AZURE_SETUP_FORMAT,
  AZURE_SINGLE_ACCOUNT,
  CLOUDBEAT_AWS,
  CLOUDBEAT_AZURE,
  CLOUDBEAT_GCP,
  SUPPORTED_CLOUDBEAT_INPUTS,
  SUPPORTED_POLICY_TEMPLATES,
} from './constants';

export type UpdatePolicy = ({
  updatedPolicy,
  isValid,
  isExtensionLoaded,
}: {
  updatedPolicy: NewPackagePolicy;
  isValid?: boolean;
  isExtensionLoaded?: boolean;
}) => void;

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

// AWS types

export type AwsSetupFormat =
  | typeof AWS_SETUP_FORMAT.CLOUD_FORMATION
  | typeof AWS_SETUP_FORMAT.MANUAL;

export type AwsAccountType = typeof AWS_SINGLE_ACCOUNT | typeof AWS_ORGANIZATION_ACCOUNT;
export type AwsCredentialsType =
  | CloudConnectorType
  | 'assume_role'
  | 'direct_access_keys'
  | 'temporary_keys'
  | 'shared_credentials'
  | 'cloud_formation';

// GCP types
export type GcpCredentialsType = 'credentials-file' | 'credentials-json' | 'credentials-none';

export type GcpCredentialsTypeFieldMap = {
  [key in GcpCredentialsType]: string[];
};

export type GcpFields = Record<
  string,
  { label: string; type?: 'password' | 'text'; value?: string; isSecret?: boolean }
>;

export interface GcpInputFields {
  fields: GcpFields;
}

// Azure types
export type AzureSetupFormat =
  | typeof AZURE_SETUP_FORMAT.ARM_TEMPLATE
  | typeof AZURE_SETUP_FORMAT.MANUAL;

export type AzureCredentialsType =
  | 'arm_template'
  | 'manual' // TODO: remove for stack version 8.13
  | 'service_principal_with_client_secret'
  | 'service_principal_with_client_certificate'
  | 'service_principal_with_client_username_and_password'
  | 'managed_identity';

export type AzureAccountType = typeof AZURE_SINGLE_ACCOUNT | typeof AZURE_ORGANIZATION_ACCOUNT;
