/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

/** The index/alias that holds `security-rule` prebuilt-rule asset saved objects. */
export const RULE_ASSET_INDEX = SECURITY_SOLUTION_SAVED_OBJECT_INDEX;

// The saved-object envelope a Fleet-installed `security-rule` asset would have. Mirrors
// `create_prebuilt_rule_saved_objects.ts` in the API-integration test utils.
const ruleAssetSavedObjectEsFields = {
  type: 'security-rule',
  references: [] as unknown[],
  coreMigrationVersion: '8.6.0',
  updated_at: '2022-11-01T12:56:39.717Z',
  created_at: '2022-11-01T12:56:39.717Z',
} as const;

/**
 * Base fields every real prebuilt `security-rule` asset carries. They matter because the upgrade
 * `_perform` endpoint validates the merged rule against a response schema where the "defaultable"
 * base fields are all REQUIRED (`BaseResponseProps` = `...BaseDefaultableFields.required()` in
 * `common/api/detection_engine/model/rule_schema/rule_schemas.gen.ts`). A seeded asset that omits
 * them makes the upgrade fail with e.g. `params invalid: [ ... path: ["author"], expected "array",
 * received "undefined" ]`. We set each to the value rule normalization applies on install, so the
 * seeded asset behaves like a real one and the upgrade validates. They're identical across the v1
 * and v2 assets, so they never show up as a diff/conflict — only the type-specific fields do.
 */
const ruleAssetBaseDefaults: Record<string, unknown> = {
  author: ['Elastic'],
  license: 'Elastic License v2',
  tags: ['test'],
  references: [],
  false_positives: [],
  threat: [],
  related_integrations: [],
  required_fields: [],
  risk_score_mapping: [],
  severity_mapping: [],
  max_signals: 100,
  interval: '5m',
  from: 'now-6m',
  to: 'now',
  setup: '',
  note: '',
};

interface SecurityRuleAsset {
  rule_id: string;
  version: number;
  name: string;
  description: string;
  severity: string;
  risk_score: number;
  // Type-specific fields (type, query/language, machine_learning_job_id, etc.).
  [key: string]: unknown;
}

export interface RuleAssetSavedObject {
  'security-rule': SecurityRuleAsset;
  type: string;
  references: unknown[];
  coreMigrationVersion: string;
  updated_at: string;
  created_at: string;
}

export interface BuildRuleAssetDocArgs {
  ruleId: string;
  version: number;
  name: string;
  /** Type-specific fields for the rule (e.g. `{ type: 'machine_learning', machine_learning_job_id }`). */
  typeSpecificFields: Record<string, unknown>;
}

/**
 * Builds a `security-rule` asset saved-object doc ready to be bulk-indexed. The doc `_id` is
 * deterministic (`security-rule:${rule_id}_${version}`); publishing a newer version is simply
 * indexing another doc with the same `rule_id` and a higher `version`.
 */
export const buildRuleAssetDoc = ({
  ruleId,
  version,
  name,
  typeSpecificFields,
}: BuildRuleAssetDocArgs): RuleAssetSavedObject => ({
  'security-rule': {
    ...ruleAssetBaseDefaults,
    rule_id: ruleId,
    version,
    name,
    description: 'ML coverage-loss upgrade repro (quickstart seeder)',
    severity: 'low',
    risk_score: 20,
    ...typeSpecificFields,
  },
  ...ruleAssetSavedObjectEsFields,
});

export const ruleAssetSavedObjectId = (ruleId: string, version: number): string =>
  `security-rule:${ruleId}_${version}`;
