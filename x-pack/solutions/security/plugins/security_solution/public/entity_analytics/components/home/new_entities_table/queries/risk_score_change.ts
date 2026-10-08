/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  entityIdsOf,
  getEntityId,
  getNumber,
  getString,
  RISK_SCORE_CHANGE_FIELD,
  RISK_SCORE_NORM_FIELD,
  TIME_RANGE_DAYS,
} from '../common';
import { buildEntitiesInViewCountQuery } from './entities_in_view';
import { buildKeepClause, buildLookupJoinClause, esc, riskScoreIndexOf, toList } from './esql';
import { buildMergedForeignRows, buildMergedForeignSortQuery } from './foreign_sort';
import type { QueryArgs, PageEnricher, ColumnQuerySpec } from '../common';
import type { MergedForeignRowsOptions } from './foreign_sort';
import {
  buildEmptyRowsQuery,
  buildValueCursorClause,
  buildValueSortSuffix,
  runSplitSortPage,
} from './split_sort';
import type { SplitSortPlan } from './split_sort';

/** Width of the reference window before the time range, as in the risk movers tile. */
const REFERENCE_WINDOW_HOURS = 2;

// A risk score doc stores its entity under host.risk, user.risk or service.risk.
const RISK_ID_VALUE_COALESCE = `COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)`;
const RISK_ID_FIELD_COALESCE = `COALESCE(host.risk.id_field, user.risk.id_field, service.risk.id_field)`;
const RISK_SCORE_NORM_COALESCE = `COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`;

/**
 * Risk score docs that can be the reference: scored in the two hours before the start of
 * the time range, and keyed by EUID. The reference score is the last of these per entity.
 * Risk score change is the current entity score minus the reference score.
 *
 * This is the boundary window of the risk movers tile, so its rows agree with the tile.
 * The two hours cover at least one hourly scoring run; the lower bound keeps the query
 * from reading all older history.
 */
const buildReferenceScoreDocs = ({ namespace, timeRange }: QueryArgs): string[] => {
  const windowStart = `NOW() - ${TIME_RANGE_DAYS[timeRange]} day`;
  return [
    `FROM ${riskScoreIndexOf(namespace)}`,
    `| WHERE \`@timestamp\` >= ${windowStart} - ${REFERENCE_WINDOW_HOURS} hours AND \`@timestamp\` <= ${windowStart}`,
  ];
};

// ── sort queries ──────────────────────────────────────────────────────────────

/** Reference and current scores merged per entity in view, with the change. */
const riskScoreChangeRows = (args: QueryArgs): MergedForeignRowsOptions => ({
  foreignRows: [
    ...buildReferenceScoreDocs(args),
    `| WHERE ${RISK_ID_FIELD_COALESCE} == "entity.id"`,
    `| EVAL \`entity.id\` = ${RISK_ID_VALUE_COALESCE}, score = ${RISK_SCORE_NORM_COALESCE}`,
    `| STATS reference_score = LAST(score, \`@timestamp\`) BY \`entity.id\``,
  ],
  entityFields: [RISK_SCORE_NORM_FIELD],
  mergeAggregations: [
    'reference_score = MAX(reference_score)',
    `current_score = MAX(${RISK_SCORE_NORM_FIELD})`,
  ],
  afterMerge: [`| EVAL ${RISK_SCORE_CHANGE_FIELD} = current_score - reference_score`],
});

/** Entities without a reference or a current score have no change and sort last. */
const buildRiskScoreChangeSortQuery = (args: QueryArgs): string =>
  buildMergedForeignSortQuery(args, {
    ...riskScoreChangeRows(args),
    sortField: RISK_SCORE_CHANGE_FIELD,
  });

// ── split sort (see split_sort.ts) ───────────────────────────────────────────

/**
 * Only scored entities can have a change, and there are few of them, so the merge reads
 * only scored entity docs. Its rows are the value rows (with a reference score) and the
 * scored entities without one, which are empty rows.
 */
const buildScoredEntityRows = (args: QueryArgs): string[] =>
  buildMergedForeignRows(args, {
    ...riskScoreChangeRows(args),
    entityConditions: [`${RISK_SCORE_NORM_FIELD} IS NOT NULL`],
  });

export const riskScoreChangeSplitSortPlan: SplitSortPlan = {
  sortField: RISK_SCORE_CHANGE_FIELD,
  emptyValue: null,
  buildValueRowsQuery: (args, limit) =>
    [
      ...buildScoredEntityRows(args),
      `| WHERE ${RISK_SCORE_CHANGE_FIELD} IS NOT NULL`,
      ...buildValueCursorClause(args.cursor),
      ...buildValueSortSuffix(args, RISK_SCORE_CHANGE_FIELD, limit),
      buildLookupJoinClause(args.concreteEntityIndexName),
      buildKeepClause(args, RISK_SCORE_CHANGE_FIELD),
      // LOOKUP JOIN may not keep the input order.
      ...buildValueSortSuffix(args, RISK_SCORE_CHANGE_FIELD, limit),
    ].join('\n'),
  // Empty rows: unscored entities, plus scored entities without a reference score.
  runEmptyRows: async (args, runQuery, afterId, limit) => {
    const [unscored, unreferenced] = await Promise.all([
      runQuery(
        buildEmptyRowsQuery(
          args,
          {
            conditions: [`${RISK_SCORE_NORM_FIELD} IS NULL`],
            emptyColumns: `${RISK_SCORE_CHANGE_FIELD} = TO_DOUBLE(null)`,
            columns: [RISK_SCORE_CHANGE_FIELD],
          },
          afterId,
          limit
        )
      ),
      runQuery(
        [
          ...buildScoredEntityRows(args),
          `| WHERE ${RISK_SCORE_CHANGE_FIELD} IS NULL`,
          ...(afterId != null ? [`| WHERE \`entity.id\` > ${esc(afterId)}`] : []),
          '| SORT `entity.id` ASC',
          `| LIMIT ${limit}`,
          buildLookupJoinClause(args.concreteEntityIndexName),
          buildKeepClause(args, RISK_SCORE_CHANGE_FIELD),
        ].join('\n')
      ),
    ]);
    return [...unscored, ...unreferenced]
      .sort((a, b) => ((getEntityId(a) ?? '') < (getEntityId(b) ?? '') ? -1 : 1))
      .slice(0, limit);
  },
  buildSortQuery: buildRiskScoreChangeSortQuery,
};

// ── enrichment ────────────────────────────────────────────────────────────────

const buildRiskScoreChangeEnrichQuery = (args: QueryArgs, entityIds: string[]): string => {
  const ids = toList(entityIds);
  return [
    ...buildReferenceScoreDocs(args),
    // Pushable prefilter for the COALESCE filters below.
    `| WHERE host.risk.id_value IN (${ids}) OR user.risk.id_value IN (${ids}) OR service.risk.id_value IN (${ids})`,
    `| WHERE ${RISK_ID_FIELD_COALESCE} == "entity.id"`,
    `| EVAL entity_id = ${RISK_ID_VALUE_COALESCE}, score = ${RISK_SCORE_NORM_COALESCE}`,
    `| WHERE entity_id IN (${ids})`,
    `| STATS reference_score = LAST(score, \`@timestamp\`) BY entity_id`,
  ].join('\n');
};

const riskScoreChangeEnricher: PageEnricher = {
  fields: [RISK_SCORE_CHANGE_FIELD],
  read: async (pageRows, args, { runQuery }) => {
    const entityIds = entityIdsOf(pageRows);
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
  },
};

// ── query spec ────────────────────────────────────────────────────────────────

export const riskScoreChangeQuerySpec = {
  sort: {
    buildSortQuery: buildRiskScoreChangeSortQuery,
    buildCountQuery: buildEntitiesInViewCountQuery,
    runSortPage: (args, ctx) => runSplitSortPage(riskScoreChangeSplitSortPlan, args, ctx),
  },
  enricher: riskScoreChangeEnricher,
} satisfies ColumnQuerySpec;
