/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ASSET_POLICY_TEMPLATE = 'asset_inventory';

export const CLOUDBEAT_AWS = 'cloudbeat/asset_inventory_aws';
export const CLOUDBEAT_GCP = 'cloudbeat/asset_inventory_gcp';
export const CLOUDBEAT_AZURE = 'cloudbeat/asset_inventory_azure';

export const SUPPORTED_POLICY_TEMPLATES = [ASSET_POLICY_TEMPLATE] as const;
export const SUPPORTED_CLOUDBEAT_INPUTS = [CLOUDBEAT_AWS, CLOUDBEAT_GCP, CLOUDBEAT_AZURE] as const;

export const SINGLE_ACCOUNT = 'single-account';
export const ORGANIZATION_ACCOUNT = 'organization-account';

export const AWS_SINGLE_ACCOUNT = 'single-account';
export const AWS_ORGANIZATION_ACCOUNT = 'organization-account';
export const GCP_SINGLE_ACCOUNT = 'single-account';
export const GCP_ORGANIZATION_ACCOUNT = 'organization-account';
export const AZURE_SINGLE_ACCOUNT = 'single-account';
export const AZURE_ORGANIZATION_ACCOUNT = 'organization-account';

export const SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS = {
  CLOUD_FORMATION: 'cloud_formation_template',
  CLOUD_FORMATION_CREDENTIALS: 'cloud_formation_credentials_template',
  ARM_TEMPLATE: 'arm_template_url',
  CLOUD_SHELL_URL: 'cloud_shell_url',
};

export const TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR = 'ACCOUNT_TYPE';
