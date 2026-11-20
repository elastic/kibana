/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '../../../../../common/api/detection_engine/model/rule_schema';

export type RuleLibraryProviderType = 'fleet' | 'git' | 's3';
export type RuleLibraryGroup = 'elastic' | 'custom';
export type RuleLibraryScope = 'shared' | 'space';
export type RuleLibrarySyncStatus = 'never_synced' | 'synced' | 'syncing' | 'sync_failed';
export type LibraryRuleInstallState = 'installable' | 'installed' | 'installed_from_other_library';

export interface RuleLibraryListItem {
  id: string;
  group: RuleLibraryGroup;
  title: string;
  description: string;
  icon: string;
  provider: RuleLibraryProviderType;
  version?: string;
  ruleCount: number;
  syncStatus: RuleLibrarySyncStatus;
  syncedAt?: string;
  lastError?: string;
  // Only while syncing. No total means it is not known.
  syncProgress?: { done: number; total?: number };
  owner: string;
  license: string;
  scope: RuleLibraryScope;
  sourceUrl?: string;
  branch?: string;
}

export interface LibraryRuleIntegration {
  packageName: string;
  title: string;
}

export interface LibraryRulesSort {
  field: 'name' | 'severity' | 'riskScore';
  direction: 'asc' | 'desc';
}

export interface LibraryRuleRow {
  id: string;
  ruleId: string;
  version: number;
  libraryId: string;
  name: string;
  description: string;
  integrations: readonly LibraryRuleIntegration[];
  tags: readonly string[];
  severity: Severity;
  riskScore: number;
  installState: LibraryRuleInstallState;
  installedFromLibraryTitle?: string;
}

export interface LibraryListPlaceholderRow {
  id: string;
  libraryId: string;
  name: string;
  description: string;
  listId: string;
  type: string;
  itemCount: number;
  summary?: string;
  preview?: readonly string[];
}

export type LibrarySource = 'git_http' | 'git_ssh' | 's3';
export type NewRuleLibraryAuthType = 'none' | 'token' | 'ssh_key' | 's3_access_key';

export interface NewRuleLibraryInput {
  scope: RuleLibraryScope;
  source: LibrarySource;
  url: string;
  branch: string;
  region: string;
  authType: NewRuleLibraryAuthType;
  username: string;
  secret: string;
  knownHosts: string;
  pinnedVersion: string;
}
