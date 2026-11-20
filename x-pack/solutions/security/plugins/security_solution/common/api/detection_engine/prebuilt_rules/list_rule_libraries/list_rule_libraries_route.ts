/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RuleLibraryProviderType = 'fleet' | 'git' | 's3';
export type RuleLibraryScope = 'shared' | 'space';
export type RuleLibraryRefreshStatus = 'refreshed' | 'refreshing' | 'refresh_failed';

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
  // Unset until the library is refreshed for the first time.
  version?: string;
  refresh_status?: RuleLibraryRefreshStatus;
  refreshed_at?: string;
  last_error?: string;
  // Distinct rule_ids in the library. Libraries store every version of a rule, so this is not the item count.
  rule_count: number;
  source_url?: string;
  branch?: string;
}

export interface ListRuleLibrariesResponseBody {
  libraries: RuleLibrarySummary[];
}
