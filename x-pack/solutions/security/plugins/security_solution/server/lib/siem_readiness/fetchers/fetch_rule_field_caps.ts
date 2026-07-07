/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { MissingFieldDetail, MissingFieldsEntry, RequiredField } from '@kbn/siem-readiness';

type FieldMappingStatus = 'mapped' | 'partial' | 'missing';

interface FieldMappingResult {
  status: FieldMappingStatus;
  unmappedIn: string[];
}

/**
 * Extracts the parent data stream name from a backing index name.
 * Backing indices follow the pattern: .ds-{data_stream_name}-YYYY.MM.DD-NNNNNN
 */
const extractDataStreamName = (indexName: string): string | undefined => {
  const match = indexName.match(/^\.ds-(.+)-\d{4}\.\d{2}\.\d{2}-\d+$/);
  return match?.[1];
};

const normalizeIndexNames = (indexNames: string[]): string[] => {
  const normalized = indexNames.map((indexName) => extractDataStreamName(indexName) ?? indexName);
  return [...new Set(normalized)];
};

const toIndexArray = (indices: string | string[]): string[] =>
  Array.isArray(indices) ? indices : [indices];

/**
 * Classifies each requested field as mapped, partially mapped, or fully unmapped across
 * the given indices using fieldCaps with include_unmapped. Returns null when the request
 * fails — callers use null to skip the group without blocking others.
 */
const fetchFieldMappingStatus = async (
  esClient: ElasticsearchClient,
  indices: string[],
  fields: string[]
): Promise<Map<string, FieldMappingResult> | null> => {
  try {
    const response = await esClient.fieldCaps({
      index: indices,
      fields,
      include_unmapped: true,
      ignore_unavailable: true,
      allow_no_indices: true,
    });

    const results = new Map<string, FieldMappingResult>();

    for (const field of fields) {
      const caps = response.fields?.[field];
      if (!caps) {
        results.set(field, { status: 'missing', unmappedIn: normalizeIndexNames(indices) });
      } else {
        const hasUnmapped = 'unmapped' in caps;
        const hasMapped = Object.keys(caps).some((type) => type !== 'unmapped');
        const unmappedIndices = caps.unmapped?.indices ?? indices;
        const unmappedIn = normalizeIndexNames(toIndexArray(unmappedIndices));

        if (hasMapped && !hasUnmapped) {
          results.set(field, { status: 'mapped', unmappedIn: [] });
        } else if (hasMapped && hasUnmapped) {
          results.set(field, { status: 'partial', unmappedIn });
        } else {
          results.set(field, { status: 'missing', unmappedIn });
        }
      }
    }

    return results;
  } catch {
    return null;
  }
};

/**
 * For each enabled rule that declares `required_fields`, checks whether those fields
 * are mapped in every query/event index the rule uses (from ruleQueryIndices — not indexToRules,
 * which also includes auxiliary sources such as threat_match indicator indices).
 *
 * Uses fieldCaps with include_unmapped so a field mapped in only some queried indices
 * is flagged as partial (the rule matches partially). Fields unmapped in all queried
 * indices are flagged as missing (the rule silently matches nothing).
 *
 * Rules that share the same (indexPatterns, requiredFieldNames) combination share one
 * `fieldCaps` call — this deduplication keeps the number of ES requests proportional
 * to unique (indexPattern, fieldSet) pairs, not to the number of rules.
 *
 * Returns one entry per rule that has at least one partial or missing required field.
 * Rules with empty `required_fields` are skipped (no call, no entry).
 */
export const fetchRuleFieldCaps = async ({
  esClient,
  ruleQueryIndices,
  ruleNames,
  ruleRequiredFields,
}: {
  esClient: ElasticsearchClient;
  /** ruleId → query/event indices whose schema required_fields describe. */
  ruleQueryIndices: Map<string, string[]>;
  ruleNames: Map<string, string>;
  ruleRequiredFields: Map<string, RequiredField[]>;
}): Promise<MissingFieldsEntry[]> => {
  // Group rules by cache key: sortedIndices|sortedFieldNames
  // Rules sharing the same (indices, fields) share one fieldCaps call.
  interface Group {
    indices: string[];
    fields: string[];
    ruleIds: string[];
  }
  const groups = new Map<string, Group>();

  for (const [ruleId, requiredFields] of ruleRequiredFields.entries()) {
    const indices = ruleQueryIndices.get(ruleId);

    // Skip rules with no declared required fields or no resolved indices.
    if (requiredFields.length > 0 && indices && indices.length > 0) {
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
  }

  // Groups are independent, so run their fieldCaps calls concurrently.
  // fetchFieldMappingStatus never rejects (it returns null on failure), so Promise.all is safe.
  const groupList = [...groups.values()];
  const fieldStatusByGroup = await Promise.all(
    groupList.map(({ indices, fields }) => fetchFieldMappingStatus(esClient, indices, fields))
  );

  const results: MissingFieldsEntry[] = [];

  groupList.forEach(({ ruleIds }, groupIndex) => {
    // null signals that fieldCaps failed for this group — skip it so one bad group
    // doesn't block the others.
    const fieldStatus = fieldStatusByGroup[groupIndex];
    if (!fieldStatus) return;

    for (const ruleId of ruleIds) {
      const requiredFieldNames = ruleRequiredFields.get(ruleId)?.map((f) => f.name) ?? [];
      const fieldDetails: MissingFieldDetail[] = [];

      for (const fieldName of requiredFieldNames) {
        const mapping = fieldStatus.get(fieldName);
        if (mapping && mapping.status !== 'mapped') {
          fieldDetails.push({
            name: fieldName,
            status: mapping.status,
            ...(mapping.unmappedIn.length > 0 ? { unmappedIn: mapping.unmappedIn } : {}),
          });
        }
      }

      if (fieldDetails.length > 0) {
        results.push({
          ruleId,
          ruleName: ruleNames.get(ruleId) ?? ruleId,
          fields: fieldDetails,
        });
      }
    }
  });

  return results;
};
