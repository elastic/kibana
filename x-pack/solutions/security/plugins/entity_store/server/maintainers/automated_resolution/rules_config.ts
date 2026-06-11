/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stage 0: All 5 OOTB rule IDs.
 */
export const STAGE_0_RULE_IDS = ['S1', 'S2', 'S3', 'CF1', 'CF4'] as const;
export type Stage0RuleId = (typeof STAGE_0_RULE_IDS)[number];

interface BaseRuleConfig {
  id: Stage0RuleId;
  description: string;
  entityType: 'user' | 'host' | 'service' | 'generic';
  /**
   * Namespace priority for target selection (most-preferred first).
   * Entities in earlier namespaces become the resolution group target.
   */
  namespacePriority: string[];
}

/**
 * Same-field rule: both sides compare the same ECS field.
 * Examples: S1 (email), S2 (SID), S3 (Entra GUID), CF4 (CrowdStrike SID).
 */
export interface SameFieldRuleConfig extends BaseRuleConfig {
  kind: 'same_field';
  /** ECS field to match on (same field name on both sides). */
  matchField: string;
  /** When set, only entities in these namespaces participate. */
  namespaceFilter?: string[];
  /**
   * Well-known values to exclude (e.g. system SIDs S-1-5-18/19/20).
   * Applied as a `must_not.terms` filter in Step 1.
   */
  exclusionList?: string[];
  /**
   * Regex string.  After Step 1 collecting raw values, only values matching
   * this pattern are kept before the Step 2 group lookup.  Used by S3 (GUID
   * shape) and CF4 (SID prefix).
   */
  matchPattern?: string;
}

/**
 * Cross-field rule: left side uses one ECS field + namespace, right side uses
 * a different ECS field + namespace.  Example: CF1 (m365 user.id ↔ entra user.name).
 *
 * Execution uses Pattern B: `EVAL + STATS BY upn_value` ESQL query.
 */
export interface CrossFieldRuleConfig extends BaseRuleConfig {
  kind: 'cross_field';
  leftField: string;
  leftNamespace: string;
  rightField: string;
  rightNamespace: string;
}

export type ResolutionRuleConfig = SameFieldRuleConfig | CrossFieldRuleConfig;

// Well-known Windows SIDs to exclude from S2 (built-in accounts / well-known groups)
const WELL_KNOWN_WINDOWS_SIDS = [
  'S-1-5-18', // SYSTEM (Local)
  'S-1-5-19', // NT AUTHORITY\LOCAL SERVICE
  'S-1-5-20', // NT AUTHORITY\NETWORK SERVICE
  'S-1-5-32-544', // Administrators
  'S-1-5-32-545', // Users
  'S-1-5-32-546', // Guests
  'S-1-5-32-547', // Power Users
  'S-1-5-32-548', // Account Operators
  'S-1-5-32-549', // Server Operators
  'S-1-5-32-550', // Print Operators
  'S-1-5-32-551', // Backup Operators
  'S-1-5-32-552', // Replicators
  'S-1-5-32-553', // RAS and IAS Servers
  'S-1-5-32-554', // Pre-Windows 2000 Compatible Access
];

/**
 * Stage 0 OOTB resolution rules.
 *
 * - S1, S2, S3, CF4 are same-field rules using the 2-step collect/group ES pattern.
 * - CF1 is a cross-field rule using the EVAL+STATS ESQL pattern.
 *
 * PR A activates S1.  PR B activates S2, S3, CF4.  PR C activates CF1.
 */
export const OOTB_RESOLUTION_RULES: ResolutionRuleConfig[] = [
  // ── S1: Email exact match (PR A) ───────────────────────────────────────────
  {
    kind: 'same_field',
    id: 'S1',
    description: 'Email exact match across all identity-provider namespaces',
    matchField: 'user.email',
    entityType: 'user',
    namespacePriority: ['active_directory', 'okta', 'entra_id', 'microsoft_365', 'local'],
  },

  // ── S2: Windows SID bridge (PR B) ─────────────────────────────────────────
  {
    kind: 'same_field',
    id: 'S2',
    description: 'Windows SID bridge (system/windows → active_directory)',
    matchField: 'user.id',
    entityType: 'user',
    namespaceFilter: ['system', 'windows', 'active_directory'],
    namespacePriority: ['active_directory', 'system', 'windows'],
    exclusionList: WELL_KNOWN_WINDOWS_SIDS,
  },

  // ── S3: Entra GUID bridge (PR B) ──────────────────────────────────────────
  {
    kind: 'same_field',
    id: 'S3',
    description: 'Entra GUID bridge (m365_defender ↔ entra_id via AccountObjectId)',
    matchField: 'user.id',
    entityType: 'user',
    namespaceFilter: ['m365_defender', 'entra_id'],
    namespacePriority: ['entra_id', 'm365_defender'],
    // Isolates IdentityInfo GUID events from IdentityLogon SID events
    matchPattern: '^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$',
  },

  // ── CF4: CrowdStrike SID bridge (PR B) ────────────────────────────────────
  {
    kind: 'same_field',
    id: 'CF4',
    description: 'CrowdStrike Windows SID bridge (crowdstrike → active_directory)',
    matchField: 'user.id',
    entityType: 'user',
    namespaceFilter: ['crowdstrike', 'active_directory'],
    namespacePriority: ['active_directory', 'crowdstrike'],
    // Excludes Linux POSIX UIDs — only keep Windows SIDs
    matchPattern: '^S-1-5-',
  },

  // ── CF1: UPN bridge (PR C) ────────────────────────────────────────────────
  {
    kind: 'cross_field',
    id: 'CF1',
    description: 'UPN bridge: microsoft_365 user.id ↔ entra_id user.name',
    entityType: 'user',
    namespacePriority: ['entra_id', 'microsoft_365'],
    leftField: 'user.id',
    leftNamespace: 'microsoft_365',
    rightField: 'user.name',
    rightNamespace: 'entra_id',
  },
];
