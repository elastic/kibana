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
 * Generates an ESQL CASE statement that conditionally concatenates a JSON property.
 * If the value is NOT NULL, it returns the concatenated string, otherwise returns empty string.
 *
 * @param propertyName - The JSON property name (e.g., "name", "type", "sub_type")
 * @param valueVar - The ESQL variable name containing the value
 * @param includeComma - Whether to include a comma prefix (default: true)
 * @returns ESQL CASE statement string
 *
 * @example
 * ```typescript
 * concatPropIfExists('name', 'actorEntityName', false)
 * // Returns: CASE(actorEntityName IS NOT NULL, CONCAT("\"name\":\"", actorEntityName, "\""), "")
 *
 * concatPropIfExists('type', 'actorEntityType')
 * // Returns: CASE(actorEntityType IS NOT NULL, CONCAT(",\"type\":\"", actorEntityType, "\""), "")
 * ```
 */
export const concatPropIfExists = (
  propertyName: string,
  valueVar: string,
  includeComma: boolean = true
): string => {
  const comma = includeComma ? ',' : '';
  return `CASE(${valueVar} IS NOT NULL, CONCAT("${comma}\\"${propertyName}\\":\\"", ${valueVar}, "\\""), "")`;
};
