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
import type { UpdatePolicy } from '../types';

export interface CloudConnectorConfig {
  provider: 'aws' | 'gcp' | 'azure';
  fields: CloudConnectorField[];
  description?: ReactNode;
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
  templateName: string;
}

export interface AWSCloudConnectorFormProps {
  input: NewPackagePolicyInput;
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  updatePolicy: UpdatePolicy;
  isEditPage?: boolean;
  hasInvalidRequiredVars?: boolean;
  cloud?: CloudSetup;
  cloudProvider?: string;
  isOrganization?: boolean;
  templateName: string;
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

// Field name constants
export const CLOUD_CONNECTOR_FIELD_NAMES = {
  ROLE_ARN: 'role_arn',
  EXTERNAL_ID: 'external_id',
  AWS_ROLE_ARN: 'aws.role_arn',
  AWS_EXTERNAL_ID: 'aws.credentials.external_id',
} as const;
