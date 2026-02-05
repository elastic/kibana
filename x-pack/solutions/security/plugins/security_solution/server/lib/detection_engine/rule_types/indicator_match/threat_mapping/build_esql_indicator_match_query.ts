/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type {
  ThreatMapping,
  ThreatIndex,
  ThreatIndicatorPath,
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import type { ESBoolQuery } from '../../../../../../common/typed_json';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../../common/constants';

export interface BuildEsqlIndicatorMatchQueryOptions {
  inputIndex: string[];
  threatIndex: ThreatIndex;
  threatMapping: ThreatMapping;
  threatIndicatorPath?: ThreatIndicatorPath;
  from: string;
  to: string;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  dslFilter?: ESBoolQuery;
  exceptionFilter?: Filter;
  maxSignals: number;
}

export interface EsqlIndicatorMatchQuery {
  query: string;
  hasMultipleMappings: boolean;
  mappingCount: number;
}

/**
 * Builds an ES|QL query that emulates indicator match rule behavior using LOOKUP JOIN.
 *
 * The query structure:
 * - Uses FROM to query the input index
 * - Applies time range filter
 * - Uses FORK for OR logic between different threat mappings
 * - Uses AND conditions in LOOKUP JOIN for multiple entries within a mapping
 * - Builds the threat.enrichments structure for matched events
 */
export const buildEsqlIndicatorMatchQuery = ({
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
}: BuildEsqlIndicatorMatchQueryOptions): EsqlIndicatorMatchQuery => {
  const indexPattern = inputIndex.join(', ');
  const threatIndexPattern = threatIndex.join(', ');
  const hasMultipleMappings = threatMapping.length > 1;

  // Build the base FROM clause with METADATA to include _id and _index
  // These are required for proper alert ID generation
  const fromClause = `FROM ${indexPattern} METADATA _id, _index`;

  // Build the time range WHERE clause
  const timeRangeClause = buildTimeRangeClause(primaryTimestamp, secondaryTimestamp, from, to);

  // Build additional WHERE clause from DSL filter if provided
  const dslWhereClause = dslFilter ? buildWhereClauseFromDsl(dslFilter) : '';

  // Combine all WHERE conditions
  const whereConditions = [timeRangeClause, dslWhereClause].filter(Boolean).join(' AND ');
  const whereClause = whereConditions ? `| WHERE ${whereConditions}` : '';

  // Build the LOOKUP JOIN clauses for each threat mapping
  if (hasMultipleMappings) {
    // Use FORK for multiple mappings (OR logic)
    // FORK syntax: | FORK (cmd1 | cmd2) (cmd3 | cmd4)
    // Commands within each branch are separated by |, branches are separated by spaces
    const forkBranches = threatMapping.map((mapping, index) =>
      buildForkBranch(mapping, threatIndexPattern, threatIndicatorPath, index)
    );

    const query = `${fromClause}
${whereClause}
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
    const lookupJoinClause = buildLookupJoinClause(mapping, threatIndexPattern, 0);
    const matchWhereClause = buildWhereClause(mapping);
    const enrichmentEval = buildEnrichmentEvalClause(mapping, threatIndicatorPath, 0);

    const query = `${fromClause}
${whereClause}
${lookupJoinClause}
${matchWhereClause}
${enrichmentEval}
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
 * Builds a time range clause for the ES|QL WHERE condition
 */
const buildTimeRangeClause = (
  primaryTimestamp: string,
  secondaryTimestamp: string | undefined,
  from: string,
  to: string
): string => {
  const primaryCondition = `${primaryTimestamp} >= "${from}" AND ${primaryTimestamp} <= "${to}"`;

  if (secondaryTimestamp) {
    // If secondary timestamp exists, check primary OR (primary is null AND secondary in range)
    return `(${primaryCondition} OR (${primaryTimestamp} IS NULL AND ${secondaryTimestamp} >= "${from}" AND ${secondaryTimestamp} <= "${to}"))`;
  }

  return primaryCondition;
};

/**
 * Converts a DSL bool query to ES|QL WHERE clause conditions.
 * This is a simplified conversion - complex DSL queries may need more sophisticated handling.
 */
const buildWhereClauseFromDsl = (dslFilter: ESBoolQuery): string => {
  // For now, we'll create a placeholder that indicates DSL filter should be applied
  // In a full implementation, this would parse the DSL and convert to ES|QL syntax
  // This is complex because DSL and ES|QL have different query capabilities
  //
  // TODO: Implement full DSL to ES|QL conversion
  // For MVP, we can use the DSL filter in the ES|QL's metadata filter parameter
  // or rely on the ES|QL query's native filtering capabilities
  return '';
};

/**
 * Builds a FORK branch for a single threat mapping.
 * FORK syntax requires: (cmd1 | cmd2 | cmd3)
 * - First command has no leading pipe
 * - Subsequent commands are separated by |
 * - All on a single line within parentheses
 */
const buildForkBranch = (
  mapping: ThreatMapping[number],
  threatIndexPattern: string,
  threatIndicatorPath: string,
  mappingIndex: number
): string => {
  const lookupJoinClause = buildLookupJoinClause(mapping, threatIndexPattern, mappingIndex, false);
  const whereClause = buildWhereClause(mapping, false);
  const enrichmentEval = buildEnrichmentEvalClause(mapping, threatIndicatorPath, mappingIndex, false);

  // FORK branch format: (cmd1 | cmd2 | cmd3)
  return `(${lookupJoinClause} | ${whereClause} | ${enrichmentEval})`;
};

/**
 * Builds the LOOKUP JOIN clause for a threat mapping.
 * Handles AND logic for multiple entries within a single mapping.
 * 
 * Note: LOOKUP JOIN was introduced in ES 9.2. For earlier versions,
 * you may need to enable the feature or use alternative approaches.
 */
const buildLookupJoinClause = (
  mapping: ThreatMapping[number],
  threatIndexPattern: string,
  mappingIndex: number,
  includePipe: boolean = true
): string => {
  const entries = mapping.entries.filter((entry) => entry.negate !== true);

  if (entries.length === 0) {
    throw new Error(`Threat mapping at index ${mappingIndex} has no non-negated entries`);
  }

  // Build the ON clause - multiple entries use AND logic
  const onConditions = entries
    .map((entry) => `${entry.field} == ${entry.value}`)
    .join(' AND ');

  const pipe = includePipe ? '| ' : '';
  return `${pipe}LOOKUP JOIN ${threatIndexPattern} ON ${onConditions}`;
};

/**
 * Builds the WHERE clause to filter for matched results.
 * This includes:
 * 1. NOT NULL check on non-negated threat fields (to confirm a match occurred)
 * 2. Negation conditions for entries with negate=true (DOES NOT MATCH)
 */
const buildWhereClause = (
  mapping: ThreatMapping[number],
  includePipe: boolean = true
): string => {
  const nonNegatedEntries = mapping.entries.filter((entry) => entry.negate !== true);
  const negatedEntries = mapping.entries.filter((entry) => entry.negate === true);

  const conditions: string[] = [];

  // Check that at least one threat field is not null to confirm a match
  // We use the first non-negated entry's value field as the indicator of a match
  const firstThreatField = nonNegatedEntries[0].value;
  conditions.push(`${firstThreatField} IS NOT NULL`);

  // Add negation conditions for DOES NOT MATCH entries
  // For each negated entry, we want to EXCLUDE rows where the fields ARE equal
  // So we add: field != value (with null handling)
  negatedEntries.forEach((entry) => {
    // Use != which will exclude rows where both values are equal
    // Also need to handle nulls: if either is null, they don't "match" so should be included
    // ES|QL's != returns null if either operand is null, so we need to handle that
    conditions.push(
      `(${entry.field} != ${entry.value} OR ${entry.field} IS NULL OR ${entry.value} IS NULL)`
    );
  });

  const pipe = includePipe ? '| ' : '';
  return `${pipe}WHERE ${conditions.join(' AND ')}`;
};

/**
 * Builds the EVAL clause to create the threat.enrichments structure.
 * For FORK branches, this needs to be on a single line (no newlines).
 * 
 * Note: We only include the essential matched.* fields that we control.
 * The indicator fields from the threat index are automatically available
 * in the result after LOOKUP JOIN and don't need to be copied.
 */
const buildEnrichmentEvalClause = (
  mapping: ThreatMapping[number],
  _threatIndicatorPath: string,
  mappingIndex: number,
  includePipe: boolean = true
): string => {
  const entries = mapping.entries.filter((entry) => entry.negate !== true);

  // Build the matched.atomic value - concatenate all matched field values
  const atomicValues = entries.map((entry) => `TO_STRING(${entry.field})`);
  const atomicExpr =
    atomicValues.length === 1 ? atomicValues[0] : `CONCAT(${atomicValues.join(', ":", ')})`;

  // Build the matched.field value - comma-separated list of source fields
  const matchedFields = entries.map((entry) => entry.field).join(',');

  // Build all EVAL assignments as a single-line comma-separated list
  // Only include essential matched.* fields - indicator fields are already
  // available in the result from the LOOKUP JOIN
  const evalAssignments = [
    `threat.enrichments.matched.atomic = ${atomicExpr}`,
    `threat.enrichments.matched.field = "${matchedFields}"`,
    `threat.enrichments.matched.type = "indicator_match_rule"`,
    `threat.enrichments.mapping_index = ${mappingIndex}`,
  ].join(', ');

  const pipe = includePipe ? '| ' : '';
  return `${pipe}EVAL ${evalAssignments}`;
};

/**
 * Validates that a threat mapping is compatible with ES|QL LOOKUP JOIN
 */
export const validateThreatMappingForEsql = (threatMapping: ThreatMapping): string[] => {
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

    // Check for unsupported field types
    // ES|QL LOOKUP JOIN has limitations on certain field types
    mapping.entries.forEach((entry, entryIndex) => {
      if (entry.field.includes('*') || entry.value.includes('*')) {
        errors.push(
          `Mapping at index ${index}, entry ${entryIndex}: Wildcards are not supported in ES|QL LOOKUP JOIN`
        );
      }
    });
  });

  return errors;
};

/**
 * Gets the list of fields that should be kept in the ES|QL result
 */
export const getKeepFields = (
  threatMapping: ThreatMapping,
  additionalFields: string[] = []
): string[] => {
  const baseFields = [
    '@timestamp',
    '_id',
    '_index',
    'source.*',
    'destination.*',
    'host.*',
    'user.*',
    'event.*',
    'file.*',
    'url.*',
    'process.*',
    'threat.enrichments.*',
  ];

  // Add all fields from threat mappings
  const mappingFields = threatMapping.flatMap((mapping) =>
    mapping.entries.map((entry) => entry.field)
  );

  return [...new Set([...baseFields, ...mappingFields, ...additionalFields])];
};
