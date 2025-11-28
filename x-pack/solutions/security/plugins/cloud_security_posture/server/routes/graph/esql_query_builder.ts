/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_TYPE_ALERT,
  DOCUMENT_TYPE_EVENT,
  DOCUMENT_TYPE_ENTITY,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
import type { OriginEventId } from './types';

/**
 * Constants for non-enriched entity types
 */
const NON_ENRICHED_ENTITY_TYPE_PLURAL = 'Entities';
const NON_ENRICHED_ENTITY_TYPE_SINGULAR = 'Entity';
const NON_ENRICHED_PLACEHOLDER = 'NonEnriched';

/**
 * Parameters for building the ESQL graph query
 */
interface BuildEsqlQueryParams {
  indexPatterns: string[];
  originEventIds: OriginEventId[];
  originAlertIds: OriginEventId[];
  isEnrichPolicyExists: boolean;
  enrichPolicyName: string;
  securityAlertsIdentifier: string;
}

/**
 * Builds enriched entity section with ENRICH commands and entity data EVALs.
 * This section is used when the enrichment policy exists.
 */
function buildEnrichedEntitySection(policyName: string): string {
  return `
| ENRICH ${policyName} ON actor.entity.id WITH actorEntityName = entity.name, actorEntityType = entity.type, actorEntitySubType = entity.sub_type, actorHostIp = host.ip
| ENRICH ${policyName} ON target.entity.id WITH targetEntityName = entity.name, targetEntityType = entity.type, targetEntitySubType = entity.sub_type, targetHostIp = host.ip

| EVAL actorDocData = CONCAT("{",
    "\\"id\\":\\"", actor.entity.id, "\\"",
    ",\\"type\\":\\"", "${DOCUMENT_TYPE_ENTITY}", "\\"",
    ",\\"entity\\":", "{",
      "\\"name\\":\\"", actorEntityName, "\\"",
      ",\\"type\\":\\"", actorEntityType, "\\"",
      ",\\"sub_type\\":\\"", actorEntitySubType, "\\"",
      CASE (actorHostIp IS NOT NULL, CONCAT(",\\"host\\":", "{", "\\"ip\\":\\"", TO_STRING(actorHostIp), "\\"", "}"), ""),
    "}",
  "}")

| EVAL targetDocData = CONCAT("{",
    "\\"id\\":\\"", target.entity.id, "\\"",
    ",\\"type\\":\\"", "${DOCUMENT_TYPE_ENTITY}", "\\"",
    ",\\"entity\\":", "{",
      "\\"name\\":\\"", targetEntityName, "\\"",
      ",\\"type\\":\\"", targetEntityType, "\\"",
      ",\\"sub_type\\":\\"", targetEntitySubType, "\\"",
      CASE (targetHostIp IS NOT NULL, CONCAT(",\\"host\\":", "{", "\\"ip\\":\\"", TO_STRING(targetHostIp), "\\"", "}"), ""),
    "}",
  "}")`;
}

/**
 * Builds non-enriched entity section with null fallback EVALs.
 * This section is used when the enrichment policy doesn't exist.
 */
function buildNonEnrichedEntitySection(): string {
  return `
| EVAL actorEntityType = TO_STRING(null)
| EVAL actorEntitySubType = TO_STRING(null)
| EVAL actorHostIp = TO_STRING(null)
| EVAL actorDocData = TO_STRING(null)

| EVAL targetEntityType = TO_STRING(null)
| EVAL targetEntitySubType = TO_STRING(null)
| EVAL targetHostIp = TO_STRING(null)
| EVAL targetDocData = TO_STRING(null)`;
}

/**
 * Builds entity group EVALs for aggregation.
 * Entity groups combine type and sub-type, or use a placeholder for non-enriched entities.
 */
function buildEntityGroupSection(): string {
  return `
| EVAL actorEntityGroup = CASE(
    actorEntityType IS NOT NULL AND actorEntitySubType IS NOT NULL,
    CONCAT(actorEntityType, ":", actorEntitySubType),
    actorEntityType IS NOT NULL,
    actorEntityType,
    "${NON_ENRICHED_PLACEHOLDER}"
  )

| EVAL targetEntityGroup = CASE(
    targetEntityType IS NOT NULL AND targetEntitySubType IS NOT NULL,
    CONCAT(targetEntityType, ":", targetEntitySubType),
    targetEntityType IS NOT NULL,
    targetEntityType,
    "${NON_ENRICHED_PLACEHOLDER}"
  )`;
}

/**
 * Builds the STATS aggregation command.
 * This is the heart of the query - aggregates events by action, entity groups, and origin status.
 */
function buildStatsSection(): string {
  return `
| STATS badge = COUNT(*),
  totalEventsCount = COUNT_DISTINCT(event.id),
  uniqueAlertsCount = COUNT_DISTINCT(CASE(isAlert == true, event.id, null)),
  isAlert = MV_MAX(VALUES(isAlert)),
  docs = VALUES(docData),
  sourceIps = MV_DEDUPE(VALUES(sourceIps)),
  sourceCountryCodes = MV_DEDUPE(VALUES(sourceCountryCodes)),
  actorIds = VALUES(actor.entity.id),
  actorIdsCount = COUNT_DISTINCT(actor.entity.id),
  actorEntityType = VALUES(actorEntityType),
  actorEntitySubType = VALUES(actorEntitySubType),
  actorsDocData = VALUES(actorDocData),
  actorHostIp = VALUES(actorHostIp),
  targetIds = VALUES(target.entity.id),
  targetIdsCount = COUNT_DISTINCT(target.entity.id),
  targetEntityType = VALUES(targetEntityType),
  targetEntitySubType = VALUES(targetEntitySubType),
  targetsDocData = VALUES(targetDocData)
    BY action = event.action,
      actorEntityGroup,
      targetEntityGroup,
      isOrigin,
      isOriginAlert`;
}

/**
 * Builds post-aggregation transformations.
 * Updates entity types, labels, and calculates unique event counts.
 */
function buildPostAggregationSection(): string {
  return `
| EVAL actorEntityType = CASE(
    actorEntityType IS NOT NULL,
    actorEntityType,
    actorIdsCount == 1,
    "${NON_ENRICHED_ENTITY_TYPE_SINGULAR}",
    "${NON_ENRICHED_ENTITY_TYPE_PLURAL}"
  )

| EVAL targetEntityType = CASE(
    targetEntityType IS NOT NULL,
    targetEntityType,
    targetIdsCount == 1,
    "${NON_ENRICHED_ENTITY_TYPE_SINGULAR}",
    "${NON_ENRICHED_ENTITY_TYPE_PLURAL}"
  )

| EVAL actorLabel = CASE(
    actorEntitySubType IS NOT NULL,
    actorEntitySubType,
    actorIdsCount == 1,
    MV_FIRST(actorIds),
    ""
  )

| EVAL targetLabel = CASE(
    targetEntitySubType IS NOT NULL,
    targetEntitySubType,
    targetIdsCount == 1,
    MV_FIRST(targetIds),
    ""
  )

| EVAL uniqueEventsCount = totalEventsCount - uniqueAlertsCount`;
}

/**
 * Builds alert rule name field fragment for document data EVAL.
 * Returns CASE expression to conditionally include alert rule name.
 */
function buildAlertRuleNameField(): string {
  return `CASE (isAlert, CONCAT(",\\"alert\\":", "{",
    "\\"ruleName\\":\\"", kibana.alert.rule.name, "\\"",
  "}"), ""),`;
}

/**
 * Builds the complete ESQL query for fetching graph data.
 *
 * ALL BRANCHING LOGIC IS VISIBLE HERE at the top level - no hidden conditionals in helper functions.
 *
 * Query structure:
 * 1. FROM + WHERE - Source data and basic filtering
 * 2. ENRICH (conditional) - Either enrich with policy OR set null fallbacks
 * 3. EVAL - Field mappings, origin detection, document metadata, entity grouping
 * 4. STATS - Core aggregation by action and entity groups
 * 5. EVAL (post-agg) - Entity type/label transformations based on aggregation results
 * 6. LIMIT + SORT - Result limiting and ordering
 *
 * @param params - Query parameters including index patterns, origin events, enrichment settings
 * @returns ESQL query string ready for execution
 */
export function buildEsqlQuery({
  indexPatterns,
  originEventIds,
  originAlertIds,
  isEnrichPolicyExists,
  enrichPolicyName,
  securityAlertsIdentifier,
}: BuildEsqlQueryParams): string {
  // ===================================================================
  // ALL BRANCHING DECISIONS - VISIBLE AT TOP LEVEL
  // ===================================================================

  // 1. Determine if alert mappings are included based on index patterns
  const alertsMappingsIncluded = indexPatterns.some((indexPattern) =>
    indexPattern.includes(securityAlertsIdentifier)
  );

  // 2. Choose enrichment strategy (THE KEY DECISION)
  const enrichmentSection = isEnrichPolicyExists
    ? buildEnrichedEntitySection(enrichPolicyName)
    : buildNonEnrichedEntitySection();

  // 3. Choose alert field inclusion
  const alertRuleField = alertsMappingsIncluded ? buildAlertRuleNameField() : '';

  // 4. Build origin event conditions
  const originEventCondition =
    originEventIds.length > 0
      ? `event.id in (${originEventIds.map((_id, idx) => `?og_id${idx}`).join(', ')})`
      : 'false';

  const originAlertCondition =
    originAlertIds.length > 0
      ? `event.id in (${originAlertIds.map((_id, idx) => `?og_alrt_id${idx}`).join(', ')})`
      : 'false';

  // ===================================================================
  // BUILD FINAL QUERY - Plain string composition
  // ===================================================================

  return `
FROM ${indexPatterns.join(',')} METADATA _id, _index
| WHERE event.action IS NOT NULL AND actor.entity.id IS NOT NULL

${enrichmentSection}

| EVAL sourceIps = source.ip
| EVAL sourceCountryCodes = source.geo.country_iso_code

| EVAL isOrigin = ${originEventCondition}
| EVAL isOriginAlert = isOrigin AND ${originAlertCondition}

| EVAL isAlert = _index LIKE "*${securityAlertsIdentifier}*"
| EVAL docType = CASE (isAlert, "${DOCUMENT_TYPE_ALERT}", "${DOCUMENT_TYPE_EVENT}")
| EVAL docData = CONCAT("{",
    "\\"id\\":\\"", _id, "\\"",
    CASE (event.id IS NOT NULL AND event.id != "", CONCAT(",\\"event\\":","{","\\"id\\":\\"", event.id, "\\"","}"), ""),
    ",\\"type\\":\\"", docType, "\\"",
    ",\\"index\\":\\"", _index, "\\"",
    ${alertRuleField}
  "}")

${buildEntityGroupSection()}

${buildStatsSection()}

${buildPostAggregationSection()}

| LIMIT 1000
| SORT action DESC, actorEntityGroup, targetEntityGroup, isOrigin
`.trim();
}
