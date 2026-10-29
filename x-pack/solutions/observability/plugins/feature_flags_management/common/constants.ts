/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'featureFlagsManagement';
export const FEATURE_ID = PLUGIN_ID;
export const APP_ID = PLUGIN_ID;
export const APP_ROUTE = '/app/feature_flags';

export const API_BASE_PATH = '/api/feature_flags';
export const API_VERSION = '2023-10-31';
export const API_OAS_TAG = 'oas-tag:feature flags';

export const API_PATHS = {
  environments: `${API_BASE_PATH}/environments`,
  environment: `${API_BASE_PATH}/environments/{environment}`,
  apps: `${API_BASE_PATH}/apps`,
  app: `${API_BASE_PATH}/apps/{app}`,
  appCredentials: `${API_BASE_PATH}/apps/{app}/credentials`,
  appCredential: `${API_BASE_PATH}/apps/{app}/credentials/{environment}`,
  appCredentialRotate: `${API_BASE_PATH}/apps/{app}/credentials/{environment}/_rotate`,
  flags: `${API_BASE_PATH}/flags`,
  flagTags: `${API_BASE_PATH}/flags/_tags`,
  flag: `${API_BASE_PATH}/flags/{key}`,
  flagRestore: `${API_BASE_PATH}/flags/{key}/_restore`,
  flagHistory: `${API_BASE_PATH}/flags/{key}/_history`,
  observedContexts: `${API_BASE_PATH}/observed_contexts`,
  observedContextAttributes: `${API_BASE_PATH}/observed_contexts/attributes`,
  observedContextValues: `${API_BASE_PATH}/observed_contexts/values`,
} as const;

/** Kibana API privileges. `manage` gates every write route, `read` every read route. */
export const API_PRIVILEGES = {
  read: 'read_feature_flags',
  manage: 'manage_feature_flags',
} as const;

/** UI capabilities exposed under `capabilities.featureFlagsManagement`. */
export const UI_CAPABILITIES = {
  show: 'show',
  save: 'save',
} as const;

export const SDK_KEY_PREFIX = 'ffsdk-';
export const CLIENT_ID_PREFIX = 'ffcli-';
/** Number of trailing SDK key characters kept in clear text so users can tell keys apart. */
export const SDK_KEY_HINT_LENGTH = 4;

/** Bounds applied to every HTTP input. */
export const LIMITS = {
  entityKeyMaxLength: 64,
  flagKeyMaxLength: 256,
  nameMaxLength: 256,
  descriptionMaxLength: 4096,
  versionMaxLength: 256,
  tagMaxLength: 64,
  maxTags: 50,
  usernameMaxLength: 1024,
  fullNameMaxLength: 1024,
  maxApps: 50,
  maxEnvironments: 50,
  minVariations: 2,
  maxVariations: 20,
  stringValueMaxLength: 1024,
  attributeMaxLength: 256,
  maxMatchValues: 100,
  maxRulesPerLevel: 100,
  maxRulesTotal: 500,
  maxRuleDepth: 5,
  maxPrerequisites: 20,
  searchMaxLength: 256,
  prefixMaxLength: 256,
  contextKeyMaxLength: 512,
  maxPerPage: 100,
  maxPage: 100,
  maxEntitiesPerPage: 1000,
  maxSuggestions: 100,
  defaultSuggestions: 20,
  historyMaxPerPage: 100,
} as const;
