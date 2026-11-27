/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MappingRuntimeFields,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';

import { euid, getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import { ALERT_ENTITY_ID } from '../../../../common/field_maps/field_names';
import type { EntityType } from '../../../../common/search_strategy';
import { DEFAULT_ALERT_SAMPLE_SIZE, MAX_INPUTS_COUNT, RIEMANN_ZETA_S_VALUE } from './constants';
import { assertValidEsqlSourceIndex } from './validate_esql_source_index';

// Ranks risk inputs by their numeric score and returns the input strings. Ranking the
// strings themselves sorts them as text, which puts a score of 100 below 21 and 9 above 80.
const RISK_INPUTS_TOP = `TOP(risk_score, ${MAX_INPUTS_COUNT}, "desc", input)`;

const escapeEsqlStringLiteral = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

// Chars that cannot be safely interpolated into an ES|QL double-quoted literal
// (NUL/LF/CR/LS/PS). Reject loud rather than risk silent reinterpretation —
// IDs containing them are almost certainly malformed upstream.
const ESQL_INVALID_LITERAL_CHARS = /[\u0000\u000A\u000D\u2028\u2029]/;
const assertEsqlInterpolatableIds = (ids: string[]): void => {
  if (ids.some((id) => ESQL_INVALID_LITERAL_CHARS.test(id))) {
    throw new Error(
      'Entity ID contains an unsupported control character (NUL/LF/CR/LS/PS) and cannot be safely interpolated into ES|QL'
    );
  }
};

export const buildEuidRuntimeMappingWithStoredFieldFastPath = (
  entityType: EntityType
): { type: 'keyword'; script: { source: string } } => {
  // Store membership is enforced separately, by `inStoreScores` in the maintainer's score_base_entities step.
  const evalScript = euid.painless.getEuidEvaluationForSearch(
    getBuiltInEntityDefinition(entityType)
  );
  const typePrefix = `${entityType}:`;

  const source = [
    euid.painless.preamble,
    `String ___euid_rt_eval(def doc) { ${evalScript} }`,
    `if (doc.containsKey('${ALERT_ENTITY_ID}') && doc['${ALERT_ENTITY_ID}'].size() > 0) {`,
    `  for (def __id : doc['${ALERT_ENTITY_ID}']) {`,
    `    if (__id != null && __id.startsWith('${typePrefix}')) { emit(__id); return; }`,
    `  }`,
    `}`,
    `String ___euid = ___euid_rt_eval(doc); if (___euid != null) { emit(___euid); }`,
  ].join(' ');

  return { type: 'keyword', script: { source } };
};

/**
 * Builds a composite aggregation that paginates by entity_id (EUID).
 * Uses a Painless runtime mapping that first checks the pre-stamped
 * `kibana.alert.entity.id` field (fast path) and falls back to full
 * derivation for alerts without it.
 * Returns bounds (first and last EUID on the page) that are passed to getBaseScoreESQL().
 */
export const getEuidCompositeQuery = (
  entityType: EntityType,
  filter: QueryDslQueryContainer[],
  params: {
    index: string;
    pageSize: number;
    afterKey?: Record<string, string>;
    runtimeMappings?: MappingRuntimeFields;
  }
) => {
  const runtimeMapping = buildEuidRuntimeMappingWithStoredFieldFastPath(entityType);

  return {
    index: params.index,
    size: 0,
    // The target is a single space's alerts index, which doesn't exist until a detection rule has
    // run in that space at least once. Without this, that case throws `index_not_found_exception`
    // instead of yielding the empty result an index with genuinely no alerts would produce.
    ignore_unavailable: true,
    runtime_mappings: { ...params.runtimeMappings, entity_id: runtimeMapping },
    query: filter.length > 0 ? { bool: { filter } } : { match_all: {} },
    aggs: {
      by_entity_id: {
        composite: {
          size: params.pageSize,
          sources: [{ entity_id: { terms: { field: 'entity_id' } } }],
          ...(params.afterKey !== undefined ? { after: params.afterKey } : {}),
        },
      },
    },
  };
};

export interface EuidCompositeAggregation {
  buckets: Array<{ key: Record<string, string> }>;
  after_key?: Record<string, string>;
}

/**
 * Returns an ES|QL query that:
 * 1. Filters documents where the entity has an identifiable EUID
 * 2. Uses the entity store EUID evaluation logic to compute entity_id
 * 3. Filters to the EUID page bounds: WHERE entity_id > lower AND entity_id <= upper
 * 4. STATs alert_count, scores (MV_PSERIES_WEIGHTED_SUM), risk_inputs BY entity_id
 *
 * Column order: [alert_count, scores, risk_inputs, entity_id]
 * This order must match buildBaseScoreRiskScoreBucket().
 */
export const getBaseScoreESQL = (
  entityType: EntityType,
  bounds: { lower?: string; upper?: string },
  sampleSize: number,
  pageSize: number,
  index: string
): string => {
  // `index` derives from the user-writable dataViewId; reject anything that could break
  // out of the FROM clause before interpolating it.
  assertValidEsqlSourceIndex(index);

  const definition = getBuiltInEntityDefinition(entityType);
  const containsIdFilter = euid.esql.getEuidDocumentsContainsIdFilter(definition);
  const fieldEvals = euid.esql.getFieldEvaluations(definition);
  const fieldEvalsClause = fieldEvals ? `| EVAL ${fieldEvals}` : '';
  const euidEvalClause = `| EVAL ${euid.esql.getEuidEvaluation(definition, 'entity_id', {
    withTypeId: true,
  })}`;

  if (!bounds.lower && !bounds.upper) {
    throw new Error('Either lower or upper bound must be provided for EUID pagination');
  }

  // Bounds come from composite-agg bucket keys derived from alert fields
  // (host.id, user.name, ...) and may contain quotes, backslashes, or
  // unsupported control characters. Validate + escape before interpolating
  // into the double-quoted ES|QL literal — same pattern as
  // getResolutionScoreESQLByIds.
  const boundsToValidate = [bounds.lower, bounds.upper].filter(
    (value): value is string => value !== undefined
  );
  assertEsqlInterpolatableIds(boundsToValidate);

  const lower = bounds.lower ? `entity_id > "${escapeEsqlStringLiteral(bounds.lower)}"` : undefined;
  const upper = bounds.upper
    ? `entity_id <= "${escapeEsqlStringLiteral(bounds.upper)}"`
    : undefined;
  const rangeClause = [lower, upper].filter(Boolean).join(' AND ');

  // Prefer the pre-stamped field over the EVAL-derived value. The array holds at most one EUID
  // per entity type (host/user/service), so at most 3 elements. Scan all positions with
  // MV_SLICE so multi-entity alerts are handled regardless of write order, mirroring the
  // Painless loop in buildEuidRuntimeMappingWithStoredFieldFastPath.
  const f = ALERT_ENTITY_ID;
  const p = `"${entityType}:"`;
  const storedEuidCoalesceClause =
    `| EVAL entity_id = CASE(` +
    `STARTS_WITH(MV_FIRST(MV_SLICE(${f}, 0, 0)), ${p}), MV_FIRST(MV_SLICE(${f}, 0, 0)), ` +
    `STARTS_WITH(MV_FIRST(MV_SLICE(${f}, 1, 1)), ${p}), MV_FIRST(MV_SLICE(${f}, 1, 1)), ` +
    `STARTS_WITH(MV_FIRST(MV_SLICE(${f}, 2, 2)), ${p}), MV_FIRST(MV_SLICE(${f}, 2, 2)), ` +
    `entity_id)`;

  // Filter on entity_id (computed from cheap field evals) BEFORE the
  // CONCAT/base64 builders run, so non-matching alerts skip the per-row
  // string-allocation work.
  const query = /* esql */ `
  SET unmapped_fields="nullify";
  FROM ${index} METADATA _index
    | WHERE kibana.alert.risk_score IS NOT NULL AND (${containsIdFilter})
    ${fieldEvalsClause}
    ${euidEvalClause}
    ${storedEuidCoalesceClause}
    | WHERE ${rangeClause}
    | RENAME kibana.alert.risk_score as risk_score,
             kibana.alert.rule.name as rule_name,
             kibana.alert.rule.uuid as rule_id,
             kibana.alert.uuid as alert_id,
             event.kind as category,
             @timestamp as time
    | EVAL rule_name_b64 = TO_BASE64(rule_name),
           category_b64 = TO_BASE64(category)
    | EVAL input = CONCAT(""" {"risk_score": """", risk_score::keyword, """", "time": """", time::keyword, """", "index": """", _index, """", "rule_name_b64": """", rule_name_b64, """\", "category_b64": """", category_b64, """\", "id": \"""", alert_id, """\" } """)
    | STATS
        alert_count = count(risk_score),
        scores = MV_PSERIES_WEIGHTED_SUM(TOP(risk_score, ${
          sampleSize ?? DEFAULT_ALERT_SAMPLE_SIZE
        }, "desc"), ${RIEMANN_ZETA_S_VALUE}),
        risk_inputs = ${RISK_INPUTS_TOP}
        BY entity_id
    | SORT scores DESC
    | LIMIT ${pageSize}
  `;

  return query;
};

export const getResolutionCompositeQuery = (
  entityType: EntityType,
  index: string,
  pageSize: number,
  afterKey?: Record<string, string>,
  targetEntityIds?: string[]
) => ({
  index,
  size: 0,
  query: targetEntityIds
    ? { terms: { resolution_target_id: targetEntityIds } }
    : {
        bool: {
          filter: [
            { term: { relationship_type: 'entity.relationships.resolution.resolved_to' } },
            // The lookup index holds every entity type's targets. Without this, each type also
            // pages through the others' targets, scoring alerts that can never match them.
            { prefix: { resolution_target_id: `${entityType}:` } },
          ],
        },
      },
  aggs: {
    by_resolution_target: {
      composite: {
        size: pageSize,
        sources: [{ resolution_target_id: { terms: { field: 'resolution_target_id' } } }],
        ...(afterKey ? { after: afterKey } : {}),
      },
    },
  },
});

/**
 * Resolution scoring filtered by an explicit `resolution_target_id IN (...)` list.
 *
 * `COALESCE(resolution_target_id, entity_id)` after the LOOKUP JOIN routes
 * alerts on resolution targets that aren't themselves iterated by the entity
 * store (so they have no lookup row) to their own EUID — keeping their alerts
 * attributed to the requested target. `relationship_type` defaults to "self"
 * on the same path; `parseEsqlResolutionScoreRow` drops "self" entries from
 * `related_entities`.
 */
export const getResolutionScoreESQLByIds = (
  entityType: EntityType,
  resolutionTargetIds: string[],
  sampleSize: number,
  pageSize: number,
  alertsIndex: string,
  lookupIndex: string
): string => {
  if (resolutionTargetIds.length === 0) {
    throw new Error('At least one resolution target ID must be provided for resolution scoring');
  }

  assertEsqlInterpolatableIds(resolutionTargetIds);

  const idsClause = resolutionTargetIds.map((id) => `"${escapeEsqlStringLiteral(id)}"`).join(', ');

  return buildResolutionScoreESQL({
    entityType,
    membershipClause: [
      '| EVAL resolution_target_id = COALESCE(resolution_target_id, entity_id),',
      '       relationship_type = COALESCE(relationship_type, "self")',
      `| WHERE resolution_target_id IN (${idsClause})`,
    ].join('\n    '),
    sampleSize,
    pageSize,
    alertsIndex,
    lookupIndex,
  });
};

/**
 * Resolution scoring for one page of resolution targets, selected by the page's sorted bounds
 * `(lower, upper]` instead of an ID list.
 *
 * ES|QL evaluates `IN (<literals>)` on a computed column by comparing every row against every
 * literal, which at 10k targets and ~1M alerts takes minutes of CPU per page. A range costs the
 * same per row whatever the page size. It relies on Phase 0 writing a lookup row for every
 * resolution target as well as for every alias, so keeping only joined rows keeps exactly the
 * group members and drops entities that are in no resolution group, even when their own ID falls
 * inside the range.
 *
 * Only rows written by this run count. The lookup index is pruned after scoring, so the previous
 * run's rows are still there: a target whose aliases have all moved elsewhere keeps its old row,
 * and without the run filter it would be scored again as a group of one, taking a slot under the
 * page's LIMIT from a current group.
 */
export const getResolutionScoreESQLByRange = (
  entityType: EntityType,
  bounds: { lower?: string; upper: string },
  calculationRunId: string,
  sampleSize: number,
  pageSize: number,
  alertsIndex: string,
  lookupIndex: string
): string => {
  assertEsqlInterpolatableIds(
    [bounds.lower, bounds.upper, calculationRunId].filter(
      (value): value is string => value !== undefined
    )
  );

  const rangeClause = [
    bounds.lower ? `resolution_target_id > "${escapeEsqlStringLiteral(bounds.lower)}"` : undefined,
    `resolution_target_id <= "${escapeEsqlStringLiteral(bounds.upper)}"`,
  ]
    .filter(Boolean)
    .join(' AND ');

  return buildResolutionScoreESQL({
    entityType,
    // Alerts with no lookup row have a null run ID after the join, so this also drops them.
    membershipClause: `| WHERE calculation_run_id == "${escapeEsqlStringLiteral(
      calculationRunId
    )}" AND ${rangeClause}`,
    sampleSize,
    pageSize,
    alertsIndex,
    lookupIndex,
  });
};

const buildResolutionScoreESQL = ({
  entityType,
  membershipClause,
  sampleSize,
  pageSize,
  alertsIndex,
  lookupIndex,
}: {
  entityType: EntityType;
  /** Filters joined alert rows down to the page's resolution groups. */
  membershipClause: string;
  sampleSize: number;
  pageSize: number;
  alertsIndex: string;
  lookupIndex: string;
}): string => {
  // `alertsIndex` derives from the user-writable dataViewId; reject anything that could
  // break out of the FROM clause before interpolating it. (`lookupIndex` is engine-owned.)
  assertValidEsqlSourceIndex(alertsIndex);

  const definition = getBuiltInEntityDefinition(entityType);
  const containsIdFilter = euid.esql.getEuidDocumentsContainsIdFilter(definition);
  const fieldEvals = euid.esql.getFieldEvaluations(definition);
  const fieldEvalsClause = fieldEvals ? `| EVAL ${fieldEvals}` : '';
  const euidEvalClause = `| EVAL ${euid.esql.getEuidEvaluation(definition, 'entity_id', {
    withTypeId: true,
  })}`;

  const f = ALERT_ENTITY_ID;
  const p = `"${entityType}:"`;
  const storedEuidCoalesceClause =
    `| EVAL entity_id = CASE(` +
    `STARTS_WITH(MV_FIRST(MV_SLICE(${f}, 0, 0)), ${p}), MV_FIRST(MV_SLICE(${f}, 0, 0)), ` +
    `STARTS_WITH(MV_FIRST(MV_SLICE(${f}, 1, 1)), ${p}), MV_FIRST(MV_SLICE(${f}, 1, 1)), ` +
    `STARTS_WITH(MV_FIRST(MV_SLICE(${f}, 2, 2)), ${p}), MV_FIRST(MV_SLICE(${f}, 2, 2)), ` +
    `entity_id)`;

  // Compute entity_id (cheap), then override with the pre-stamped field when present,
  // then LOOKUP JOIN to recover resolution_target_id, then filter on resolution_target_id
  // BEFORE the CONCAT/base64 builders run so per-row string-allocation work only
  // happens for alerts that belong to the page's groups.
  // The alert timestamp is renamed before the join because lookup rows have their own
  // @timestamp, which would otherwise replace the alert's (and null it on unmatched rows).
  const query = /* esql */ `
  SET unmapped_fields="nullify";
  FROM ${alertsIndex} METADATA _index
    | WHERE kibana.alert.risk_score IS NOT NULL AND (${containsIdFilter})
    ${fieldEvalsClause}
    ${euidEvalClause}
    ${storedEuidCoalesceClause}
    | RENAME @timestamp as time
    | LOOKUP JOIN ${lookupIndex} ON entity_id
    ${membershipClause}
    | RENAME kibana.alert.risk_score as risk_score,
             kibana.alert.rule.name as rule_name,
             kibana.alert.rule.uuid as rule_id,
             kibana.alert.uuid as alert_id,
             event.kind as category
    | EVAL rule_name_b64 = TO_BASE64(rule_name),
           category_b64 = TO_BASE64(category)
    | EVAL input = CONCAT(""" {"risk_score": """", risk_score::keyword, """", "time": """", time::keyword, """", "index": """", _index, """", "rule_name_b64": """", rule_name_b64, """\", "category_b64": """", category_b64, """\", "id": \"""", alert_id, """\" } """)
    | EVAL entity_with_rel = CONCAT(entity_id, "|", relationship_type)
    | STATS
        alert_count = count(risk_score),
        scores = MV_PSERIES_WEIGHTED_SUM(TOP(risk_score, ${
          sampleSize ?? DEFAULT_ALERT_SAMPLE_SIZE
        }, "desc"), ${RIEMANN_ZETA_S_VALUE}),
        risk_inputs = ${RISK_INPUTS_TOP},
        contributing_entities_raw = VALUES(entity_with_rel)
        BY resolution_target_id
    | SORT scores DESC
    | LIMIT ${pageSize}
  `;

  return query;
};
