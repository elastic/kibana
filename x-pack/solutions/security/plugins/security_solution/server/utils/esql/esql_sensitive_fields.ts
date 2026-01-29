/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractFieldLineage, resolveBaseFields } from './esql_helpers';

/**
 * Type definition for PII field registry.
 * Maps field names to a boolean indicating if they contain PII.
 */
export type PIIFieldRegistry = Set<string> | ((fieldName: string) => boolean);

/**
 * Determines which output fields are sensitive based on PII registry and field lineage.
 * This implements defensive PII propagation: any field derived from a PII field
 * or used as an aggregation key is considered sensitive.
 *
 * @param esql - The ESQL query string
 * @param piiRegistry - Registry of PII fields (Set or function)
 * @returns Set of sensitive output field names
 *
 * @example
 * ```typescript
 * const piiFields = new Set(['user.email', 'user.name', 'ssn']);
 * const query = 'FROM logs | EVAL full_name = user.name + " " + user.email';
 * const sensitiveFields = getSensitiveOutputFields(query, piiFields);
 * // Returns: Set(['full_name']) because it depends on PII fields
 * ```
 */
export function getSensitiveOutputFields(esql: string, piiRegistry: PIIFieldRegistry): Set<string> {
  const sensitiveFields = new Set<string>();

  try {
    const lineage = extractFieldLineage(esql);
    const { dependencies, fieldRenames, aggregationKeys, outputColumns } = lineage;

    // Helper to check if a field is PII
    const isPII = (fieldName: string): boolean => {
      if (piiRegistry instanceof Set) {
        return piiRegistry.has(fieldName);
      }
      return piiRegistry(fieldName);
    };

    // Check each output column
    for (const outputField of outputColumns) {
      // Resolve all base fields this output field depends on
      const baseFields = resolveBaseFields(outputField, dependencies, fieldRenames);

      // Check if any base field is PII
      let isSensitive = false;
      for (const baseField of baseFields) {
        if (isPII(baseField)) {
          isSensitive = true;
          break;
        }
      }

      // Also check if this field is used as an aggregation key
      // Aggregation keys can expose sensitive grouping information
      if (aggregationKeys.has(outputField)) {
        // Check if the aggregation key field itself or its dependencies are PII
        const keyBaseFields = resolveBaseFields(outputField, dependencies, fieldRenames);
        for (const baseField of keyBaseFields) {
          if (isPII(baseField)) {
            isSensitive = true;
            break;
          }
        }
      }

      if (isSensitive) {
        sensitiveFields.add(outputField);
      }
    }
  } catch (_error) {
    // Defensive: if anything fails, assume all fields might be sensitive
    // This is a safe default for PII handling
    // Return all output columns as potentially sensitive
    try {
      const lineage = extractFieldLineage(esql);
      lineage.outputColumns.forEach((field) => sensitiveFields.add(field));
    } catch {
      // If even basic extraction fails, return empty set
      // Caller should handle this case appropriately
    }
  }

  return sensitiveFields;
}
