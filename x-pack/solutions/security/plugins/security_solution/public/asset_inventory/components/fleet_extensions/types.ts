/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import type {
  ASSET_POLICY_TEMPLATE,
  SUPPORTED_CLOUDBEAT_INPUTS,
  SUPPORTED_POLICY_TEMPLATES,
} from './constants';
import type { CLOUDBEAT_GCP } from './gcp_credentials_form/constants';
import type { CLOUDBEAT_AWS } from './aws_credentials_form/constants';
import type { CLOUDBEAT_AZURE } from './azure_credentials_form/constants';

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

type AssetPolicyInput =
  | { type: typeof CLOUDBEAT_AZURE; policy_template: typeof ASSET_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_GCP; policy_template: typeof ASSET_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_AWS; policy_template: typeof ASSET_POLICY_TEMPLATE };

// Extend NewPackagePolicyInput with known string literals for input type and policy template
export type NewPackagePolicyAssetInput = NewPackagePolicyInput & AssetPolicyInput;
