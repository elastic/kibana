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

/**
 * Generates ESQL statements for entity enrichment using LOOKUP JOIN.
 * This is the preferred method for enriching actor and target entities with entity store data.
 *
 * @param lookupIndexName - The name of the lookup index (e.g., '.entities.v2.latest.security_generic_default')
 * @returns ESQL statements for LOOKUP JOIN enrichment
 *
 * @example
 * ```typescript
 * buildLookupJoinEsql('.entities.v2.latest.security_generic_default')
 * // Returns ESQL with LOOKUP JOIN for actor and target enrichment
 * ```
 */
export const buildLookupJoinEsql = (lookupIndexName: string): string => {
  return `| DROP entity.id
| DROP entity.target.id  
// rename entity.*fields before next pipeline to avoid name collisions
| EVAL entity.id = actorEntityId
| LOOKUP JOIN ${lookupIndexName} ON entity.id
| RENAME actorEntityName    = entity.name
| RENAME actorEntityType    = entity.type
| RENAME actorEntitySubType = entity.sub_type
| RENAME actorHostIp        = host.ip
| RENAME actorLookupEntityId = entity.id 

| EVAL entity.id = targetEntityId
| LOOKUP JOIN ${lookupIndexName} ON entity.id
| RENAME targetEntityName    = entity.name
| RENAME targetEntityType    = entity.type
| RENAME targetEntitySubType = entity.sub_type
| RENAME targetHostIp        = host.ip
| RENAME targetLookupEntityId = entity.id`;
};

/**
 * Generates ESQL statements for entity enrichment using ENRICH policy.
 * This is the deprecated fallback method when LOOKUP JOIN is not available.
 *
 * @param enrichPolicyName - The name of the enrich policy
 * @returns ESQL statements for ENRICH policy enrichment
 *
 * @example
 * ```typescript
 * buildEnrichPolicyEsql('entity_store_field_retention_generic_default_v1.0.0')
 * // Returns ESQL with ENRICH for actor and target enrichment
 * ```
 */
export const buildEnrichPolicyEsql = (enrichPolicyName: string): string => {
  return `// Use ENRICH policy for entity enrichment (deprecated fallback)
| ENRICH ${enrichPolicyName} ON actorEntityId WITH actorEntityName = entity.name, actorEntityType = entity.type, actorEntitySubType = entity.sub_type, actorHostIp = host.ip
| ENRICH ${enrichPolicyName} ON targetEntityId WITH targetEntityName = entity.name, targetEntityType = entity.type, targetEntitySubType = entity.sub_type, targetHostIp = host.ip`;
};
