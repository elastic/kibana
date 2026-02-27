/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NewPackagePolicy,
  SINGLE_ACCOUNT,
  ORGANIZATION_ACCOUNT,
} from '@kbn/fleet-plugin/common';
import type { SetupTechnology } from '@kbn/fleet-plugin/public';

import type {
  AWS_SETUP_FORMAT,
  AZURE_SETUP_FORMAT,
  AWS_PROVIDER,
  GCP_PROVIDER,
  AZURE_PROVIDER,
  CLOUD_CONNECTOR_TYPE,
} from './constants';

export type CloudProviders = typeof AWS_PROVIDER | typeof GCP_PROVIDER | typeof AZURE_PROVIDER;

export interface CloudProviderConfig {
  type: string;
  enableOrganization?: boolean;
  getStartedPath: string;
  enabled?: boolean;
  cloudConnectorEnabledVersion?: string;
}

export type AwsInputs =
  | 'access_key_id'
  | 'secret_access_key'
  | 'session_token'
  | 'role_arn'
  | 'shared_credential_file'
  | 'credential_profile_name'
  | 'aws.credentials.external_id';

export type AwsInputFieldMapping = {
  [key in AwsInputs]?: string;
};

export type AwsCloudProviderConfig = CloudProviderConfig & {
  inputFieldMapping?: AwsInputFieldMapping;
};

type GcpCloudProviderConfig = CloudProviderConfig;
type AzureProviderConfig = CloudProviderConfig & {
  manualFieldsEnabled?: boolean;
};

export interface CloudSetupConfig {
  policyTemplate: string;
  name: string;
  shortName: string;
  defaultProvider: CloudProviders;
  namespaceSupportEnabled?: boolean;
  overviewPath: string;
  getStartedPath: string;
  showCloudTemplates: boolean;
  providers: {
    aws: AwsCloudProviderConfig;
    gcp: GcpCloudProviderConfig;
    azure: AzureProviderConfig;
  };
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

export interface GetAwsCredentialTypeConfigParams {
  setupTechnology: SetupTechnology | undefined;
  optionId: string;
  showCloudConnectors: boolean;
  provider: CloudProviders;
}

export type CloudConnectorType = typeof CLOUD_CONNECTOR_TYPE;

export type CredentialsType = Extract<
  AwsCredentialsType,
  'direct_access_keys' | 'assume_role' | 'temporary_keys' | 'cloud_connectors'
>;

// AWS types

export type AwsSetupFormat =
  | typeof AWS_SETUP_FORMAT.CLOUD_FORMATION
  | typeof AWS_SETUP_FORMAT.MANUAL;

export type AwsAccountType = typeof SINGLE_ACCOUNT | typeof ORGANIZATION_ACCOUNT;
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
  | 'cloud_connectors'
  | 'arm_template'
  | 'manual' // TODO: remove for stack version 8.13
  | 'service_principal_with_client_secret'
  | 'service_principal_with_client_certificate'
  | 'service_principal_with_client_username_and_password'
  | 'managed_identity';

export type AzureAccountType = typeof SINGLE_ACCOUNT | typeof ORGANIZATION_ACCOUNT;
