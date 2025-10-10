/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { CloudConnectorSecretVar } from '@kbn/fleet-plugin/public';
import type { CloudConnectorSecretReference } from '@kbn/fleet-plugin/public/types';
import type { CloudConnectorRoleArn } from '@kbn/fleet-plugin/common/types';
import type { UpdatePolicy } from '../types';
import type { AWS_PROVIDER, AZURE_PROVIDER, GCP_PROVIDER } from './constants';

export type CloudProviders = typeof AWS_PROVIDER | typeof GCP_PROVIDER | typeof AZURE_PROVIDER;

// Cloud Connector Credential Types
interface BaseCloudConnectorCredentials {
  cloudConnectorId?: string;
}
export interface AwsCloudConnectorCredentials extends BaseCloudConnectorCredentials {
  roleArn?: string;
  externalId?: string | CloudConnectorSecretReference;
}

export interface AzureCloudConnectorCredentials extends BaseCloudConnectorCredentials {
  tenantId?: string;
  clientId?: string;
  azure_credentials_cloud_connector_id?: string;
}

// Union type for backwards compatibility
export type CloudConnectorCredentials =
  | AwsCloudConnectorCredentials
  | AzureCloudConnectorCredentials;

export interface CloudConnectorConfig {
  provider: CloudProviders;
  fields: CloudConnectorField[];
  description?: ReactNode;
}

export interface NewCloudConnectorFormProps {
  input: NewPackagePolicyInput;
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  updatePolicy: UpdatePolicy;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
  cloud?: CloudSetup;
  cloudProvider?: string;
  templateName?: string;
  credentials?: CloudConnectorCredentials;
  setCredentials: (credentials: CloudConnectorCredentials) => void;
}

// Define the interface for connector options
export interface CloudConnectorOption {
  label: string;
  value: string;
  id: string;
  roleArn?: CloudConnectorRoleArn;
  externalId?: CloudConnectorSecretVar;
}

// Interface for EuiComboBox options (only standard properties)
export interface ComboBoxOption {
  label: string;
  value: string;
}

export interface CloudConnectorFormProps {
  input: NewPackagePolicyInput;
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  updatePolicy: UpdatePolicy;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
  cloud?: CloudSetup;
  cloudProvider?: string;
  isOrganization?: boolean;
  templateName?: string;
  credentials?: CloudConnectorCredentials;
  setCredentials: (credentials: CloudConnectorCredentials) => void;
}

export interface CloudFormationCloudCredentialsGuideProps {
  cloudProvider?: string;
}

export interface CloudConnectorField {
  label: string;
  type?: 'text' | 'password' | undefined;
  isSecret?: boolean | undefined;
  dataTestSubj: string;
  value: string;
  id: string;
}

/**
 * Updates input variables with current credentials
 */
export interface InputVar {
  value?: string | undefined;
  type?: string;
  [key: string]: unknown;
}

export interface InputVars {
  [key: string]: InputVar;
}
