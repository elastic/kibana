/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CLOUDBEAT_GCP = 'cloudbeat/cis_gcp';

export const MIN_VERSION_GCP_CIS = '1.5.2';

export const GCP_SETUP_ACCESS = {
  CLOUD_SHELL: 'google_cloud_shell',
  MANUAL: 'manual',
};

export const GCP_SINGLE_ACCOUNT = 'single_account';
export const GCP_ORGANIZATION_ACCOUNT = 'organization_account';
export const GCP_CREDENTIALS_TYPE = {
  CREDENTIALS_FILE: 'credentials-file',
  CREDENTIALS_JSON: 'credentials-json',
  CREDENTIALS_NONE: 'credentials-none',
} as const;
