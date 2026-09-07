/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';
import { APP_ID } from '../../../../common/constants';
import { API_VERSIONS } from '../../../../common/entity_analytics/constants';
import { ENTITY_GRID_INTERNAL_URL } from '../../../../common/entity_analytics/entity_analytics/constants';
import type { EntityAnalyticsRoutesDeps } from '../types';

// ── constants ────────────────────────────────────────────────────────────────

const ALLOWED_ENTITY_TYPES = ['user', 'host', 'service'] as const;
const ALERT_ENTITY_FIELDS = ['host.name', 'user.name', 'service.name'] as const;

const ENTITY_TYPE_FIELD = 'entity.EngineMetadata.Type';
const ENTITY_ID_FIELD = 'entity.id';
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
const LAST_SEEN_ALERT_FIELD = 'last_seen_alert';
const RISK_SCORE_CHANGE_FIELD = 'risk_score_change';
const GROUP_SIZE_FIELD = 'group_size';
const ALERT_COUNT_FIELD = 'alert_count';
const ALERT_CRITICAL_FIELD = 'alert_critical';
const ALERT_HIGH_FIELD = 'alert_high';
const ALERT_MEDIUM_FIELD = 'alert_medium';
const ALERT_LOW_FIELD = 'alert_low';
const RISK_SCORE_NORM_FIELD = 'entity.risk.calculated_score_norm';
const CASE_COUNT_FIELD = 'case_count';

// Risk score history docs have one of host/user/service set per document.
const ENTITY_ID_COALESCE = `COALESCE(host.name, user.name, service.name)`;
const RISK_SCORE_COALESCE = `COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`;

const ALERT_LOOKBACK_DAYS = 30;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

// Computed sort fields that require their own query path (not native entity fields).
const COMPUTED_SORT_FIELDS = new Set([
  LAST_SEEN_ALERT_FIELD,
  RISK_SCORE_CHANGE_FIELD,
  GROUP_SIZE_FIELD,
  CASE_COUNT_FIELD,
]);

// Only allow field names composed of safe characters to prevent ES|QL injection.
const VALID_FIELD_RE = /^[@\w.]+$/;

// Fields returned in every page response (entity store has hundreds of fields; select only what
// the grid displays to avoid transferring the full denormalized document).
const ENTITY_BASE_FIELDS = [
  ENTITY_ID_FIELD,
  'entity.name',
  ENTITY_TYPE_FIELD,
  RISK_SCORE_NORM_FIELD,
  RESOLVED_TO_FIELD,
  'asset.criticality',
  'entity.source',
  'entity.attributes.watchlists',
  'entity.lifecycle.first_seen',
  '@timestamp',
] as const;

// ── types ────────────────────────────────────────────────────────────────────

interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}
type Row = Record<string, unknown>;
type SortDir = 'asc' | 'desc';

interface PageCursor {
  sortField: string;
  sortDirection: SortDir;
  sortValue: unknown;
  entityId: string;
}

// Computed once per request so data query and count query use the same window
// (avoids a midnight race where two independent utcDayStart() calls straddle day boundary).
interface RiskDateWindow {
  yesterdayStart: string;
  todayStart: string;
}

// ── primitives ───────────────────────────────────────────────────────────────

const esc = (s: string) => `"${s.replace(/"/g, '\\"')}"`;
const toList = (items: readonly string[]) => items.map(esc).join(', ');
// Backtick-quote field names that contain @ or whitespace (e.g. `@timestamp`).
const keepField = (f: string) => (/[@\s]/.test(f) ? `\`${f}\`` : f);
// KEEP clause limiting to base entity fields plus any extra (e.g. the sort field).
const keepClause = (...extra: string[]): string => {
  const fields = [...new Set([...ENTITY_BASE_FIELDS, ...extra])];
  return `| KEEP ${fields.map(keepField).join(', ')}`;
};
const indent = (s: string) =>
  s
    .split('\n')
    .map((l) => `  ${l}`)
    .join('\n');
const toRows = (r: unknown): Row[] => {
  const { columns, values } = r as EsqlResponse;
  return values.map((row) => Object.fromEntries(columns.map((col, i) => [col.name, row[i]])));
};

/** ISO timestamp of UTC midnight N days ago (0 = today, 1 = yesterday). */
const utcDayStart = (daysAgo = 0): string => {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  midnight.setUTCDate(midnight.getUTCDate() - daysAgo);
  return midnight.toISOString();
};

const riskDateWindow = (): RiskDateWindow => ({
  yesterdayStart: utcDayStart(1),
  todayStart: utcDayStart(0),
});

// ── cursors ──────────────────────────────────────────────────────────────────

const encodeCursor = (c: PageCursor): string => Buffer.from(JSON.stringify(c)).toString('base64');

const decodeCursor = (s: string): PageCursor =>
  JSON.parse(Buffer.from(s, 'base64').toString('utf8')) as PageCursor;

const cursorClause = ({
  sortField: f,
  sortDirection: dir,
  sortValue: v,
  entityId,
}: PageCursor): string => {
  const safeId = esc(entityId);
  if (v == null) return `| WHERE ${f} IS NULL AND ${ENTITY_ID_FIELD} > ${safeId}`;
  const op = dir === 'desc' ? '<' : '>';
  const val = typeof v === 'string' ? esc(v) : String(v);
  // OR f IS NULL is correct here because all paths use NULLS LAST — null rows are always
  // after non-null rows, so they belong on later pages relative to any non-null cursor value.
  return `| WHERE (${f} ${op} ${val}) OR (${f} == ${val} AND ${ENTITY_ID_FIELD} > ${safeId}) OR ${f} IS NULL`;
};

// ── query helpers ─────────────────────────────────────────────────────────────

// Always NULLS LAST so entities without data appear at the bottom regardless of sort direction.
const sortSuffix = (field: string, dir: SortDir, pageSize: number): string =>
  [
    `| SORT ${field} ${dir.toUpperCase()} NULLS LAST, ${ENTITY_ID_FIELD} ASC`,
    `| LIMIT ${pageSize + 1}`,
  ].join('\n');

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

// ── query builders: last_seen_alert sort ──────────────────────────────────────

const alertLeg = (index: string, field: string, cutoff: string, nameFilter?: string): string =>
  [
    `FROM ${index}`,
    // IS NOT NULL lets Lucene skip alerts that don't reference this entity type (e.g. skip
    // user/service-only alerts when scanning the host.name leg).
    `| WHERE \`@timestamp\` >= "${cutoff}" AND ${field} IS NOT NULL${
      nameFilter ? ` AND ${field} IN (${nameFilter})` : ''
    }`,
    `| STATS ${LAST_SEEN_ALERT_FIELD} = MAX(\`@timestamp\`) BY ${field}`,
    `| RENAME ${field} AS entity_name`,
  ].join('\n');

/** UNION of per-entity-type alert legs → (entity.name, last_seen_alert). Avoids the COALESCE
 *  pitfall where one field shadows another when alerts reference both host and user. */
const alertUnionQuery = (alertsIndex: string, nameFilter?: string): string => {
  // TODO: this cutoff is computed at call time. Data query and count query compute it
  // independently — a request straddling a 30-day boundary could see a one-doc discrepancy.
  // Low-impact (30d window), but fix by computing cutoff once per request like riskDateWindow().
  const cutoff = new Date(Date.now() - ALERT_LOOKBACK_DAYS * 86_400_000).toISOString();
  const [firstLeg, ...restLegs] = ALERT_ENTITY_FIELDS.map((f) =>
    alertLeg(alertsIndex, f, cutoff, nameFilter)
  );
  const union = [
    `FROM (\n${indent(firstLeg)}\n)`,
    ...restLegs.map((leg) => `(\n${indent(leg)}\n)`),
  ].join(',\n');
  return [
    union,
    `| STATS ${LAST_SEEN_ALERT_FIELD} = MAX(${LAST_SEEN_ALERT_FIELD}) BY entity_name`,
    `| RENAME entity_name AS entity.name`,
  ].join('\n');
};

// Returns per-entity alert counts broken down by severity, excluding closed alerts.
// Uses one leg per entity-name field (same pattern as alertUnionQuery) to avoid COALESCE
// incorrectly attributing alerts that have multiple entity fields set.
const alertCountEnrichQuery = (alertsIndex: string, entityNames: readonly string[]): string => {
  const cutoff = new Date(Date.now() - ALERT_LOOKBACK_DAYS * 86_400_000).toISOString();
  const names = toList(entityNames);

  const mkLeg = (field: string): string =>
    [
      `FROM ${alertsIndex}`,
      `| WHERE \`@timestamp\` >= "${cutoff}"`,
      `| WHERE kibana.alert.workflow_status IS NULL OR kibana.alert.workflow_status != "closed"`,
      `| WHERE ${field} IN (${names})`,
      `| STATS ${ALERT_COUNT_FIELD} = COUNT(*) BY entity_name = ${field}, \`kibana.alert.severity\``,
    ].join('\n');

  const [firstLeg, ...restLegs] = ALERT_ENTITY_FIELDS.map(mkLeg);
  const union = [
    `FROM (\n${indent(firstLeg)}\n)`,
    ...restLegs.map((leg) => `(\n${indent(leg)}\n)`),
  ].join(',\n');

  return [
    union,
    `| STATS ${ALERT_COUNT_FIELD} = SUM(${ALERT_COUNT_FIELD}) BY entity_name, \`kibana.alert.severity\``,
  ].join('\n');
};

// TODO: when sorting by last_seen_alert, entities without any alert in the last 30 days are
// excluded from results entirely — the count reflects this subset, not the full entity count.
// A future improvement: include all entities and treat no-alert as null (sort last).

const lastSeenAlertDataQuery = (
  alertsIndex: string,
  entityAlias: string,
  cursor: PageCursor | null,
  pageSize: number,
  dir: SortDir
): string => {
  const inner = [
    alertUnionQuery(alertsIndex),
    `| LOOKUP JOIN ${entityAlias} ON entity.name`,
    `| WHERE ${ENTITY_ID_FIELD} IS NOT NULL AND ${ENTITY_TYPE_FIELD} IN (${toList(
      ALLOWED_ENTITY_TYPES
    )})`,
    keepClause(LAST_SEEN_ALERT_FIELD),
    ...(cursor ? [cursorClause(cursor)] : []),
  ].join('\n');
  return [`FROM (`, indent(inner), `)`, sortSuffix(LAST_SEEN_ALERT_FIELD, dir, pageSize)].join(
    '\n'
  );
};

const lastSeenAlertCountQuery = (alertsIndex: string, entityAlias: string): string =>
  [
    alertUnionQuery(alertsIndex),
    `| LOOKUP JOIN ${entityAlias} ON entity.name`,
    `| WHERE ${ENTITY_ID_FIELD} IS NOT NULL AND ${ENTITY_TYPE_FIELD} IN (${toList(
      ALLOWED_ENTITY_TYPES
    )})`,
    `| KEEP \`${ENTITY_ID_FIELD}\``,
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── query builders: risk_score_change sort ────────────────────────────────────

// TODO: when sorting by risk_score_change, only entities that have BOTH a yesterday score and
// a today score are included — entities new today (no yesterday) or with no today score are
// excluded entirely. The count reflects this subset, not the full entity count.

/** Base pipeline: risk history → LOOKUP JOIN entity store → compute delta. */
const riskScoreChangeBaseQuery = (
  riskScoreIndex: string,
  entityAlias: string,
  { yesterdayStart, todayStart }: RiskDateWindow
): string =>
  [
    `FROM ${riskScoreIndex}`,
    `| WHERE TRANGE("${yesterdayStart}", "${todayStart}")`,
    `| EVAL \`entity.id\` = ${ENTITY_ID_COALESCE}, yesterday_score = ${RISK_SCORE_COALESCE}`,
    `| STATS yesterday_score = MAX(yesterday_score) BY \`entity.id\``,
    `| LOOKUP JOIN ${entityAlias} ON \`entity.id\``,
    `| WHERE ${ENTITY_TYPE_FIELD} IN (${toList(
      ALLOWED_ENTITY_TYPES
    )}) AND ${RISK_SCORE_NORM_FIELD} IS NOT NULL`,
    `| EVAL ${RISK_SCORE_CHANGE_FIELD} = ${RISK_SCORE_NORM_FIELD} - yesterday_score`,
    keepClause(RISK_SCORE_CHANGE_FIELD),
  ].join('\n');

const riskScoreChangeDataQuery = (
  riskScoreIndex: string,
  entityAlias: string,
  cursor: PageCursor | null,
  pageSize: number,
  dir: SortDir,
  window: RiskDateWindow
): string =>
  [
    riskScoreChangeBaseQuery(riskScoreIndex, entityAlias, window),
    ...(cursor ? [cursorClause(cursor)] : []),
    sortSuffix(RISK_SCORE_CHANGE_FIELD, dir, pageSize),
  ].join('\n');

const riskScoreChangeCountQuery = (
  riskScoreIndex: string,
  entityAlias: string,
  window: RiskDateWindow
): string =>
  [riskScoreChangeBaseQuery(riskScoreIndex, entityAlias, window), `| STATS total = COUNT(*)`].join(
    '\n'
  );

// ── query builders: per-page enrichment ──────────────────────────────────────

/** Fetches (entity_id, yesterday_score) for a specific set of entity IDs. */
const yesterdayScoreEnrichQuery = (
  riskScoreIndex: string,
  entityIds: string[],
  { yesterdayStart, todayStart }: RiskDateWindow
): string => {
  const ids = toList(entityIds);
  return [
    `FROM ${riskScoreIndex}`,
    `| WHERE TRANGE("${yesterdayStart}", "${todayStart}")`,
    // Pre-filter using indexed name fields so Lucene skips unrelated risk docs before EVAL.
    `| WHERE host.name IN (${ids}) OR user.name IN (${ids}) OR service.name IN (${ids})`,
    `| EVAL entity_id = ${ENTITY_ID_COALESCE}, score = ${RISK_SCORE_COALESCE}`,
    `| WHERE entity_id IN (${ids})`,
    `| STATS yesterday_score = MAX(score) BY entity_id`,
  ].join('\n');
};

// ── route helpers ─────────────────────────────────────────────────────────────

interface QueryPair {
  dataQuery: string;
  countQuery: string;
}

const buildPageQueries = (
  sort: { field: string; direction: SortDir },
  cursor: PageCursor | null,
  pageSize: number,
  entityAlias: string,
  alertsIndex: string,
  riskScoreIndex: string,
  window: RiskDateWindow
): QueryPair => {
  if (sort.field === LAST_SEEN_ALERT_FIELD) {
    return {
      dataQuery: lastSeenAlertDataQuery(alertsIndex, entityAlias, cursor, pageSize, sort.direction),
      countQuery: lastSeenAlertCountQuery(alertsIndex, entityAlias),
    };
  }
  if (sort.field === RISK_SCORE_CHANGE_FIELD) {
    return {
      dataQuery: riskScoreChangeDataQuery(
        riskScoreIndex,
        entityAlias,
        cursor,
        pageSize,
        sort.direction,
        window
      ),
      countQuery: riskScoreChangeCountQuery(riskScoreIndex, entityAlias, window),
    };
  }
  if (sort.field === GROUP_SIZE_FIELD) {
    return {
      dataQuery: groupSizeSortDataQuery(entityAlias, cursor, pageSize, sort.direction),
      countQuery: groupSizeSortCountQuery(entityAlias),
    };
  }
  return {
    dataQuery: nativeEntityDataQuery(entityAlias, sort.field, sort.direction, cursor, pageSize),
    countQuery: nativeEntityCountQuery(entityAlias),
  };
};

// ── query builders: group_size sort ──────────────────────────────────────────

// Computes group sizes via STATS, then LOOKUP JOINs to fetch entity fields.
// Returns one row per resolution TARGET (aliases merge into their target's count).
const groupSizeSortDataQuery = (
  entityAlias: string,
  cursor: PageCursor | null,
  pageSize: number,
  dir: SortDir
): string => {
  const inner = [
    `FROM ${entityAlias}`,
    `| WHERE ${ENTITY_TYPE_FIELD} IN (${toList(ALLOWED_ENTITY_TYPES)})`,
    `| EVAL group_key = COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`,
    `| STATS ${GROUP_SIZE_FIELD} = COUNT(*) BY group_key`,
    `| RENAME group_key AS \`entity.id\``,
  ].join('\n');
  return [
    `FROM (\n${indent(inner)}\n)`,
    `| LOOKUP JOIN ${entityAlias} ON \`entity.id\``,
    `| WHERE ${ENTITY_ID_FIELD} IS NOT NULL AND ${ENTITY_TYPE_FIELD} IN (${toList(ALLOWED_ENTITY_TYPES)})`,
    keepClause(GROUP_SIZE_FIELD),
    ...(cursor ? [cursorClause(cursor)] : []),
    sortSuffix(GROUP_SIZE_FIELD, dir, pageSize),
  ].join('\n');
};

const groupSizeSortCountQuery = (entityAlias: string): string =>
  [
    `FROM ${entityAlias}`,
    `| WHERE ${ENTITY_TYPE_FIELD} IN (${toList(ALLOWED_ENTITY_TYPES)})`,
    `| EVAL group_key = COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`,
    `| STATS _c = COUNT(*) BY group_key`,
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── query builders: group_size enrichment ────────────────────────────────────

const groupSizeEnrichQuery = (entityAlias: string, groupKeys: readonly string[]): string =>
  [
    `FROM ${entityAlias}`,
    `| WHERE ${ENTITY_TYPE_FIELD} IN (${toList(ALLOWED_ENTITY_TYPES)})`,
    `| EVAL group_key = COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`,
    `| WHERE group_key IN (${toList(groupKeys)})`,
    `| STATS ${GROUP_SIZE_FIELD} = COUNT(*) BY group_key`,
  ].join('\n');

const enrichPageRows = async (
  pageRows: Row[],
  sort: { field: string; direction: SortDir },
  alertsIndex: string,
  riskScoreIndex: string,
  entityAlias: string,
  window: RiskDateWindow,
  rawQuery: (q: string) => Promise<Row[]>,
  logger: EntityAnalyticsRoutesDeps['logger']
): Promise<void> => {
  if (pageRows.length === 0) return;

  const entityNames = pageRows.map((r) => r['entity.name'] as string).filter(Boolean);
  const entityIds = pageRows.map((r) => r[ENTITY_ID_FIELD] as string).filter(Boolean);
  const groupKeys = [
    ...new Set(
      pageRows.map(
        (r) => (r[RESOLVED_TO_FIELD] as string | null) ?? (r[ENTITY_ID_FIELD] as string)
      )
    ),
  ].filter(Boolean);

  const tryEnrich = (q: string, label: string) =>
    rawQuery(q).catch((e: unknown) => {
      logger.warn(`${label}: ${e}`);
      return null;
    });

  const [alertRows, alertCountRows, scoreRows, groupSizeRows] = await Promise.all([
    sort.field !== LAST_SEEN_ALERT_FIELD
      ? tryEnrich(alertUnionQuery(alertsIndex, toList(entityNames)), 'alert enrich')
      : null,
    entityNames.length > 0
      ? tryEnrich(alertCountEnrichQuery(alertsIndex, entityNames), 'alert count enrich')
      : null,
    sort.field !== RISK_SCORE_CHANGE_FIELD
      ? tryEnrich(yesterdayScoreEnrichQuery(riskScoreIndex, entityIds, window), 'score enrich')
      : null,
    groupKeys.length > 0
      ? tryEnrich(groupSizeEnrichQuery(entityAlias, groupKeys), 'group size enrich')
      : null,
  ]);

  if (alertRows) {
    const byName = new Map(
      alertRows.map((r) => [r['entity.name'] as string, r[LAST_SEEN_ALERT_FIELD]])
    );
    for (const row of pageRows)
      row[LAST_SEEN_ALERT_FIELD] = byName.get(row['entity.name'] as string) ?? null;
  }

  if (alertCountRows) {
    type SeverityBucket = { total: number; critical: number; high: number; medium: number; low: number };
    const byName = new Map<string, SeverityBucket>();
    for (const r of alertCountRows) {
      const name = r.entity_name as string;
      const sev = (r['kibana.alert.severity'] as string | null) ?? '';
      const cnt = (r[ALERT_COUNT_FIELD] as number) ?? 0;
      if (!byName.has(name)) byName.set(name, { total: 0, critical: 0, high: 0, medium: 0, low: 0 });
      const bucket = byName.get(name)!;
      bucket.total += cnt;
      if (sev === 'critical') bucket.critical += cnt;
      else if (sev === 'high') bucket.high += cnt;
      else if (sev === 'medium') bucket.medium += cnt;
      else if (sev === 'low') bucket.low += cnt;
    }
    for (const row of pageRows) {
      const bucket = byName.get(row['entity.name'] as string);
      row[ALERT_COUNT_FIELD] = bucket?.total ?? 0;
      row[ALERT_CRITICAL_FIELD] = bucket?.critical ?? 0;
      row[ALERT_HIGH_FIELD] = bucket?.high ?? 0;
      row[ALERT_MEDIUM_FIELD] = bucket?.medium ?? 0;
      row[ALERT_LOW_FIELD] = bucket?.low ?? 0;
    }
  }

  if (scoreRows) {
    const byId = new Map(
      scoreRows.map((r) => [r.entity_id as string, r.yesterday_score as number])
    );
    for (const row of pageRows) {
      const cur = row[RISK_SCORE_NORM_FIELD] as number | null;
      const yday = byId.get(row[ENTITY_ID_FIELD] as string) ?? null;
      row[RISK_SCORE_CHANGE_FIELD] = cur != null && yday != null ? cur - yday : null;
    }
  }

  if (groupSizeRows) {
    const byGroupKey = new Map(
      groupSizeRows.map((r) => [r.group_key as string, r[GROUP_SIZE_FIELD] as number])
    );
    for (const row of pageRows) {
      const gk = (row[RESOLVED_TO_FIELD] as string | null) ?? (row[ENTITY_ID_FIELD] as string);
      row[GROUP_SIZE_FIELD] = byGroupKey.get(gk) ?? 1;
    }
  }
};

// ── query builders: case_count sort / enrichment ─────────────────────────────

// cases-attachments SO type has `attachmentId: keyword` mapping. The scoped SO client
// handles namespace isolation automatically, so one aggregation replaces N individual lookups.

interface CaseTermsBucket {
  key: string;
  doc_count: number;
}

interface CaseAggs {
  by_entity: { buckets: CaseTermsBucket[] };
}

/** Returns case counts keyed by entity ID for the given page of entity IDs (one SO query). */
const batchCaseCounts = async (
  soClient: ISavedObjectsRepository,
  entityIds: readonly string[],
  logger: EntityAnalyticsRoutesDeps['logger']
): Promise<Map<string, number>> => {
  if (entityIds.length === 0) return new Map();
  try {
    // KQL: attribute path uses `.attributes.` prefix; ES aggregation uses the raw field path.
    // Filter to `security.entity` type only — alert attachments also use `attachmentId` (as arrays).
    const idFilter = entityIds
      .map((id) => `cases-attachments.attributes.attachmentId: "${id.replace(/"/g, '\\"')}"`)
      .join(' OR ');
    const filter = `cases-attachments.attributes.type: "security.entity" AND (${idFilter})`;
    const result = await soClient.find<unknown, CaseAggs>({
      type: 'cases-attachments',
      perPage: 1,
      filter,
      aggs: { by_entity: { terms: { field: 'cases-attachments.attributes.attachmentId', size: entityIds.length } } },
    });
    const counts = new Map<string, number>();
    for (const b of result.aggregations?.by_entity?.buckets ?? []) {
      counts.set(b.key, b.doc_count);
    }
    return counts;
  } catch (e) {
    logger.error(`batchCaseCounts: ${e}`);
    return new Map();
  }
};

/** Returns ALL entity case-count buckets in the current space (for case_count sort). */
const getAllCaseBuckets = async (
  soClient: ISavedObjectsRepository,
  logger: EntityAnalyticsRoutesDeps['logger']
): Promise<CaseTermsBucket[]> => {
  try {
    const result = await soClient.find<unknown, CaseAggs>({
      type: 'cases-attachments',
      perPage: 1,
      filter: 'cases-attachments.attributes.type: "security.entity"',
      aggs: { by_entity: { terms: { field: 'cases-attachments.attributes.attachmentId', size: 10000 } } },
    });
    logger.debug(`getAllCaseBuckets: found ${result.aggregations?.by_entity?.buckets?.length ?? 0} buckets, total=${result.total}`);
    return result.aggregations?.by_entity?.buckets ?? [];
  } catch (e) {
    logger.error(`getAllCaseBuckets: ${e}`);
    return [];
  }
};

/** Fetches entity store rows for a specific set of entity IDs (used by case_count sort path). */
const entityDataByIdsQuery = (entityAlias: string, entityIds: readonly string[]): string =>
  [
    `FROM ${entityAlias}`,
    `| WHERE ${ENTITY_ID_FIELD} IN (${toList(entityIds)})`,
    `| WHERE ${ENTITY_TYPE_FIELD} IN (${toList(ALLOWED_ENTITY_TYPES)})`,
    keepClause(),
  ].join('\n');

// ── route ─────────────────────────────────────────────────────────────────────

export const registerEntityGridRoute = ({ router, logger, getStartServices }: EntityAnalyticsRoutesDeps) => {
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
          const entityAlias = getEntitiesAlias(ENTITY_LATEST, namespace);
          const alertsIndex = `.alerts-security.alerts-${namespace}`;
          const riskScoreIndex = `risk-score.risk-score-${namespace}`;

          const {
            filter,
            sort = { field: ENTITY_ID_FIELD, direction: 'asc' as const },
            page_size: pageSize,
            cursor: encodedCursor,
          } = request.body;

          // Validate sort field to prevent ES|QL injection via the field name.
          if (!COMPUTED_SORT_FIELDS.has(sort.field) && !VALID_FIELD_RE.test(sort.field)) {
            return siemResponse.error({
              statusCode: 400,
              body: `Invalid sort field: ${sort.field}`,
            });
          }

          const cursor = encodedCursor ? decodeCursor(encodedCursor) : null;

          // Validate cursor sort field too — cursor is client-supplied and not signed.
          if (
            cursor &&
            !COMPUTED_SORT_FIELDS.has(cursor.sortField) &&
            !VALID_FIELD_RE.test(cursor.sortField)
          ) {
            return siemResponse.error({ statusCode: 400, body: 'Invalid cursor' });
          }

          // filter is from the search bar and targets entity store fields — apply it only to
          // entity queries, not to alert or risk score index queries which have different schemas.
          const esqlOpts = filter ? { filter } : {};
          const query = (q: string) =>
            esClient.esql.query({ query: q, drop_null_columns: true, ...esqlOpts }).then(toRows);
          const rawQuery = (q: string) =>
            esClient.esql.query({ query: q, drop_null_columns: true }).then(toRows);

          const window = riskDateWindow();
          const [coreStart] = await getStartServices();
          const soClient = coreStart.savedObjects.createInternalRepository(['cases-attachments']);

          // ── case_count sort: paginate via SO aggregation, look up entity rows separately ──
          if (sort.field === CASE_COUNT_FIELD) {
            const allBuckets = await getAllCaseBuckets(soClient, logger);
            allBuckets.sort((a, b) => {
              const cmp = sort.direction === 'desc' ? b.doc_count - a.doc_count : a.doc_count - b.doc_count;
              if (cmp !== 0) return cmp;
              return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
            });

            let startIdx = 0;
            if (cursor) {
              const cursorCount = cursor.sortValue as number;
              const cursorId = cursor.entityId;
              const found = allBuckets.findIndex((b) =>
                sort.direction === 'desc'
                  ? b.doc_count < cursorCount || (b.doc_count === cursorCount && b.key > cursorId)
                  : b.doc_count > cursorCount || (b.doc_count === cursorCount && b.key > cursorId)
              );
              startIdx = found === -1 ? allBuckets.length : found;
            }

            const pageBuckets = allBuckets.slice(startIdx, startIdx + pageSize + 1);
            const hasNextPage = pageBuckets.length > pageSize;
            const pageBucketsSlice = hasNextPage ? pageBuckets.slice(0, pageSize) : pageBuckets;
            const pageEntityIds = pageBucketsSlice.map((b) => b.key);
            const caseCountMap = new Map(pageBucketsSlice.map((b) => [b.key, b.doc_count]));

            let pageRows: Row[] = [];
            if (pageEntityIds.length > 0) {
              const entityRows = await query(entityDataByIdsQuery(entityAlias, pageEntityIds));
              const entityRowMap = new Map(entityRows.map((r) => [r[ENTITY_ID_FIELD] as string, r]));
              pageRows = pageEntityIds.map((id) => ({
                ...(entityRowMap.get(id) ?? { [ENTITY_ID_FIELD]: id }),
                [CASE_COUNT_FIELD]: caseCountMap.get(id) ?? 0,
              }));
            }

            await enrichPageRows(pageRows, sort, alertsIndex, riskScoreIndex, entityAlias, window, rawQuery, logger);

            const lastBucket = pageBucketsSlice[pageBucketsSlice.length - 1];
            const nextCursor = hasNextPage && lastBucket
              ? encodeCursor({
                  sortField: CASE_COUNT_FIELD,
                  sortDirection: sort.direction,
                  sortValue: lastBucket.doc_count,
                  entityId: lastBucket.key,
                })
              : null;

            return response.ok({ body: { entities: pageRows, next_cursor: nextCursor, total: allBuckets.length } });
          }

          // ── standard sort: ES|QL-based pagination ────────────────────────────
          const { dataQuery, countQuery } = buildPageQueries(
            sort,
            cursor,
            pageSize,
            entityAlias,
            alertsIndex,
            riskScoreIndex,
            window
          );

          const [allRows, [countRow]] = await Promise.all([query(dataQuery), query(countQuery)]);
          const hasNextPage = allRows.length > pageSize;
          const pageRows = hasNextPage ? allRows.slice(0, pageSize) : allRows;
          const total = (countRow?.total as number) ?? 0;

          await enrichPageRows(
            pageRows,
            sort,
            alertsIndex,
            riskScoreIndex,
            entityAlias,
            window,
            rawQuery,
            logger
          );

          // Batch case count enrichment — one SO aggregation for the whole page.
          const pageCaseCounts = await batchCaseCounts(
            soClient,
            pageRows.map((r) => r[ENTITY_ID_FIELD] as string).filter(Boolean),
            logger
          );
          for (const row of pageRows) {
            row[CASE_COUNT_FIELD] = pageCaseCounts.get(row[ENTITY_ID_FIELD] as string) ?? 0;
          }

          const lastRow = pageRows[pageRows.length - 1];
          const nextCursor =
            hasNextPage && lastRow
              ? encodeCursor({
                  sortField: sort.field,
                  sortDirection: sort.direction,
                  sortValue: lastRow[sort.field] ?? null,
                  entityId: (lastRow[ENTITY_ID_FIELD] as string) ?? '',
                })
              : null;

          return response.ok({ body: { entities: pageRows, next_cursor: nextCursor, total } });
        } catch (err) {
          logger.error(`entity grid: ${err}`);
          const error = transformError(err);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
