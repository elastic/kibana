/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';
import { APP_ID } from '../../../../common/constants';
import { API_VERSIONS } from '../../../../common/entity_analytics/constants';
import { ENTITY_GRID_INTERNAL_URL } from '../../../../common/entity_analytics/entity_analytics/constants';
import type { EntityAnalyticsRoutesDeps } from '../types';

const ALLOWED_ENTITY_TYPES = ['user', 'host', 'service'] as const;
const ENTITY_TYPE_FIELD = 'entity.EngineMetadata.Type';
const ENTITY_ID_FIELD = 'entity.id';
const LAST_SEEN_ALERT_FIELD = 'last_seen_alert';
const RISK_SCORE_CHANGE_FIELD = 'risk_score_change';
const RISK_SCORE_NORM_FIELD = 'entity.risk.calculated_score_norm';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

interface PageCursor {
  sortField: string;
  sortDirection: 'asc' | 'desc';
  sortValue: unknown;
  entityId: string;
}

const encodeCursor = (cursor: PageCursor): string =>
  Buffer.from(JSON.stringify(cursor)).toString('base64');

const decodeCursor = (encoded: string): PageCursor =>
  JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as PageCursor;

/**
 * Builds the ES|QL WHERE clause that implements keyset pagination.
 * Always uses entity.id as the tiebreaker (ASC).
 */
const buildCursorWhereClause = (cursor: PageCursor): string => {
  const { sortField, sortDirection, sortValue, entityId } = cursor;
  const safeEntityId = entityId.replace(/"/g, '\\"');

  if (sortValue === null || sortValue === undefined) {
    return `| WHERE ${sortField} IS NULL AND ${ENTITY_ID_FIELD} > "${safeEntityId}"`;
  }

  const op = sortDirection === 'desc' ? '<' : '>';
  const escapedValue =
    typeof sortValue === 'string'
      ? `"${sortValue.replace(/"/g, '\\"')}"`
      : String(sortValue);

  return (
    `| WHERE (${sortField} ${op} ${escapedValue})` +
    ` OR (${sortField} == ${escapedValue} AND ${ENTITY_ID_FIELD} > "${safeEntityId}")` +
    ` OR ${sortField} IS NULL`
  );
};

const esqlResponseToRows = (response: {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}): Array<Record<string, unknown>> =>
  response.values.map((row) => {
    const record: Record<string, unknown> = {};
    response.columns.forEach((col, i) => {
      record[col.name] = row[i];
    });
    return record;
  });

/**
 * ES|QL snippet that produces (entity.name, last_seen_alert) rows by UNIONing
 * host.name and user.name aggregations. This correctly attributes an alert to
 * BOTH the host and the user referenced in the same alert document, avoiding
 * the COALESCE pitfall where one field silently shadows the other.
 */
const ALERT_LOOKBACK_DAYS = 30;

const alertTimestampByNameSubquery = (alertsIndex: string): string => {
  const cutoff = new Date(Date.now() - ALERT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return [
    `FROM (`,
    `  FROM ${alertsIndex}`,
    `  | WHERE \`@timestamp\` >= "${cutoff}"`,
    `  | STATS ${LAST_SEEN_ALERT_FIELD} = MAX(\`@timestamp\`) BY host.name`,
    `  | RENAME host.name AS entity_name`,
    `),`,
    `(`,
    `  FROM ${alertsIndex}`,
    `  | WHERE \`@timestamp\` >= "${cutoff}"`,
    `  | STATS ${LAST_SEEN_ALERT_FIELD} = MAX(\`@timestamp\`) BY user.name`,
    `  | RENAME user.name AS entity_name`,
    `),`,
    `(`,
    `  FROM ${alertsIndex}`,
    `  | WHERE \`@timestamp\` >= "${cutoff}"`,
    `  | STATS ${LAST_SEEN_ALERT_FIELD} = MAX(\`@timestamp\`) BY service.name`,
    `  | RENAME service.name AS entity_name`,
    `)`,
    `| STATS ${LAST_SEEN_ALERT_FIELD} = MAX(${LAST_SEEN_ALERT_FIELD}) BY entity_name`,
    `| RENAME entity_name AS entity.name`,
  ].join('\n');
};

/**
 * Builds the ES|QL query for last_seen_alert sort. Starts from the alert union
 * subquery, LOOKUP JOINs the entity index, then sorts and paginates.
 * Only entities that have at least one alert are returned.
 */
const buildLastSeenAlertQuery = ({
  entityAlias,
  alertsIndex,
  typeList,
  cursor,
  pageSize,
  sortDirection,
}: {
  entityAlias: string;
  alertsIndex: string;
  typeList: string;
  cursor: PageCursor | null;
  pageSize: number;
  sortDirection: 'asc' | 'desc';
}): string => {
  const cursorClause = cursor ? buildCursorWhereClause(cursor) : '';
  const sortDir = sortDirection.toUpperCase();
  const nullsOrder = sortDirection === 'desc' ? 'NULLS LAST' : 'NULLS FIRST';

  return [
    `FROM (`,
    `  ${alertTimestampByNameSubquery(alertsIndex).split('\n').join('\n  ')}`,
    `  | LOOKUP JOIN ${entityAlias} ON entity.name`,
    `  | WHERE entity.id IS NOT NULL AND ${ENTITY_TYPE_FIELD} IN (${typeList})`,
    ...(cursorClause ? [`  ${cursorClause}`] : []),
    `)`,
    `| SORT ${LAST_SEEN_ALERT_FIELD} ${sortDir} ${nullsOrder}, ${ENTITY_ID_FIELD} ASC`,
    `| LIMIT ${pageSize + 1}`,
  ].join('\n');
};

const buildLastSeenAlertCountQuery = ({
  entityAlias,
  alertsIndex,
  typeList,
}: {
  entityAlias: string;
  alertsIndex: string;
  typeList: string;
}): string =>
  [
    alertTimestampByNameSubquery(alertsIndex),
    `| LOOKUP JOIN ${entityAlias} ON entity.name`,
    `| WHERE entity.id IS NOT NULL AND ${ENTITY_TYPE_FIELD} IN (${typeList})`,
    `| STATS total = COUNT(*)`,
  ].join('\n');

/** Returns yesterday/today UTC midnight strings for stable whole-day queries. */
const getYesterdayRange = (): { yesterdayStr: string; todayStr: string } => {
  const now = new Date();
  const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayMidnight = new Date(todayMidnight.getTime() - 24 * 60 * 60 * 1000);
  return { todayStr: todayMidnight.toISOString(), yesterdayStr: yesterdayMidnight.toISOString() };
};

/**
 * ES|QL snippet: yesterday risk scores joined with entity store via entity.id.
 * Produces (entity.id, yesterday_score, entity.*, risk_score_change) rows.
 */
const riskScoreChangeSubquery = (riskScoreIndex: string, entityAlias: string): string => {
  const { yesterdayStr, todayStr } = getYesterdayRange();
  return [
    `FROM ${riskScoreIndex}`,
    `| WHERE \`@timestamp\` >= "${yesterdayStr}" AND \`@timestamp\` < "${todayStr}"`,
    `| EVAL \`entity.id\` = COALESCE(host.name, user.name, service.name)`,
    `| EVAL yesterday_score = COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`,
    `| STATS yesterday_score = MAX(yesterday_score) BY \`entity.id\``,
    `| LOOKUP JOIN ${entityAlias} ON \`entity.id\``,
    `| WHERE ${ENTITY_TYPE_FIELD} IN (${ALLOWED_ENTITY_TYPES.map((t) => `"${t}"`).join(', ')}) AND ${RISK_SCORE_NORM_FIELD} IS NOT NULL`,
    `| EVAL ${RISK_SCORE_CHANGE_FIELD} = ${RISK_SCORE_NORM_FIELD} - yesterday_score`,
  ].join('\n');
};

const buildRiskScoreChangeSortQuery = ({
  entityAlias,
  riskScoreIndex,
  cursor,
  pageSize,
  sortDirection,
}: {
  entityAlias: string;
  riskScoreIndex: string;
  cursor: PageCursor | null;
  pageSize: number;
  sortDirection: 'asc' | 'desc';
}): string => {
  const cursorClause = cursor ? buildCursorWhereClause(cursor) : '';
  const sortDir = sortDirection.toUpperCase();
  const nullsOrder = sortDirection === 'desc' ? 'NULLS LAST' : 'NULLS FIRST';
  return [
    riskScoreChangeSubquery(riskScoreIndex, entityAlias),
    ...(cursorClause ? [cursorClause] : []),
    `| SORT ${RISK_SCORE_CHANGE_FIELD} ${sortDir} ${nullsOrder}, ${ENTITY_ID_FIELD} ASC`,
    `| LIMIT ${pageSize + 1}`,
  ].join('\n');
};

const buildRiskScoreChangeCountQuery = ({
  entityAlias,
  riskScoreIndex,
}: {
  entityAlias: string;
  riskScoreIndex: string;
}): string =>
  [riskScoreChangeSubquery(riskScoreIndex, entityAlias), `| STATS total = COUNT(*)`].join('\n');

/**
 * Queries yesterday's (whole-day UTC) risk scores for the given entity IDs.
 * Joins on entity.id via COALESCE(host.name, user.name, service.name) which
 * stores the same type-prefixed value as entity.id in the entity store.
 */
const buildYesterdayScoreQuery = ({
  riskScoreIndex,
  entityIds,
}: {
  riskScoreIndex: string;
  entityIds: string[];
}): string => {
  const { yesterdayStr, todayStr } = getYesterdayRange();
  const idList = entityIds.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(', ');
  return [
    `FROM ${riskScoreIndex}`,
    `| WHERE \`@timestamp\` >= "${yesterdayStr}" AND \`@timestamp\` < "${todayStr}"`,
    `| EVAL entity_id = COALESCE(host.name, user.name, service.name)`,
    `| EVAL score = COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`,
    `| WHERE entity_id IN (${idList})`,
    `| STATS yesterday_score = MAX(score) BY entity_id`,
  ].join('\n');
};

export const registerEntityGridRoute = ({
  router,
  logger,
}: EntityAnalyticsRoutesDeps) => {
  router.versioned
    .post({
      access: 'internal',
      path: ENTITY_GRID_INTERNAL_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: schema.object({
              filter: schema.maybe(schema.object({}, { unknowns: 'allow' })),
              sort: schema.maybe(
                schema.object({
                  field: schema.string({ maxLength: 200 }),
                  direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
                })
              ),
              page_size: schema.number({
                defaultValue: DEFAULT_PAGE_SIZE,
                min: 1,
                max: MAX_PAGE_SIZE,
              }),
              cursor: schema.maybe(schema.string({ maxLength: 500 })),
            }),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;
          const securitySolution = await context.securitySolution;
          const namespace = securitySolution.getSpaceId();
          const entityAlias = getEntitiesAlias(ENTITY_LATEST, namespace);
          const alertsIndex = `.alerts-security.alerts-${namespace}`;

          const {
            filter,
            sort = { field: ENTITY_ID_FIELD, direction: 'asc' as const },
            page_size: pageSize,
            cursor: encodedCursor,
          } = request.body;

          const cursor = encodedCursor ? decodeCursor(encodedCursor) : null;
          const typeList = ALLOWED_ENTITY_TYPES.map((t) => `"${t}"`).join(', ');
          const esFilter = filter ?? undefined;

          let dataQuery: string;
          let countQuery: string;

          const riskScoreIndex = `risk-score.risk-score-${namespace}`;

          if (sort.field === LAST_SEEN_ALERT_FIELD) {
            dataQuery = buildLastSeenAlertQuery({
              entityAlias,
              alertsIndex,
              typeList,
              cursor,
              pageSize,
              sortDirection: sort.direction,
            });
            countQuery = buildLastSeenAlertCountQuery({ entityAlias, alertsIndex, typeList });
          } else if (sort.field === RISK_SCORE_CHANGE_FIELD) {
            dataQuery = buildRiskScoreChangeSortQuery({
              entityAlias,
              riskScoreIndex,
              cursor,
              pageSize,
              sortDirection: sort.direction,
            });
            countQuery = buildRiskScoreChangeCountQuery({ entityAlias, riskScoreIndex });
          } else {
            const baseWhere = `| WHERE ${ENTITY_TYPE_FIELD} IN (${typeList})`;
            const cursorClause = cursor ? buildCursorWhereClause(cursor) : '';
            const sortClause =
              `| SORT ${sort.field} ${sort.direction.toUpperCase()} NULLS LAST,` +
              ` ${ENTITY_ID_FIELD} ASC`;

            dataQuery =
              `FROM ${entityAlias}` +
              `\n${baseWhere}` +
              (cursorClause ? `\n${cursorClause}` : '') +
              `\n${sortClause}` +
              `\n| LIMIT ${pageSize + 1}`;

            countQuery =
              `FROM ${entityAlias}` +
              `\n${baseWhere}` +
              `\n| STATS total = COUNT(*)`;
          }

          const [dataResult, countResult] = await Promise.all([
            esClient.esql.query({ query: dataQuery, ...(esFilter ? { filter: esFilter } : {}) }),
            esClient.esql.query({ query: countQuery, ...(esFilter ? { filter: esFilter } : {}) }),
          ]);

          const allRows = esqlResponseToRows(
            dataResult as { columns: Array<{ name: string; type: string }>; values: unknown[][] }
          );
          const hasNextPage = allRows.length > pageSize;
          const pageRows = hasNextPage ? allRows.slice(0, pageSize) : allRows;

          const countRows = esqlResponseToRows(
            countResult as { columns: Array<{ name: string; type: string }>; values: unknown[][] }
          );
          const total = (countRows[0]?.total as number) ?? 0;

          if (pageRows.length > 0) {
            const entityNames = pageRows.map((r) => r['entity.name'] as string).filter(Boolean);
            const entityIds = pageRows.map((r) => r[ENTITY_ID_FIELD] as string).filter(Boolean);
            const nameList = entityNames.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(', ');

            const alertCutoff = new Date(
              Date.now() - ALERT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
            ).toISOString();

            // alert timestamps: skip when we sorted by last_seen_alert (already in rows)
            const alertEnrichPromise =
              sort.field !== LAST_SEEN_ALERT_FIELD
                ? esClient.esql
                    .query({
                      query: [
                        `FROM (`,
                        `  FROM ${alertsIndex}`,
                        `  | WHERE \`@timestamp\` >= "${alertCutoff}" AND host.name IN (${nameList})`,
                        `  | STATS ${LAST_SEEN_ALERT_FIELD} = MAX(\`@timestamp\`) BY host.name`,
                        `  | RENAME host.name AS entity_name`,
                        `),`,
                        `(`,
                        `  FROM ${alertsIndex}`,
                        `  | WHERE \`@timestamp\` >= "${alertCutoff}" AND user.name IN (${nameList})`,
                        `  | STATS ${LAST_SEEN_ALERT_FIELD} = MAX(\`@timestamp\`) BY user.name`,
                        `  | RENAME user.name AS entity_name`,
                        `),`,
                        `(`,
                        `  FROM ${alertsIndex}`,
                        `  | WHERE \`@timestamp\` >= "${alertCutoff}" AND service.name IN (${nameList})`,
                        `  | STATS ${LAST_SEEN_ALERT_FIELD} = MAX(\`@timestamp\`) BY service.name`,
                        `  | RENAME service.name AS entity_name`,
                        `)`,
                        `| STATS ${LAST_SEEN_ALERT_FIELD} = MAX(${LAST_SEEN_ALERT_FIELD}) BY entity_name`,
                      ].join('\n'),
                    })
                    .then((r) =>
                      esqlResponseToRows(
                        r as { columns: Array<{ name: string; type: string }>; values: unknown[][] }
                      )
                    )
                    .catch((e) => {
                      logger.warn(`Failed to fetch alert timestamps: ${e}`);
                      return [];
                    })
                : Promise.resolve(null);

            // risk_score_change: skip when sorting by it (already computed in sort query)
            const yesterdayScorePromise =
              sort.field !== RISK_SCORE_CHANGE_FIELD
                ? esClient.esql
                    .query({ query: buildYesterdayScoreQuery({ riskScoreIndex, entityIds }) })
                    .then((r) =>
                      esqlResponseToRows(
                        r as { columns: Array<{ name: string; type: string }>; values: unknown[][] }
                      )
                    )
                    .catch((e) => {
                      logger.warn(`Failed to fetch yesterday risk scores: ${e}`);
                      return [];
                    })
                : Promise.resolve(null);

            const [alertRows, yesterdayRows] = await Promise.all([
              alertEnrichPromise,
              yesterdayScorePromise,
            ]);

            if (alertRows) {
              const alertByName = new Map<string, unknown>(
                alertRows.map((r) => [r.entity_name as string, r[LAST_SEEN_ALERT_FIELD]])
              );
              for (const row of pageRows) {
                row[LAST_SEEN_ALERT_FIELD] =
                  alertByName.get(row['entity.name'] as string) ?? null;
              }
            }

            if (yesterdayRows) {
              const yesterdayByEntityId = new Map<string, number>(
                yesterdayRows.map((r) => [r.entity_id as string, r.yesterday_score as number])
              );
              for (const row of pageRows) {
                const currentScore = row[RISK_SCORE_NORM_FIELD] as number | null;
                const yesterdayScore =
                  yesterdayByEntityId.get(row[ENTITY_ID_FIELD] as string) ?? null;
                row[RISK_SCORE_CHANGE_FIELD] =
                  currentScore != null && yesterdayScore != null
                    ? currentScore - yesterdayScore
                    : null;
              }
            }
          }

          let nextCursor: string | null = null;
          if (hasNextPage && pageRows.length > 0) {
            const lastRow = pageRows[pageRows.length - 1];
            nextCursor = encodeCursor({
              sortField: sort.field,
              sortDirection: sort.direction,
              sortValue: lastRow[sort.field] ?? null,
              entityId: (lastRow[ENTITY_ID_FIELD] as string) ?? '',
            });
          }

          return response.ok({
            body: {
              entities: pageRows,
              next_cursor: nextCursor,
              total,
            },
          });
        } catch (err) {
          logger.error(`Error fetching entity grid: ${err}`);
          const error = transformError(err);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
