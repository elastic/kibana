/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ThreatMapping,
  ThreatIndex,
  ThreatIndicatorPath,
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import type { ESBoolQuery } from '../../../../../../common/typed_json';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../../common/constants';

export interface BuildEsqlInlinestatsIndicatorMatchQueryOptions {
  inputIndex: string[];
  threatIndex: ThreatIndex;
  threatMapping: ThreatMapping;
  threatIndicatorPath?: ThreatIndicatorPath;
  from: string;
  to: string;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  dslFilter?: ESBoolQuery;
  maxSignals: number;
}

export interface EsqlInlinestatsIndicatorMatchQuery {
  query: string;
  hasMultipleMappings: boolean;
  mappingCount: number;
}

/**
 * Core threat indicator fields that are commonly available.
 * We'll dynamically add fields from the threat mapping.
 */
const CORE_THREAT_FIELDS = [
  'threat.indicator.type',
  'threat.feed.name',
];

/**
 * Builds an ES|QL query that emulates indicator match rule behavior using INLINESTATS + FORK.
 *
 * Key differences from LOOKUP JOIN approach:
 * - Uses INLINESTATS to broadcast aggregated threat data to matching source rows
 * - Works with data streams and aliases (no requirement for lookup mode index)
 * - Threat data is returned as arrays (via VALUES())
 * - DOES NOT MATCH logic uses MV_CONTAINS on aggregated arrays
 *
 * The query structure:
 * - Uses FROM to query both source and threat indices together
 * - Creates a common join key via EVAL + CASE
 * - Uses INLINESTATS to aggregate threat data by join key and broadcast to all rows
 * - Uses WHERE to filter for source rows that have matching threat data
 * - Uses FORK for OR logic between different threat mappings
 */
export const buildEsqlInlinestatsIndicatorMatchQuery = ({
  inputIndex,
  threatIndex,
  threatMapping,
  threatIndicatorPath = DEFAULT_INDICATOR_SOURCE_PATH,
  from,
  to,
  primaryTimestamp,
  secondaryTimestamp,
  dslFilter,
  maxSignals,
}: BuildEsqlInlinestatsIndicatorMatchQueryOptions): EsqlInlinestatsIndicatorMatchQuery => {
  const sourceIndexPattern = inputIndex.join(', ');
  const threatIndexPattern = threatIndex.join(', ');
  const hasMultipleMappings = threatMapping.length > 1;

  // Build the base FROM clause combining source and threat indices
  // METADATA _index is required to distinguish between source and threat rows
  const fromClause = `FROM ${sourceIndexPattern}, ${threatIndexPattern} METADATA _index, _id`;

  // Build the index discriminator condition (to identify source vs threat rows)
  const sourceIndexCondition = buildSourceIndexCondition(inputIndex);
  const threatIndexCondition = buildThreatIndexCondition(threatIndex);

  if (hasMultipleMappings) {
    // Use FORK for multiple mappings (OR logic)
    const forkBranches = threatMapping.map((mapping, index) =>
      buildInlinestatsForkBranch(
        mapping,
        index,
        sourceIndexCondition,
        threatIndexCondition,
        threatIndicatorPath,
        from,
        to,
        primaryTimestamp,
        secondaryTimestamp
      )
    );

    const query = `${fromClause}
| FORK ${forkBranches.join(' ')}
| SORT @timestamp DESC
| LIMIT ${maxSignals}`;

    return {
      query,
      hasMultipleMappings: true,
      mappingCount: threatMapping.length,
    };
  } else {
    // Single mapping - no FORK needed
    const mapping = threatMapping[0];
    const singleMappingQuery = buildSingleMappingQuery(
      mapping,
      0,
      sourceIndexCondition,
      threatIndexCondition,
      threatIndicatorPath,
      from,
      to,
      primaryTimestamp,
      secondaryTimestamp
    );

    const query = `${fromClause}
${singleMappingQuery}
| SORT @timestamp DESC
| LIMIT ${maxSignals}`;

    return {
      query,
      hasMultipleMappings: false,
      mappingCount: 1,
    };
  }
};

/**
 * Builds a condition to identify source index rows.
 * Handles both single indices and patterns.
 */
const buildSourceIndexCondition = (inputIndex: string[]): string => {
  if (inputIndex.length === 1) {
    const idx = inputIndex[0];
    if (idx.includes('*')) {
      // Pattern matching - use LIKE
      return `_index LIKE "${idx.replace(/\*/g, '%')}"`;
    }
    return `_index == "${idx}"`;
  }
  // Multiple indices - use OR
  const conditions = inputIndex.map((idx) => {
    if (idx.includes('*')) {
      return `_index LIKE "${idx.replace(/\*/g, '%')}"`;
    }
    return `_index == "${idx}"`;
  });
  return `(${conditions.join(' OR ')})`;
};

/**
 * Builds a condition to identify threat index rows.
 */
const buildThreatIndexCondition = (threatIndex: string[]): string => {
  if (threatIndex.length === 1) {
    const idx = threatIndex[0];
    if (idx.includes('*')) {
      return `_index LIKE "${idx.replace(/\*/g, '%')}"`;
    }
    return `_index == "${idx}"`;
  }
  const conditions = threatIndex.map((idx) => {
    if (idx.includes('*')) {
      return `_index LIKE "${idx.replace(/\*/g, '%')}"`;
    }
    return `_index == "${idx}"`;
  });
  return `(${conditions.join(' OR ')})`;
};

/**
 * Builds a FORK branch for a single threat mapping using INLINESTATS.
 */
const buildInlinestatsForkBranch = (
  mapping: ThreatMapping[number],
  mappingIndex: number,
  sourceIndexCondition: string,
  threatIndexCondition: string,
  _threatIndicatorPath: string,
  from: string,
  to: string,
  primaryTimestamp: string,
  secondaryTimestamp?: string
): string => {
  const query = buildSingleMappingQuery(
    mapping,
    mappingIndex,
    sourceIndexCondition,
    threatIndexCondition,
    _threatIndicatorPath,
    from,
    to,
    primaryTimestamp,
    secondaryTimestamp,
    false // no leading pipes for FORK branch
  );

  return `(${query})`;
};

/**
 * Builds the query components for a single threat mapping.
 */
const buildSingleMappingQuery = (
  mapping: ThreatMapping[number],
  mappingIndex: number,
  sourceIndexCondition: string,
  threatIndexCondition: string,
  threatIndicatorPath: string,
  from: string,
  to: string,
  primaryTimestamp: string,
  secondaryTimestamp?: string,
  includePipes: boolean = true
): string => {
  const nonNegatedEntries = mapping.entries.filter((entry) => entry.negate !== true);
  const negatedEntries = mapping.entries.filter((entry) => entry.negate === true);

  const pipe = includePipes ? '| ' : '';

  // Build the join key EVAL clause
  // For AND logic with multiple entries, we create a composite key
  const joinKeyEval = buildJoinKeyEval(nonNegatedEntries, sourceIndexCondition, threatIndexCondition);

  // Collect threat fields from the mapping for enrichment
  const threatFieldsFromMapping = collectThreatFieldsFromMapping(mapping);

  // Build the INLINESTATS clause to aggregate threat data
  const inlinestatsClause = buildInlinestatsClause(threatIndexCondition, negatedEntries, threatFieldsFromMapping);

  // Build the final WHERE clause to filter for matching source rows
  const finalWhere = buildFinalWhereClause(
    sourceIndexCondition,
    nonNegatedEntries,
    negatedEntries,
    from,
    to,
    primaryTimestamp,
    secondaryTimestamp
  );

  // Build the EVAL clause for enrichment metadata
  const enrichmentEval = buildEnrichmentMetadataEval(nonNegatedEntries, mappingIndex);

  // Combine all clauses
  return `${pipe}${joinKeyEval} | ${inlinestatsClause} | ${finalWhere} | ${enrichmentEval}`;
};

/**
 * Collects threat fields from the mapping for use in INLINESTATS.
 * Returns unique threat field names that should be collected via VALUES().
 */
const collectThreatFieldsFromMapping = (mapping: ThreatMapping[number]): string[] => {
  const fields = new Set<string>();

  // Add core fields that are commonly available
  CORE_THREAT_FIELDS.forEach((field) => fields.add(field));

  // Add threat fields from the mapping entries
  mapping.entries.forEach((entry) => {
    // entry.value is the threat field (e.g., "threat.indicator.ip")
    fields.add(entry.value);
  });

  return Array.from(fields);
};

/**
 * Builds the EVAL clause for creating the join key using CASE.
 * For multiple entries (AND logic), creates a composite key.
 *
 * CRITICAL: We include null checks in the CASE to ensure:
 * - If source field is null → join_key = NULL → filtered out
 * - If threat field is null → join_key = NULL → filtered out
 * This prevents false matches from null values being grouped together.
 */
const buildJoinKeyEval = (
  entries: ThreatMapping[number]['entries'],
  sourceIndexCondition: string,
  threatIndexCondition: string
): string => {
  if (entries.length === 1) {
    // Single entry - simple join key with null checks
    const entry = entries[0];
    // CASE with null checks:
    // - Source row with non-null field → use field value
    // - Threat row with non-null field → use field value
    // - Otherwise → NULL (will be filtered out)
    return `EVAL join_key = CASE(${sourceIndexCondition} AND ${entry.field} IS NOT NULL, TO_STRING(${entry.field}), ${threatIndexCondition} AND ${entry.value} IS NOT NULL, TO_STRING(${entry.value}), NULL)`;
  }

  // Multiple entries (AND logic) - create composite key with null checks
  // All fields must be non-null for the key to be valid
  const sourceNullChecks = entries.map((e) => `${e.field} IS NOT NULL`).join(' AND ');
  const threatNullChecks = entries.map((e) => `${e.value} IS NOT NULL`).join(' AND ');

  const sourceKeys = entries.map((e) => `TO_STRING(${e.field})`).join(', "::", ');
  const threatKeys = entries.map((e) => `TO_STRING(${e.value})`).join(', "::", ');

  return `EVAL join_key = CASE(${sourceIndexCondition} AND ${sourceNullChecks}, CONCAT(${sourceKeys}), ${threatIndexCondition} AND ${threatNullChecks}, CONCAT(${threatKeys}), NULL)`;
};

/**
 * Builds the INLINESTATS clause to aggregate threat data.
 */
const buildInlinestatsClause = (
  threatIndexCondition: string,
  negatedEntries: ThreatMapping[number]['entries'],
  threatFieldsFromMapping: string[]
): string => {
  const aggregations: string[] = [
    `threat_count = COUNT(*) WHERE ${threatIndexCondition}`,
    `threat_doc_ids = VALUES(_id) WHERE ${threatIndexCondition}`,
  ];

  // Track which fields have been added
  const addedFields = new Set<string>();

  // Add VALUES() for each threat field from the mapping
  threatFieldsFromMapping.forEach((field) => {
    const varName = field.replace(/\./g, '_');
    aggregations.push(`${varName} = VALUES(${field}) WHERE ${threatIndexCondition}`);
    addedFields.add(field);
  });

  // For DOES NOT MATCH entries, we need to collect the threat field values
  // so we can check if the source field value is in the array
  // We use the same variable name (not prefixed with "negated_") since the field
  // may already be collected above
  negatedEntries.forEach((entry) => {
    // Only add if not already included
    if (!addedFields.has(entry.value)) {
      const varName = entry.value.replace(/\./g, '_');
      aggregations.push(`${varName} = VALUES(${entry.value}) WHERE ${threatIndexCondition}`);
      addedFields.add(entry.value);
    }
  });

  return `INLINESTATS ${aggregations.join(', ')} BY join_key`;
};

/**
 * Builds the final WHERE clause to filter for matching source rows.
 * Includes:
 * - Source index filter
 * - join_key IS NOT NULL (critical: prevents false matches from null keys)
 * - Time range filter (only for source rows)
 * - threat_count > 0 (to confirm a match)
 * - DOES NOT MATCH conditions using MV_CONTAINS
 */
const buildFinalWhereClause = (
  sourceIndexCondition: string,
  nonNegatedEntries: ThreatMapping[number]['entries'],
  negatedEntries: ThreatMapping[number]['entries'],
  from: string,
  to: string,
  primaryTimestamp: string,
  secondaryTimestamp?: string
): string => {
  const conditions: string[] = [
    sourceIndexCondition,
    // CRITICAL: Filter out null/empty join keys to prevent false matches
    // When a source event doesn't have the matched field:
    // - join_key could be null (if field is null)
    // - join_key could be "" (if TO_STRING(null) returns empty string)
    // All rows with null/empty join_keys would be grouped together, causing false positives
    'join_key IS NOT NULL',
    'LENGTH(join_key) > 0',
    'threat_count > 0',
  ];

  // CRITICAL: Add null checks for source fields used in matching
  // This prevents false positives from rows that don't have the matched field
  // For example, if we're matching on destination.ip, only include rows that HAVE a destination.ip
  nonNegatedEntries.forEach((entry) => {
    conditions.push(`${entry.field} IS NOT NULL`);
  });

  // Add time range condition
  const timeCondition = buildTimeRangeCondition(primaryTimestamp, secondaryTimestamp, from, to);
  conditions.push(timeCondition);

  // Add DOES NOT MATCH conditions
  // For each negated entry, exclude rows where the source field value IS in the threat values array
  // We use the regular variable name (without "negated_" prefix) since the field is collected
  // in INLINESTATS with that name
  negatedEntries.forEach((entry) => {
    const varName = entry.value.replace(/\./g, '_');
    // NOT MV_CONTAINS(threat_values_array, source_field_value)
    // If the source field is null, MV_CONTAINS returns null, so we also need to handle that
    conditions.push(`(${entry.field} IS NULL OR NOT MV_CONTAINS(${varName}, ${entry.field}))`);
  });

  return `WHERE ${conditions.join(' AND ')}`;
};

/**
 * Builds the time range condition for source documents.
 */
const buildTimeRangeCondition = (
  primaryTimestamp: string,
  secondaryTimestamp: string | undefined,
  from: string,
  to: string
): string => {
  const primaryCondition = `(${primaryTimestamp} >= "${from}" AND ${primaryTimestamp} <= "${to}")`;

  if (secondaryTimestamp) {
    return `(${primaryCondition} OR (${primaryTimestamp} IS NULL AND ${secondaryTimestamp} >= "${from}" AND ${secondaryTimestamp} <= "${to}"))`;
  }

  return primaryCondition;
};

/**
 * Builds the EVAL clause for enrichment metadata.
 */
const buildEnrichmentMetadataEval = (
  entries: ThreatMapping[number]['entries'],
  mappingIndex: number
): string => {
  // Build matched.atomic - the source field value(s) that matched
  const atomicValues = entries.map((e) => `TO_STRING(${e.field})`);
  const atomicExpr =
    atomicValues.length === 1 ? atomicValues[0] : `CONCAT(${atomicValues.join(', ":", ')})`;

  // Build matched.field - the source field(s) that matched
  const matchedFields = entries.map((e) => e.field).join(',');

  const evalAssignments = [
    `matched_atomic = ${atomicExpr}`,
    `matched_field = "${matchedFields}"`,
    `matched_type = "indicator_match_rule"`,
    `mapping_index = ${mappingIndex}`,
  ].join(', ');

  return `EVAL ${evalAssignments}`;
};

/**
 * Validates that a threat mapping is compatible with ES|QL INLINESTATS approach
 */
export const validateThreatMappingForInlinestats = (threatMapping: ThreatMapping): string[] => {
  const errors: string[] = [];

  if (threatMapping.length === 0) {
    errors.push('Threat mapping must have at least one mapping entry');
  }

  threatMapping.forEach((mapping, index) => {
    if (mapping.entries.length === 0) {
      errors.push(`Mapping at index ${index} has no entries`);
    }

    const nonNegatedEntries = mapping.entries.filter((entry) => entry.negate !== true);
    if (nonNegatedEntries.length === 0) {
      errors.push(`Mapping at index ${index} has no non-negated entries`);
    }

    // Check for unsupported patterns
    mapping.entries.forEach((entry, entryIndex) => {
      if (entry.field.includes('*') || entry.value.includes('*')) {
        errors.push(
          `Mapping at index ${index}, entry ${entryIndex}: Wildcards are not supported in ES|QL INLINESTATS approach`
        );
      }
    });
  });

  return errors;
};
