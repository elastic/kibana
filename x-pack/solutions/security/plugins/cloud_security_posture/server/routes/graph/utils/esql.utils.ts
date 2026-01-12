/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Utility functions for building ESQL queries
 */

/**
 * Extracts namespace from a field name.
 * Examples:
 * - "user.entity.id" -> "user"
 * - "entity.id" -> "entity"
 * - "entity.target.id" -> "entity"
 * - "service.target.entity.id" -> "service"
 *
 * @param field - The field name to extract namespace from
 * @returns The namespace (first part before the first dot)
 */
export const getFieldNamespace = (field: string): string => {
  // Special case: "entity.id" or "entity.target.id" -> "entity"
  if (field.startsWith('entity.')) {
    return 'entity';
  }
  // Otherwise, extract the first part before the first dot
  return field.split('.')[0];
};

/**
 * Generates ESQL CASE statements for field hints based on entity ID matches.
 * This is used to determine which field (namespace) an entity ID came from.
 *
 * @param fields - Array of field names to check
 * @param entityIdVar - The ESQL variable name containing the entity ID to match
 * @returns ESQL CASE statement string with proper indentation
 *
 * @example
 * ```typescript
 * generateFieldHintCases(['user.entity.id', 'service.entity.id'], 'actorEntityId')
 * // Returns:
 * //     MV_CONTAINS(user.entity.id, actorEntityId), "user",
 * //     MV_CONTAINS(service.entity.id, actorEntityId), "service"
 * ```
 */
export const generateFieldHintCases = (fields: readonly string[], entityIdVar: string): string => {
  return fields
    .map((field) => `    MV_CONTAINS(${field}, ${entityIdVar}), "${getFieldNamespace(field)}"`)
    .join(',\n');
};

/**
 * Generates an ESQL CASE statement that formats a JSON property.
 * If the value is NOT NULL, it returns the value, otherwise returns "undefined".
 * This ensures the JSON structure remains valid even when values are missing.
 *
 * @param propertyName - The JSON property name (e.g., "name", "type", "sub_type")
 * @param valueVar - The ESQL variable name containing the value
 * @param includeComma - Whether to include a comma prefix (default: true)
 * @returns ESQL CONCAT statement string that always outputs a valid JSON property
 *
 * @example
 * ```typescript
 * formatJsonProperty('name', 'actorEntityName', false)
 * // Returns: CONCAT("\"name\":\"", COALESCE(actorEntityName, "undefined"), "\"")
 *
 * formatJsonProperty('type', 'actorEntityType')
 * // Returns: CONCAT(",\"type\":\"", COALESCE(actorEntityType, "undefined"), "\"")
 * ```
 */
export const formatJsonProperty = (
  propertyName: string,
  valueVar: string,
  includeComma: boolean = true
): string => {
  const comma = includeComma ? ',' : '';
  return `CONCAT("${comma}\\"${propertyName}\\":\\"", COALESCE(${valueVar}, "undefined"), "\\"")`;
};
