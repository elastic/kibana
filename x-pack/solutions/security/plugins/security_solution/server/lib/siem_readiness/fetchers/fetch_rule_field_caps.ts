/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { IndexToRulesMap, RequiredField } from '@kbn/siem-readiness';

export interface MissingFieldsEntry {
  ruleId: string;
  ruleName: string;
  missingFields: string[];
}

/**
 * For each enabled rule that declares `required_fields`, checks whether those fields
 * are mapped in the indices the rule queries.
 *
 * Rules that share the same (indexPatterns, requiredFieldNames) combination share one
 * `fieldCaps` call — this deduplication keeps the number of ES requests proportional
 * to unique (indexPattern, fieldSet) pairs, not to the number of rules.
 *
 * Returns one entry per rule that has at least one unmapped required field.
 * Rules with empty `required_fields` are skipped (no call, no entry).
 */
export const fetchRuleFieldCaps = async ({
  esClient,
  indexToRules,
  ruleRequiredFields,
}: {
  esClient: ElasticsearchClient;
  indexToRules: IndexToRulesMap;
  ruleRequiredFields: Map<string, RequiredField[]>;
}): Promise<MissingFieldsEntry[]> => {
  // Build reverse lookup: ruleId → index names
  const ruleToIndices = new Map<string, string[]>();
  for (const [indexName, rules] of indexToRules.entries()) {
    for (const rule of rules) {
      const existing = ruleToIndices.get(rule.id) ?? [];
      if (!existing.includes(indexName)) {
        existing.push(indexName);
      }
      ruleToIndices.set(rule.id, existing);
    }
  }

  // Build ruleId → ruleName lookup from indexToRules
  const ruleNames = new Map<string, string>();
  for (const rules of indexToRules.values()) {
    for (const rule of rules) {
      if (!ruleNames.has(rule.id)) {
        ruleNames.set(rule.id, rule.name);
      }
    }
  }

  // Group rules by cache key: sortedIndices|sortedFieldNames
  // Rules sharing the same (indices, fields) share one fieldCaps call.
  interface Group {
    indices: string[];
    fields: string[];
    ruleIds: string[];
  }
  const groups = new Map<string, Group>();

  for (const [ruleId, requiredFields] of ruleRequiredFields.entries()) {
    if (requiredFields.length === 0) continue;

    const indices = ruleToIndices.get(ruleId);
    if (!indices || indices.length === 0) continue;

    const sortedIndices = [...indices].sort();
    const sortedFields = requiredFields.map((f) => f.name).sort();
    const key = `${sortedIndices.join(',')}|${sortedFields.join(',')}`;

    const existing = groups.get(key);
    if (existing) {
      existing.ruleIds.push(ruleId);
    } else {
      groups.set(key, { indices: sortedIndices, fields: sortedFields, ruleIds: [ruleId] });
    }
  }

  const results: MissingFieldsEntry[] = [];

  for (const { indices, fields, ruleIds } of groups.values()) {
    let presentFields: Set<string>;

    try {
      const response = await esClient.fieldCaps({
        index: indices,
        fields,
        ignore_unavailable: true,
        allow_no_indices: true,
      });
      presentFields = new Set(Object.keys(response.fields ?? {}));
    } catch {
      // If fieldCaps fails for this group, skip it — don't block other groups
      continue;
    }

    for (const ruleId of ruleIds) {
      const requiredFieldNames =
        ruleRequiredFields.get(ruleId)?.map((f) => f.name) ?? [];
      const missingFields = requiredFieldNames.filter((f) => !presentFields.has(f));

      if (missingFields.length > 0) {
        results.push({
          ruleId,
          ruleName: ruleNames.get(ruleId) ?? ruleId,
          missingFields,
        });
      }
    }
  }

  return results;
};
