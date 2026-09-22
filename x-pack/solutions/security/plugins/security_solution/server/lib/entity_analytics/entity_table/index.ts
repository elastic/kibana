/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { APP_ID } from '../../../../common/constants';
import { API_VERSIONS } from '../../../../common/entity_analytics/constants';
import { ENTITY_GRID_INTERNAL_URL } from '../../../../common/entity_analytics/entity_analytics/constants';
import type { EntityAnalyticsRoutesDeps } from '../types';
import {
  ALERT_COUNT_FIELD,
  ANOMALY_COUNT_FIELD,
  ENTITY_ID_FIELD,
  ENTITY_TYPE_FILTER,
  GROUP_SIZE_FIELD,
  LAST_SEEN_ALERT_FIELD,
  RESOLVED_TO_FIELD,
  RISK_SCORE_CHANGE_FIELD,
  decodeCursor,
  encodeCursor,
  entityAliasOf,
  keepClause,
  toRows,
  cursorClause,
} from './common';
import type { QueryArgs, EsqlRunner, Row } from './common';

import {
  alertCountSortCountQuery,
  alertCountSortDataQuery,
  enrichAlerts,
  lastSeenAlertCountQuery,
  lastSeenAlertDataQuery,
} from './columns/alerts';
import {
  anomalyCountSortCountQuery,
  anomalyCountSortDataQuery,
  enrichAnomalyCount,
} from './columns/anomalies';
import {
  riskScoreChangeCountQuery,
  riskScoreChangeDataQuery,
  enrichRiskScoreChange,
} from './columns/risk_score';
import {
  groupSizeSortCountQuery,
  groupSizeSortDataQuery,
  enrichGroupSize,
} from './columns/group_size';
import { enrichCaseCounts } from './columns/cases';

interface SortHandler {
  /** Returns one page of sorted entities. */
  sortQuery: (args: QueryArgs) => string;
  /** Returns total entity count. */
  countQuery: (args: QueryArgs) => string;
  /** Fields already populated by sortQuery — enrichment skips these. */
  providedFields: readonly string[];
}

// ── query builders: native entity sort ───────────────────────────────────────

const nativeEntityDataQuery = ({
  namespace,
  sort: { field, direction: dir },
  cursor,
  pageSize,
  view,
}: QueryArgs): string =>
  [
    `FROM ${entityAliasOf(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...(view === 'resolved' ? [`| WHERE ${RESOLVED_TO_FIELD} IS NULL`] : []),
    keepClause(),
    ...(cursor ? [cursorClause(cursor)] : []),
    `| SORT ${field} ${dir.toUpperCase()} NULLS LAST, ${ENTITY_ID_FIELD} ASC`,
    `| LIMIT ${pageSize + 1}`,
  ].join('\n');

const nativeEntityCountQuery = ({ namespace, view }: QueryArgs): string =>
  [
    `FROM ${entityAliasOf(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...(view === 'resolved' ? [`| WHERE ${RESOLVED_TO_FIELD} IS NULL`] : []),
    `| STATS total = COUNT(*)`,
  ].join('\n');

const nativeEntitySort: SortHandler = {
  sortQuery: nativeEntityDataQuery,
  countQuery: nativeEntityCountQuery,
  providedFields: [],
};

// ── sort handler registry ─────────────────────────────────────────────────────

const SORT_HANDLERS = {
  'entity.name': nativeEntitySort,
  'entity.EngineMetadata.Type': nativeEntitySort,
  'entity.risk.calculated_score_norm': nativeEntitySort,
  'entity.lifecycle.first_seen': nativeEntitySort,
  'asset.criticality': nativeEntitySort,
  '@timestamp': nativeEntitySort,
  [GROUP_SIZE_FIELD]: {
    sortQuery: groupSizeSortDataQuery,
    countQuery: groupSizeSortCountQuery,
    providedFields: [GROUP_SIZE_FIELD],
  },
  [RISK_SCORE_CHANGE_FIELD]: {
    sortQuery: riskScoreChangeDataQuery,
    countQuery: riskScoreChangeCountQuery,
    providedFields: [RISK_SCORE_CHANGE_FIELD],
  },
  [ALERT_COUNT_FIELD]: {
    sortQuery: alertCountSortDataQuery,
    countQuery: alertCountSortCountQuery,
    // Alert count enrichment also provides severity breakdown — don't skip it.
    providedFields: [],
  },
  [LAST_SEEN_ALERT_FIELD]: {
    sortQuery: lastSeenAlertDataQuery,
    countQuery: lastSeenAlertCountQuery,
    providedFields: [LAST_SEEN_ALERT_FIELD],
  },
  [ANOMALY_COUNT_FIELD]: {
    sortQuery: anomalyCountSortDataQuery,
    countQuery: anomalyCountSortCountQuery,
    providedFields: [ANOMALY_COUNT_FIELD],
  },
} as const satisfies Record<string, SortHandler>;

type SortField = keyof typeof SORT_HANDLERS;

// ── request schema ────────────────────────────────────────────────────────────

const SORT_FIELD = z.enum(Object.keys(SORT_HANDLERS) as [SortField, ...SortField[]]);

const EntityGridRequestBody = z.object({
  profile: z.boolean().optional(),
  filter: z.custom<QueryDslQueryContainer>().optional(),
  cursor: z.string().max(500).transform(decodeCursor).optional(),
  sort: z
    .object({ field: SORT_FIELD, direction: z.enum(['asc', 'desc']) })
    .default({ field: 'entity.risk.calculated_score_norm', direction: 'desc' }),
  page_size: z.number().int().min(1).max(100).default(25),
  time_range: z.enum(['24h', '7d', '30d']).default('30d'),
  view: z.enum(['resolved', 'raw']).default('resolved'),
});

const getSortedPage = async (
  runQuery: EsqlRunner,
  args: QueryArgs,
  handler: SortHandler
): Promise<{ pageRows: Row[]; total: number | null; hasNextPage: boolean }> => {
  const sortQuery = handler.sortQuery(args);
  const countQuery = handler.countQuery(args);
  const hasCursor = args.cursor !== null;

  let allRows: Row[];
  let total: number | null;

  if (hasCursor) {
    allRows = await runQuery(sortQuery);
    total = null;
  } else {
    const [rows, [countRow]] = await Promise.all([runQuery(sortQuery), runQuery(countQuery)]);
    allRows = rows;
    total = (countRow?.total as number) ?? 0;
  }

  const hasNextPage = allRows.length > args.pageSize;
  return {
    pageRows: hasNextPage ? allRows.slice(0, args.pageSize) : allRows,
    total,
    hasNextPage,
  };
};

const buildNextCursor = (pageRows: Row[], args: QueryArgs, hasNextPage: boolean): string | null => {
  const lastRow = pageRows[pageRows.length - 1];
  if (!hasNextPage || !lastRow) return null;

  return encodeCursor({
    sortField: args.sort.field,
    sortDirection: args.sort.direction,
    sortValue: lastRow[args.sort.field] ?? null,
    entityId: (lastRow[ENTITY_ID_FIELD] as string) ?? '',
  });
};

const makeQuery =
  (
    logger: EntityAnalyticsRoutesDeps['logger'],
    esClient: ElasticsearchClient,
    label: string,
    { filter, profile }: { filter?: QueryDslQueryContainer; profile?: boolean } = {}
  ) =>
  async (q: string): Promise<Row[]> => {
    const response = await esClient.esql.query({
      query: q,
      drop_null_columns: true,
      ...(filter && { filter }),
      ...(profile && { profile }),
    });
    logger.info(`${label} query took ${response.took}ms`);

    if (response.profile) {
      logger.info(`${label} query profile: ${JSON.stringify(response.profile)}`);
    }

    return toRows(response);
  };

const enrichPageRows = async (
  logger: EntityAnalyticsRoutesDeps['logger'],
  pageRows: Row[],
  args: QueryArgs,
  enrichPageQuery: EsqlRunner,
  handler: SortHandler,
  view: 'resolved' | 'raw'
): Promise<void> => {
  if (pageRows.length === 0) return;

  const skip = new Set(handler.providedFields);
  if (view === 'raw') skip.add(GROUP_SIZE_FIELD);

  await Promise.all([
    enrichAlerts(logger, pageRows, args, skip, enrichPageQuery),
    enrichRiskScoreChange(logger, pageRows, args, skip, enrichPageQuery),
    enrichGroupSize(logger, pageRows, args, skip, enrichPageQuery),
    enrichAnomalyCount(logger, pageRows, args, skip, enrichPageQuery),
  ]);
};

// ── route ─────────────────────────────────────────────────────────────────────

export const registerEntityGridRoute = ({
  router,
  logger: rootLogger,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  const logger = rootLogger.get('entityAnalytics.entityTable');
  router.versioned
    .post({
      access: 'internal',
      path: ENTITY_GRID_INTERNAL_URL,
      security: {
        authz: { requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`] },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(EntityGridRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;
          const [coreStart] = await getStartServices();
          const soClient = coreStart.savedObjects.createInternalRepository(['cases-attachments']);

          const { getSpaceId } = await context.securitySolution;
          const namespace = getSpaceId();

          const {
            filter,
            sort,
            page_size: pageSize,
            cursor,
            time_range: timeRange,
            profile,
            view,
          } = request.body;

          const runQuery = makeQuery(logger, esClient, 'page', { filter, profile });
          const enrichPageQuery = makeQuery(logger, esClient, 'enrich', { profile });

          const handler = SORT_HANDLERS[sort.field];
          const args: QueryArgs = { namespace, timeRange, sort, cursor: cursor ?? null, pageSize, view };

          const { pageRows, total, hasNextPage } = await getSortedPage(runQuery, args, handler);
          await enrichPageRows(logger, pageRows, args, enrichPageQuery, handler, view);
          await enrichCaseCounts(logger, pageRows, soClient); // not ESQL

          return response.ok({
            body: {
              entities: pageRows,
              next_cursor: buildNextCursor(pageRows, args, hasNextPage),
              total,
            },
          });
        } catch (err) {
          logger.error(`entity table: ${err}`);
          const error = transformError(err);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
