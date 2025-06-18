/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointSecurityRoleNames } from '../../../../scripts/endpoint/common/roles_users';

export type KibanaKnownUserAccounts = keyof typeof KIBANA_KNOWN_DEFAULT_ACCOUNTS;

export type SecurityTestUser = EndpointSecurityRoleNames | KibanaKnownUserAccounts;

/**
 * List of kibana system accounts
 */
export const KIBANA_KNOWN_DEFAULT_ACCOUNTS = {
  elastic: 'elastic',
  elastic_serverless: 'elastic_serverless',
  system_indices_superuser: 'system_indices_superuser',
  admin: 'admin',
} as const;

/**
 * Siem feature versions to test.
 *
 * When a new `siem` version is implemented, please update the list below.
 */
export const SIEM_VERSIONS = [
  // deprecated siem versions
  'siem',
  'siemV2',

  // actual version, should equal to SECURITY_FEATURE_ID
  'siemV3',
] as const;

export type SiemVersion = (typeof SIEM_VERSIONS)[number];
