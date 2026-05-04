/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../prebuilt_rule_assets_type';

/**
 * Top-level `security-rule` attribute keys that must be fetched from ES no
 * matter what `fields` the caller asks for, otherwise the rule will fail
 * `validatePrebuiltRuleAssets` or `convertPrebuiltRuleAssetToRuleResponse`.
 *
 */
export const PREBUILT_RULE_ASSET_BASELINE_FIELDS: ReadonlySet<string> = new Set([
  // Identity / shared base required
  'rule_id',
  'version',
  'type',
  'name',
  'description',
  'risk_score',
  'severity',

  // Per rule type variant required fields.
  'query',
  'language',
  'saved_id',
  'threshold',
  'threat_query',
  'threat_mapping',
  'threat_index',
  'anomaly_threshold',
  'machine_learning_job_id',
  'new_terms_fields',
  'history_window_start',
]);

export const buildPrebuiltRuleAssetSourceIncludes = (
  requestedFields?: string[]
): string[] | undefined => {
  if (!requestedFields?.length) {
    return undefined;
  }

  const merged = new Set<string>([...requestedFields, ...PREBUILT_RULE_ASSET_BASELINE_FIELDS]);
  const attributePaths = Array.from(merged).map(
    (field) => `${PREBUILT_RULE_ASSETS_SO_TYPE}.${field}`
  );

  return [...attributePaths];
};
