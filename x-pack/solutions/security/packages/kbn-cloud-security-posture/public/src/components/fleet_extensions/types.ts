/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/public/types';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import type { SetupTechnology } from '@kbn/fleet-plugin/public';
import type {
  AWS_ORGANIZATION_ACCOUNT,
  AWS_SETUP_FORMAT,
  AWS_SINGLE_ACCOUNT,
  AZURE_ORGANIZATION_ACCOUNT,
  AZURE_SETUP_FORMAT,
  AZURE_SINGLE_ACCOUNT,
  AWS_PROVIDER,
  GCP_PROVIDER,
  AZURE_PROVIDER,
} from './constants';

export type CloudProviders = typeof AWS_PROVIDER | typeof GCP_PROVIDER | typeof AZURE_PROVIDER;

export interface CloudProviderConfig {
  type: string;
  enableOrganization?: boolean;
  getStartedPath: string;
  enabled?: boolean;
  manualFieldsEnabled?: boolean;
}
export interface CloudSetupConfig {
  policyTemplate: string;
  name: string;
  shortName: string;
  defaultProvider: CloudProviders;
  namespaceSupportEnabled?: boolean;
  overviewPath: string;
  getStartedPath: string;
  cloudConnectorEnabledVersion: string;
  showCloudTemplates: boolean;
  providers: Record<CloudProviders, CloudProviderConfig>;
}

export type UpdatePolicy = ({
  updatedPolicy,
  isValid,
  isExtensionLoaded,
}: {
  updatedPolicy: NewPackagePolicy;
  isValid?: boolean;
  isExtensionLoaded?: boolean;
}) => void;

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

export interface GetAwsCredentialTypeConfigParams {
  setupTechnology: SetupTechnology | undefined;
  optionId: string;
  showCloudConnectors: boolean;
  provider: CloudProviders;
}

export type CloudConnectorType = 'cloud_connectors';

export type CredentialsType = Extract<
  AwsCredentialsType,
  'direct_access_keys' | 'assume_role' | 'temporary_keys' | 'cloud_connectors'
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
