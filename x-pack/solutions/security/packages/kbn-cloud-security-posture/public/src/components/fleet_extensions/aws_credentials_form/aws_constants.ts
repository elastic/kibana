/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CLOUDBEAT_AWS = 'cloudbeat/cis_aws';

export const AWS_SETUP_FORMAT = {
  CLOUD_FORMATION: 'cloud_formation',
  MANUAL: 'manual',
};

export const AWS_SINGLE_ACCOUNT = 'single_account';
export const AWS_ORGANIZATION_ACCOUNT = 'organization_account';
export const AWS_CREDENTIALS_TYPE = {
  CLOUD_CONNECTORS: 'cloud_connectors',
  ASSUME_ROLE: 'assume_role',
  DIRECT_ACCESS_KEYS: 'direct_access_keys',
  TEMPORARY_KEYS: 'temporary_keys',
  SHARED_CREDENTIALS: 'shared_credentials',
  CLOUD_FORMATION: 'cloud_formation',
} as const;
