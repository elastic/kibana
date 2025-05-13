/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AZURE_ORGANIZATION_ACCOUNT,
  AZURE_SETUP_FORMAT,
  AZURE_SINGLE_ACCOUNT,
} from './constants';

export type AzureAccountType = typeof AZURE_SINGLE_ACCOUNT | typeof AZURE_ORGANIZATION_ACCOUNT;

export type AzureCredentialsType =
  | 'arm_template'
  | 'manual'
  | 'service_principal_with_client_secret'
  | 'service_principal_with_client_certificate'
  | 'service_principal_with_client_username_and_password'
  | 'managed_identity';

export type AzureSetupFormat =
  | typeof AZURE_SETUP_FORMAT.ARM_TEMPLATE
  | typeof AZURE_SETUP_FORMAT.MANUAL;
