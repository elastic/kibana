/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ProviderType = 'fleet' | 'git' | 's3';
export type AuthType = 'none' | 'token' | 'basic' | 'ssh_key' | 's3_access_key';
export type RefreshStatus = 'refreshed' | 'refreshing' | 'refresh_failed';

export interface RuleLibraryProviderConfig {
  type: ProviderType;
  url?: string;
  branch?: string;
  region?: string;
  authType?: AuthType;
  username?: string;
  known_hosts?: string;
}

export interface RuleLibraryImage {
  src: string;
  title?: string;
  size?: string;
  type?: string;
}

export interface RuleLibraryOwner {
  type?: string;
  github?: string;
}

export interface RuleLibraryAttributes {
  name: string;
  title: string;
  description?: string;
  images?: RuleLibraryImage[];
  owner?: RuleLibraryOwner;
  license?: string;
  conditions?: Record<string, unknown>;
  space_id?: string;
  provider: RuleLibraryProviderConfig;
  // Top-level because ESO only encrypts flat attribute names; holds provider.authType's secret.
  secret?: string;
  pinned_version?: string;
  version?: string;
  ref?: string;
  previous_version?: string;
  refresh_status?: RefreshStatus;
  refresh_started_at?: string;
  refreshed_at?: string;
  last_error?: string | null;
  item_count?: number;
}

export interface RuleLibraryItem {
  rule_id: string;
  version: number;
  // File path inside the library, e.g. `rules/linux/reverse_shell.yml`.
  path: string;
  attributes: Record<string, unknown>;
}

export interface RuleKey {
  rule_id: string;
  version: number;
}

export interface LibraryVersionRef {
  version: string;
  ref?: unknown;
}

export interface RuleLibraryDefinition {
  id: string;
  provider: RuleLibraryProviderConfig;
  name: string;
  title: string;
  description?: string;
  license?: string;
  owner?: RuleLibraryOwner;
  pinned_version?: string;
}

export type RefreshOutcome = 'refreshed' | 'up_to_date' | 'skipped' | 'failed';

export interface RefreshResult {
  id: string;
  outcome: RefreshOutcome;
  version?: string;
  item_count?: number;
  error?: string;
}

// Same shape as Fleet's EnsurePackageResult, so the init flow can consume it unchanged.
export interface LibraryEnsureResult {
  status: 'installed' | 'already_installed';
  package: { name: string; version: string };
}
