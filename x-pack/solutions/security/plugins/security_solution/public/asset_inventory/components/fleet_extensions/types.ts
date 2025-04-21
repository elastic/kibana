/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SUPPORTED_CLOUDBEAT_INPUTS, SUPPORTED_POLICY_TEMPLATES } from './constants';

export type AssetInput = (typeof SUPPORTED_CLOUDBEAT_INPUTS)[number];
export type AssetInventoryPolicyTemplate = (typeof SUPPORTED_POLICY_TEMPLATES)[number];

export type CloudAssetInventoryIntegrations = Record<
  AssetInventoryPolicyTemplate,
  CloudAssetInventoryIntegrationProps
>;
export interface CloudAssetInventoryIntegrationProps {
  policyTemplate: AssetInventoryPolicyTemplate;
  name: string;
  shortName: string;
  options: Array<{
    type: AssetInput;
    name: string;
    benchmark: string;
    disabled?: boolean;
    icon?: string;
    tooltip?: string;
    isBeta?: boolean;
    testId?: string;
  }>;
}

export type AwsCredentialsType =
  | 'assume_role'
  | 'direct_access_keys'
  | 'temporary_keys'
  | 'shared_credentials'
  | 'cloud_formation';

export type GcpCredentialsType = 'credentials-file' | 'credentials-json' | 'credentials-none';

export type GcpCredentialsTypeFieldMap = {
  [key in GcpCredentialsType]: string[];
};

export type AzureCredentialsType =
  | 'arm_template'
  | 'manual'
  | 'service_principal_with_client_secret'
  | 'service_principal_with_client_certificate'
  | 'service_principal_with_client_username_and_password'
  | 'managed_identity';
