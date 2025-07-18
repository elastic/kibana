/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AWS_ORGANIZATION_ACCOUNT,
  AWS_SINGLE_ACCOUNT,
  AZURE_ORGANIZATION_ACCOUNT,
  AZURE_SINGLE_ACCOUNT,
  GCP_ORGANIZATION_ACCOUNT,
  GCP_SINGLE_ACCOUNT,
  SUPPORTED_CLOUDBEAT_INPUTS,
  SUPPORTED_POLICY_TEMPLATES,
} from './constants';

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

type CloudConnectorType = 'cloud_connectors';

export type CredentialsType = Extract<
  AwsCredentialsType,
  'direct_access_keys' | 'assume_role' | 'temporary_keys' | 'cloud_connectors'
>;

export type CloudPostureIntegrations = Record<
  CloudSecurityPolicyTemplate,
  CloudPostureIntegrationProps
>;

export type AwsAccountType = typeof AWS_SINGLE_ACCOUNT | typeof AWS_ORGANIZATION_ACCOUNT;
export type AwsCredentialsType =
  | CloudConnectorType
  | 'assume_role'
  | 'direct_access_keys'
  | 'temporary_keys'
  | 'shared_credentials'
  | 'cloud_formation';

export type AzureAccountType = typeof AZURE_SINGLE_ACCOUNT | typeof AZURE_ORGANIZATION_ACCOUNT;

export type GcpAccountType = typeof GCP_SINGLE_ACCOUNT | typeof GCP_ORGANIZATION_ACCOUNT;
export type GcpFields = Record<
  string,
  { label: string; type?: 'password' | 'text'; value?: string; isSecret?: boolean }
>;
export interface GcpInputFields {
  fields: GcpFields;
}
