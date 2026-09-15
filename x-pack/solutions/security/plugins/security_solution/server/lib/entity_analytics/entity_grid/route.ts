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
import type { ElasticsearchClient } from '@kbn/core/server';
import { APP_ID } from '../../../../common/constants';
import { API_VERSIONS } from '../../../../common/entity_analytics/constants';
import { ENTITY_GRID_INTERNAL_URL } from '../../../../common/entity_analytics/entity_analytics/constants';
import type { EntityAnalyticsRoutesDeps } from '../types';
import {
  ALERT_COUNT_FIELD,
  ALLOWED_ENTITY_TYPES,
  ANOMALY_COUNT_FIELD,
  COMPUTED_SORT_FIELDS,
  ENTITY_ID_FIELD,
  ENTITY_TYPE_FIELD,
  GROUP_SIZE_FIELD,
  LAST_SEEN_ALERT_FIELD,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  RISK_SCORE_CHANGE_FIELD,
  VALID_FIELD_RE,
  alertLookbackCutoff,
  decodeCursor,
  encodeCursor,
  keepClause,
  riskDateWindow,
  toList,
  toRows,
  cursorClause,
} from './common';
import type { TimeRange, PageCursor, QueryDeps, RawQuery, Row, SortDir } from './common';

import {
  alertCountSortCountQuery,
  alertCountSortDataQuery,
  enrichAlerts,
  lastSeenAlertCountQuery,
  lastSeenAlertDataQuery,
} from './alerts';
import {
  anomalyCountSortCountQuery,
  anomalyCountSortDataQuery,
  enrichAnomalyCount,
} from './anomalies';
import {
  riskScoreChangeCountQuery,
  riskScoreChangeDataQuery,
  enrichRiskScoreChange,
} from './risk_score';
import { groupSizeSortCountQuery, groupSizeSortDataQuery, enrichGroupSize } from './group_size';
import { enrichCaseCounts } from './cases';

// ── query builders: native entity sort ───────────────────────────────────────

const nativeEntityDataQuery = (
  entityAlias: string,
  field: string,
  dir: SortDir,
  cursor: PageCursor | null,
  pageSize: number
): string =>
  [
    `FROM ${entityAlias}`,
    `| WHERE ${ENTITY_TYPE_FIELD} IN (${toList(ALLOWED_ENTITY_TYPES)})`,
    keepClause(field),
    ...(cursor ? [cursorClause(cursor)] : []),
    `| SORT ${field} ${dir.toUpperCase()} NULLS LAST, ${ENTITY_ID_FIELD} ASC`,
    `| LIMIT ${pageSize + 1}`,
  ].join('\n');

const nativeEntityCountQuery = (entityAlias: string): string =>
  [
    `FROM ${entityAlias}`,
    `| WHERE ${ENTITY_TYPE_FIELD} IN (${toList(ALLOWED_ENTITY_TYPES)})`,
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── route helpers ─────────────────────────────────────────────────────────────

interface QueryPair {
  dataQuery: string;
  countQuery: string;
}

interface SortHandler {
  dataQuery: (deps: QueryDeps, cursor: PageCursor | null, pageSize: number, dir: SortDir) => string;
  countQuery: (deps: QueryDeps) => string;
  /** Fields the sort query already populates — enrichPageRows skips fetching them again. */
  providedFields: readonly string[];
}

// ── sort handler registry ─────────────────────────────────────────────────────

// To add a new computed sort: write dataQuery + countQuery builders in the domain file, then add one entry here.
const SORT_HANDLERS: Partial<Record<string, SortHandler>> = {
  [LAST_SEEN_ALERT_FIELD]: {
    dataQuery: lastSeenAlertDataQuery,
    countQuery: lastSeenAlertCountQuery,
    providedFields: [LAST_SEEN_ALERT_FIELD],
  },
  [RISK_SCORE_CHANGE_FIELD]: {
    dataQuery: riskScoreChangeDataQuery,
    countQuery: riskScoreChangeCountQuery,
    providedFields: [RISK_SCORE_CHANGE_FIELD],
  },
  [GROUP_SIZE_FIELD]: {
    dataQuery: groupSizeSortDataQuery,
    countQuery: groupSizeSortCountQuery,
    providedFields: [GROUP_SIZE_FIELD],
  },
  [ALERT_COUNT_FIELD]: {
    dataQuery: alertCountSortDataQuery,
    countQuery: alertCountSortCountQuery,
    // Alert count enrichment also provides severity breakdown — don't skip it.
    providedFields: [],
  },
  [ANOMALY_COUNT_FIELD]: {
    dataQuery: anomalyCountSortDataQuery,
    countQuery: anomalyCountSortCountQuery,
    providedFields: [ANOMALY_COUNT_FIELD],
  },
};

const isValidSortField = (field: string): boolean =>
  COMPUTED_SORT_FIELDS.has(field) || VALID_FIELD_RE.test(field);

const buildQueryDeps = (namespace: string, timeRange: TimeRange): QueryDeps => ({
  entityAlias: getEntitiesAlias(ENTITY_LATEST, namespace),
  alertsIndex: `.alerts-security.alerts-${namespace}`,
  riskScoreIndex: `risk-score.risk-score-${namespace}`,
  riskWindow: riskDateWindow(timeRange),
  alertCutoff: alertLookbackCutoff(timeRange),
  timeRange,
});

const executeSortPage = async (
  pageQuery: RawQuery,
  sort: { field: string; direction: SortDir },
  cursor: PageCursor | null,
  pageSize: number,
  deps: QueryDeps
): Promise<{ pageRows: Row[]; total: number | null; hasNextPage: boolean }> => {
  const { dataQuery, countQuery } = buildPageQueries(sort, cursor, pageSize, deps);
  const isPageFlip = cursor !== null;

  let allRows: Row[];
  let total: number | null;

  if (isPageFlip) {
    allRows = await pageQuery(dataQuery, 'sort');
    total = null;
  } else {
    const [rows, [countRow]] = await Promise.all([
      pageQuery(dataQuery, 'sort'),
      pageQuery(countQuery, 'count'),
    ]);
    allRows = rows;
    total = (countRow?.total as number) ?? 0;
  }

  const hasNextPage = allRows.length > pageSize;
  return { pageRows: hasNextPage ? allRows.slice(0, pageSize) : allRows, total, hasNextPage };
};

const buildNextCursor = (
  pageRows: Row[],
  sort: { field: string; direction: SortDir },
  hasNextPage: boolean
): string | null => {
  const lastRow = pageRows[pageRows.length - 1];
  if (!hasNextPage || !lastRow) return null;

  return encodeCursor({
    sortField: sort.field,
    sortDirection: sort.direction,
    sortValue: lastRow[sort.field] ?? null,
    entityId: (lastRow[ENTITY_ID_FIELD] as string) ?? '',
  });
};

// const writeQuery = (dir: string, name: string, q: string): void => {
//   const slug = name.replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '');
//   writeFileSync(path.join(dir, `${slug}.md`), `# ${name}\n\n\`\`\`esql\n${q}\n\`\`\`\n`);
// };

const makeQuery =
  (
    esClient: ElasticsearchClient,
    logger: EntityAnalyticsRoutesDeps['logger'],
    profileEnabled: boolean,
    opts: Record<string, unknown>,
    label: string
  ) =>
  async (q: string, nameOverride?: string): Promise<Row[]> => {
    const name = nameOverride ?? label;
    logger.info(`[entity-grid query] ${name}:\n${q}`);
    // writeQuery(dir, name, q);
    const t0 = Date.now();
    const r = await esClient.esql.query({ query: q, drop_null_columns: true, ...opts });
    const wall = Date.now() - t0;
    if (profileEnabled) {
      // const slug = name.replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '');
      // writeFileSync(
      //   path.join(dir, `${slug}.profile.json`),
      //   JSON.stringify({ took: r.took, wall, profile: r.profile }, null, 2)
      // );
      logger.info(`[entity-grid perf] ${name} took=${r.took}ms wall=${wall}ms`);
    } else {
      logger.debug(`[entity-grid perf] ${name} took=${r.took}ms wall=${wall}ms`);
    }
    return toRows(r);
  };

// Two sort modes:
//   Derived sort  — sort field is not a native entity doc field (e.g. risk_score_change, alert
//                   counts). A custom query runs against a secondary index (risk scores, alerts…),
//                   joins the entity store, and returns a pre-ranked page.
//   Native sort   — sort field lives directly on the entity document. A single ES|QL query against
//                   the entity store sorts and paginates in one shot.
// After either mode, enrichPageRows fills in the remaining non-native columns for the page.
const buildPageQueries = (
  sort: { field: string; direction: SortDir },
  cursor: PageCursor | null,
  pageSize: number,
  deps: QueryDeps
): QueryPair => {
  const handler = SORT_HANDLERS[sort.field];
  if (handler) {
    // Derived sort: custom query for this field (see SORT_HANDLERS registry above).
    return {
      dataQuery: handler.dataQuery(deps, cursor, pageSize, sort.direction),
      countQuery: handler.countQuery(deps),
    };
  }

  // Native sort: field is on the entity doc — query the entity store directly.
  return {
    dataQuery: nativeEntityDataQuery(
      deps.entityAlias,
      sort.field,
      sort.direction,
      cursor,
      pageSize
    ),
    countQuery: nativeEntityCountQuery(deps.entityAlias),
  };
};

// ── enrichPageRows ────────────────────────────────────────────────────────────

const enrichPageRows = async (
  pageRows: Row[],
  sortField: string,
  deps: QueryDeps,
  enrichPageQuery: RawQuery,
  logger: EntityAnalyticsRoutesDeps['logger']
): Promise<void> => {
  if (pageRows.length === 0) return;

  const skip = new Set(SORT_HANDLERS[sortField]?.providedFields ?? []);

  await Promise.all([
    enrichAlerts(pageRows, deps, skip, enrichPageQuery, logger),
    enrichRiskScoreChange(pageRows, deps, skip, enrichPageQuery, logger),
    enrichGroupSize(pageRows, deps, skip, enrichPageQuery, logger),
    enrichAnomalyCount(pageRows, deps, skip, enrichPageQuery, logger),
  ]);
};

// ── route ─────────────────────────────────────────────────────────────────────

export const registerEntityGridRoute = ({
  router,
  logger: rootLogger,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  const logger = rootLogger.get('entityAnalytics.entityGrid');
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
              time_range: schema.oneOf(
                [schema.literal('24h'), schema.literal('7d'), schema.literal('30d')],
                { defaultValue: '30d' }
              ),
              profile: schema.maybe(schema.boolean()),
            }),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;
          const { getSpaceId } = await context.securitySolution;
          const namespace = getSpaceId();

          const {
            filter,
            sort = { field: ENTITY_ID_FIELD, direction: 'asc' as const },
            page_size: pageSize,
            cursor: encodedCursor,
            time_range: timeRange,
            profile: profileEnabled = false,
          } = request.body;

          if (!isValidSortField(sort.field))
            return siemResponse.error({
              statusCode: 400,
              body: `Invalid sort field: ${sort.field}`,
            });

          const cursor = encodedCursor ? decodeCursor(encodedCursor) : null;

          if (cursor && !isValidSortField(cursor.sortField))
            return siemResponse.error({ statusCode: 400, body: 'Invalid cursor' });

          // The search bar filter targets entity store field names — include it in sort queries
          // (which run against the entity store) but not in enrichment queries (which run against
          // alerts and risk-score indices that have different schemas).
          const sortQueryOpts = {
            ...(filter ? { filter } : {}),
            ...(profileEnabled ? { profile: true } : {}),
          };

          const enrichQueryOpts = profileEnabled ? { profile: true as const } : {};

          // const sortSlugForDir = sort.field.replace(/[^a-z0-9_]/gi, '_');
          // const queryDir = `/tmp/entity_queries/${sortSlugForDir}`;
          // fs.mkdirSync(queryDir, { recursive: true });

          const pageQuery = makeQuery(esClient, logger, profileEnabled, sortQueryOpts, 'page');
          const enrichPageQuery = makeQuery(
            esClient,
            logger,
            profileEnabled,
            enrichQueryOpts,
            'enrich'
          );

          const deps = buildQueryDeps(namespace, timeRange as TimeRange);
          const [coreStart] = await getStartServices();
          const soClient = coreStart.savedObjects.createInternalRepository(['cases-attachments']);

          const requestStart = Date.now();

          const t0Sort = Date.now();
          const { pageRows, total, hasNextPage } = await executeSortPage(
            pageQuery,
            sort,
            cursor,
            pageSize,
            deps
          );
          if (profileEnabled)
            logger.info(`[entity-grid perf] sort+count wall=${Date.now() - t0Sort}ms`);

          const t0Enrich = Date.now();
          await enrichPageRows(pageRows, sort.field, deps, enrichPageQuery, logger);
          if (profileEnabled)
            logger.info(`[entity-grid perf] enrich wall=${Date.now() - t0Enrich}ms`);

          const t0Cases = Date.now();
          await enrichCaseCounts(pageRows, soClient, logger);
          if (profileEnabled)
            logger.info(`[entity-grid perf] cases wall=${Date.now() - t0Cases}ms`);

          if (profileEnabled)
            logger.info(
              `[entity-grid perf] total wall=${Date.now() - requestStart}ms rows=${pageRows.length}`
            );

          const nextCursor = buildNextCursor(pageRows, sort, hasNextPage);

          return response.ok({ body: { entities: pageRows, next_cursor: nextCursor, total } });
        } catch (err) {
          logger.error(`entity grid: ${err}`);
          const error = transformError(err);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
