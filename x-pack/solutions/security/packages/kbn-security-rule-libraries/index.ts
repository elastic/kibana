/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  RULE_LIBRARY_SO_TYPE,
  PREBUILT_RULE_SO_TYPE,
  ELASTIC_LIBRARY_ID,
  COMMUNITY_LIBRARY_ID,
  BATCH_SIZE,
  SCAN_MAX_RESPONSE_BYTES,
  SYNC_LOCK_TIMEOUT_MS,
} from './src/constants';
export { RULE_LIBRARY_DEFINITIONS } from './src/definitions';
export { parseManifest, MAX_MANIFEST_BYTES, type RuleLibraryManifest } from './src/manifest';
export { scanLibrary, type LibraryScanResult } from './src/scan/scan_library';
export { ruleLibraryType } from './src/saved_objects/rule_library_type';
export { ruleLibraryEncryption } from './src/saved_objects/encryption';
export {
  createProvider,
  FleetProvider,
  GitProvider,
  S3Provider,
  type RuleLibraryProvider,
  type ItemBatch,
  type ProviderFactoryDeps,
} from './src/providers';
export { ensureLibraries, type EnsureParams } from './src/sync/ensure_libraries';
export { syncRuleLibrary, type SyncParams } from './src/sync/sync_rule_library';
export {
  syncRuleLibraries,
  type SyncRuleLibrariesParams,
  type SyncRuleLibrariesResult,
} from './src/sync/sync_rule_libraries';

export type {
  AuthType,
  LibraryEnsureResult,
  LibraryVersionRef,
  ProviderType,
  RuleKey,
  RuleLibraryAttributes,
  RuleLibraryDefinition,
  RuleLibraryImage,
  RuleLibraryItem,
  RuleLibraryOwner,
  RuleLibraryProviderConfig,
  SyncOutcome,
  SyncResult,
  SyncStatus,
} from './src/types';
