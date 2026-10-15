/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityIds, getEntityId, getNumber, getString, RISK_SCORE_NORM_FIELD } from '../common';
import {
  buildLookback,
  buildLookupJoinClause,
  buildRowFieldsSteps,
  buildSortSuffix,
  getRiskScoreIndex,
  OWN_RISK_SCORE_CONDITION,
  RISK_SCORE_TYPE,
  toList,
} from './esql';
import { fetchComputedColumnSortPage } from './computed_column';
import type { ComputedColumn } from './computed_column';
import {
  buildComputedColumnSortQuery,
  buildEntitiesInViewWithComputedColumns,
} from './computed_column_sort';
import type { ComputedColumnsOptions } from './computed_column_sort';
import type { QueryArgs, Row } from '../common';
import type { ColumnQuerySpec, EnrichedFields, SortPageContext } from './types';

const RISK_SCORE_CHANGE_FIELD = 'risk_score_change';

/** Width of the reference window before the time range, as in the risk movers tile. */
const REFERENCE_WINDOW_HOURS = 2;

// A risk score doc stores its entity under host.risk, user.risk or service.risk.
const RISK_ID_VALUE_COALESCE = `COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)`;
const RISK_ID_FIELD_COALESCE = `COALESCE(host.risk.id_field, user.risk.id_field, service.risk.id_field)`;
const RISK_SCORE_NORM_COALESCE = `COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`;

/**
 * Risk score docs that can be the reference: the scores in the two hours before the start of
 * the time range, keyed by EUID. The reference score is the last of these per entity, see
 * {@link buildReferenceScoreStats}.
 * Risk score change is the current score minus the reference score.
 *
 * This is the boundary window of the risk movers tile, so its rows agree with the tile.
 *
 * Why: scoring runs hourly, so two hours cover at least one run, and the query reads one
 * score per entity whatever the range. Reading every score in the range took ~46s at 30d;
 * this takes ~0.5s (10M entities, 16GB ECH, Oct 2026).
 * Consequence: an entity first scored inside the range has no reference, so it has no change.
 * Counting it (vs its earliest score in the range) needs that full read; deferred past 9.6.
 */
const buildReferenceScoreDocs = ({ namespace, timeRange, rowsMode }: QueryArgs): string[] => {
  const windowStart = buildLookback(timeRange);
  return [
    `FROM ${getRiskScoreIndex(namespace)}`,
    `| WHERE \`@timestamp\` >= ${windowStart} - ${REFERENCE_WINDOW_HOURS} hours AND \`@timestamp\` <= ${windowStart}`,
    ...(rowsMode === 'resolved' ? [] : [`| WHERE ${OWN_RISK_SCORE_CONDITION}`]),
  ];
};

/**
 * The reference score per `key`, from the docs of `buildReferenceScoreDocs` with their `score`.
 * A resolved row's current score is its resolved entity's, so its reference is the resolved entity's last score, or
 * the entity's own last score when it has no group score. Every other row's current score is its
 * own, and so is its reference: the risk engine writes the resolved entity's score next to it, with the
 * same key and time, so the resolved entity's docs must not be among them.
 */
const buildReferenceScoreStats = ({ rowsMode }: QueryArgs, key: string): string[] =>
  rowsMode === 'resolved'
    ? [
        `| STATS group_reference = LAST(score, \`@timestamp\`) WHERE ${RISK_SCORE_TYPE} == "resolution", own_reference = LAST(score, \`@timestamp\`) WHERE ${OWN_RISK_SCORE_CONDITION} BY ${key}`,
        '| EVAL reference_score = COALESCE(group_reference, own_reference)',
        `| KEEP ${key}, reference_score`,
      ]
    : [`| STATS reference_score = LAST(score, \`@timestamp\`) BY ${key}`];

// ── what the column does ─────────────────────────────────────────────────────

/**
 * The change needs the current score on the entity doc. The reference scores and the scored
 * entities in view are read side by side and merged by entity.id, so only the rows of the page
 * join their docs. An entity without a reference or a current score has no change: an empty row.
 *
 * Why: joining the doc of every entity with a reference score before sorting took ~7s at 30k
 * scored entities; this takes ~2s (10M entities, ECH, Oct 2026).
 */
const riskScoreChangeColumn: ComputedColumn = {
  field: RISK_SCORE_CHANGE_FIELD,
  emptyValue: null,
  emptyColumns: `${RISK_SCORE_CHANGE_FIELD} = TO_DOUBLE(null)`,
  buildValueRowsQuery: (args, limit) => [
    ...buildEntitiesInViewWithComputedColumns(args, {
      ...buildRiskScoreChangeColumns(args),
      entityConditions: [`${RISK_SCORE_NORM_FIELD} IS NOT NULL`],
    }),
    `| WHERE ${RISK_SCORE_CHANGE_FIELD} IS NOT NULL`,
    ...buildSortSuffix(RISK_SCORE_CHANGE_FIELD, args.sort.direction, limit),
    buildLookupJoinClause(args.concreteEntityIndexName),
    ...buildRowFieldsSteps(args, RISK_SCORE_CHANGE_FIELD),
    // LOOKUP JOIN may not keep the input order.
    ...buildSortSuffix(RISK_SCORE_CHANGE_FIELD, args.sort.direction, limit),
  ],
  fetchValues: (rows, args, ctx) => fetchRiskScoreChanges(rows, args, ctx),
  buildMergedSortQuery: (args) =>
    buildComputedColumnSortQuery(args, {
      ...buildRiskScoreChangeColumns(args),
      sortField: RISK_SCORE_CHANGE_FIELD,
    }),
};

/** The reference and current scores merged by entity.id, and their change. */
const buildRiskScoreChangeColumns = (args: QueryArgs): ComputedColumnsOptions => ({
  sourceRows: buildReferenceScoreRows(args),
  entityFields: [RISK_SCORE_NORM_FIELD],
  mergeAggregations: [
    'reference_score = MAX(reference_score)',
    `current_score = MAX(${RISK_SCORE_NORM_FIELD})`,
  ],
  afterMerge: [`| EVAL ${RISK_SCORE_CHANGE_FIELD} = current_score - reference_score`],
});

export const riskScoreChangeQuerySpec = {
  fetchSortPage: (args, ctx) => fetchComputedColumnSortPage(riskScoreChangeColumn, args, ctx),
  enricher: {
    fields: [RISK_SCORE_CHANGE_FIELD],
    fetch: (rows, args, ctx) => fetchRiskScoreChanges(rows, args, ctx),
  },
} satisfies ColumnQuerySpec;

// ── source rows ──────────────────────────────────────────────────────────────

/** The reference score of each scored entity, keyed by `entity.id`. */
const buildReferenceScoreRows = (args: QueryArgs): string[] => [
  ...buildReferenceScoreDocs(args),
  `| WHERE ${RISK_ID_FIELD_COALESCE} == "entity.id"`,
  `| EVAL \`entity.id\` = ${RISK_ID_VALUE_COALESCE}, score = ${RISK_SCORE_NORM_COALESCE}`,
  ...buildReferenceScoreStats(args, '`entity.id`'),
];

// ── enrich ───────────────────────────────────────────────────────────────────

const buildRiskScoreChangeEnrichQuery = (args: QueryArgs, entityIds: string[]): string[] => {
  const ids = toList(entityIds);
  return [
    ...buildReferenceScoreDocs(args),
    // Pushable prefilter for the COALESCE filters below.
    `| WHERE host.risk.id_value IN (${ids}) OR user.risk.id_value IN (${ids}) OR service.risk.id_value IN (${ids})`,
    `| WHERE ${RISK_ID_FIELD_COALESCE} == "entity.id"`,
    `| EVAL entity_id = ${RISK_ID_VALUE_COALESCE}, score = ${RISK_SCORE_NORM_COALESCE}`,
    `| WHERE entity_id IN (${ids})`,
    ...buildReferenceScoreStats(args, 'entity_id'),
  ];
};

/** The change of each row's risk score since its last score before the window. */
const fetchRiskScoreChanges = async (
  pageRows: readonly Row[],
  args: QueryArgs,
  { runQuery }: SortPageContext
): Promise<EnrichedFields> => {
  const entityIds = getEntityIds(pageRows);
  if (!entityIds.length) return new Map();

  const rows = await runQuery(buildRiskScoreChangeEnrichQuery(args, entityIds));

  const byId = new Map(
    rows.map((r) => [getString(r, 'entity_id'), getNumber(r, 'reference_score')])
  );
  return new Map(
    pageRows.flatMap((row) => {
      const id = getEntityId(row);
      if (id == null) return [];
      const currentScore = getNumber(row, RISK_SCORE_NORM_FIELD) ?? null;
      const referenceScore = byId.get(id) ?? null;
      const change =
        currentScore != null && referenceScore != null ? currentScore - referenceScore : null;
      return [[id, { [RISK_SCORE_CHANGE_FIELD]: change }]];
    })
  );
};
