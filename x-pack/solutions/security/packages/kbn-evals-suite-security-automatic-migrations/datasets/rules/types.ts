/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';

/**
 * Source SIEM the rule was exported from. Values must match `OriginalRuleVendor` in
 * `security_solution/common/siem_migrations/model/rule_migration.gen.ts`, since they are
 * posted verbatim to the rule-migration API.
 */
export type RuleVendor = 'splunk' | 'qradar' | 'microsoft-sentinel';

/** Ground truth for a single rule translation. */
export interface RuleExpected {
  /** Expected translation result classification */
  translation_result: 'full' | 'partial' | 'untranslatable';
  /** Expected ES|QL query (null if untranslatable) */
  esql_query: string | null;
  /** Expected index pattern in FROM clause (null if untranslatable) */
  index_pattern: string | null;
  /** Expected Elastic integration ID (null if none) */
  integration_id: string | null;
  /** Expected prebuilt rule ID (null if no match expected) */
  prebuilt_rule_id: string | null;
  /** Whether LOOKUP JOIN is expected in the translated ESQL */
  has_lookup_join: boolean;
  /** Whether the rule contains unsupported constructs */
  is_unsupported: boolean;
}

/**
 * Input for a single rule migration evaluation.
 * Mirrors the shape expected by POST /internal/siem_migrations/rules/{id}/rules
 */
export interface RuleInput {
  original_rule: {
    id: string;
    vendor: RuleVendor;
    title: string;
    description: string;
    query: string;
    query_language: string;
    annotations?: { mitre_attack?: string[] };
    severity?: string;
  };
  resources: Array<{
    type: string;
    name: string;
    content: string;
  }>;
}

export interface RuleMetadata {
  vendor: RuleVendor;
  category:
    | 'simple'
    | 'with_macros'
    | 'with_lookups'
    | 'with_building_blocks'
    | 'with_reference_sets'
    | 'unsupported'
    | 'prebuilt_match'
    | 'integration_match';
  complexity: 'low' | 'medium' | 'high';
}

export type RuleExample = Example<
  RuleInput & Record<string, unknown>,
  RuleExpected,
  RuleMetadata & Record<string, unknown>
>;
