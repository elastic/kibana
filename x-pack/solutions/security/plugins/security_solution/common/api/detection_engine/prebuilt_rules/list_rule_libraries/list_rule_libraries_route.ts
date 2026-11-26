/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RuleLibraryProviderType = 'fleet' | 'git' | 's3';
export type RuleLibraryScope = 'shared' | 'space';
export type RuleLibrarySyncStatus = 'synced' | 'syncing' | 'sync_failed';

export interface RuleLibrarySummary {
  id: string;
  title: string;
  description?: string;
  provider: RuleLibraryProviderType;
  // True for the libraries that ship with Kibana. Every library added by a user is not.
  built_in: boolean;
  owner_type?: string;
  license?: string;
  scope: RuleLibraryScope;
  // Unset until the library is synced for the first time.
  version?: string;
  sync_status?: RuleLibrarySyncStatus;
  synced_at?: string;
  last_error?: string;
  // Only while the library is syncing: how many of its rules are saved so far. No total means it is unknown.
  sync_progress?: { done: number; total?: number };
  // Distinct rule_ids in the library. Libraries store every version of a rule, so this is not the item count.
  rule_count: number;
  source_url?: string;
  branch?: string;
}

export interface ListRuleLibrariesResponseBody {
  libraries: RuleLibrarySummary[];
}
