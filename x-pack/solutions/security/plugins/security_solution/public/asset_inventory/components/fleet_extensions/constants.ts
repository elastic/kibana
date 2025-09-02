/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLOUDBEAT_AWS } from './aws_credentials_form/constants';
import { CLOUDBEAT_AZURE } from './azure_credentials_form/constants';
import { CLOUDBEAT_GCP } from './gcp_credentials_form/constants';

export const ASSET_POLICY_TEMPLATE = 'asset_inventory';

export const SUPPORTED_CLOUDBEAT_INPUTS = [CLOUDBEAT_AWS, CLOUDBEAT_GCP, CLOUDBEAT_AZURE] as const;

export const ORGANIZATION_ACCOUNT = 'organization-account';

export const SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS = {
  CLOUD_FORMATION: 'cloud_formation_template',
  CLOUD_FORMATION_CREDENTIALS: 'cloud_formation_credentials_template',
  ARM_TEMPLATE: 'arm_template_url',
  CLOUD_SHELL_URL: 'cloud_shell_url',
  CLOUD_FORMATION_CLOUD_CONNECTORS: 'cloud_formation_cloud_connectors_template',
};

export const TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR = 'ACCOUNT_TYPE';
export const TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR = 'RESOURCE_ID';
