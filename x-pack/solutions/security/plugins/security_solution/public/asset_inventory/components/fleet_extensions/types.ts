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
