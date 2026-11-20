/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ANALYTICS_APP_API_KEY_PATH = '/internal/search_homepage/analytics/app_api_key';

const APP_API_KEY_NAME_PREFIX = 'analytics-app-read-';

/** Elasticsearch limits an API key name to this many characters. */
const MAX_API_KEY_NAME_LENGTH = 256;

export const getAppApiKeyName = (index: string): string =>
  `${APP_API_KEY_NAME_PREFIX}${index}`.slice(0, MAX_API_KEY_NAME_LENGTH);

export interface AppApiKeyRoleDescriptors {
  [roleName: string]: {
    cluster: string[];
    indices: Array<{ names: string[]; privileges: string[] }>;
  };
}

/** What a key for an application may do: read one index or data stream, and nothing else. */
export const getAppApiKeyRoleDescriptors = (index: string): AppApiKeyRoleDescriptors => ({
  analytics_app_read: {
    cluster: [],
    indices: [{ names: [index], privileges: ['read'] }],
  },
});

/** Why the caller cannot create a key for the source. */
export type AppApiKeyUnavailableReason =
  | 'apiKeysDisabled'
  | 'missingApiKeyPrivilege'
  | 'missingReadPrivilege'
  | 'sourceNotFound';

export type AnalyticsAppApiKeyAvailability =
  | { canCreate: true }
  | { canCreate: false; reason: AppApiKeyUnavailableReason };

export interface AnalyticsAppApiKeyRequest {
  index: string;
}

export interface AnalyticsAppApiKeyResult {
  id: string;
  name: string;
  /** The credential to send as `Authorization: ApiKey <encoded>`; Elasticsearch returns it once. */
  encoded: string;
}
