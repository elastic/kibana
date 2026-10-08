/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEntityIds,
  getEntityId,
  getNumber,
  getString,
  ENTITY_ID_FIELD,
  GROUP_SIZE_FIELD,
  RESOLVED_TO_FIELD,
} from '../common';
import {
  ENTITY_TYPE_FILTER,
  getEntityAlias,
  buildKeepClause,
  buildFilterClause,
  buildLookupJoinClause,
  toList,
  buildSortSuffix,
  buildCursorClause,
  esc,
} from './esql';
import { buildEntitiesInViewCountQuery, buildEntitiesInViewSteps } from './entities_in_view';
import { buildMergedForeignSortQuery } from './foreign_sort';
import type {
  EsqlRunner,
  QueryArgs,
  PageEnricher,
  Row,
  ColumnQuerySpec,
  PageCursor,
  SortDir,
  SortPageContext,
} from '../common';
import { SPLIT_SORT_MIN_VIEW_SIZE } from './split_sort';

const GROUP_KEY = `COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`;

// ── sort queries ──────────────────────────────────────────────────────────────

/**
 * Unfiltered page: sort and limit the groups first, then join only the page rows. The join
 * runs after STATS, on the coordinator, so joining every group is what made this sort slow.
 * `has_head` keeps a group only when its target is one of its members (a type-matching entity
 * with no resolved_to), which is the existence check the join used to do: aliases of a deleted
 * target point at nothing, and their group stays hidden. Filters break this: a search can
 * exclude the target, and entity filters apply to target fields, so filtered sorts use the
 * queries below.
 */
const buildUnfilteredGroupSizeSortQuery = (args: QueryArgs): string =>
  [
    `FROM ${getEntityAlias(args.namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    `| EVAL group_key = ${GROUP_KEY}, is_head = CASE(${RESOLVED_TO_FIELD} IS NULL, 1, 0)`,
    `| STATS ${GROUP_SIZE_FIELD} = COUNT(*), has_head = MAX(is_head) BY group_key`,
    '| WHERE has_head == 1',
    '| RENAME group_key AS `entity.id`',
    ...buildCursorClause(args.cursor),
    buildSortSuffix(GROUP_SIZE_FIELD, args.sort.direction, args.pageSize),
    buildLookupJoinClause(args.concreteEntityIndexName),
    buildKeepClause(args, GROUP_SIZE_FIELD),
    // LOOKUP JOIN may not keep the input order.
    buildSortSuffix(GROUP_SIZE_FIELD, args.sort.direction, args.pageSize),
  ].join('\n');

/**
 * Upper bound on the groups with aliases that the entity filters keep. Below it, the size-one
 * branch reads enough targets to fill the page after dropping the targets that have aliases.
 * Above it, a page of size-one groups can come back short.
 */
const MAX_ALIAS_GROUPS = 10_000;

/**
 * Entity filters without a search: build the groups that have aliases from the alias docs only
 * (few), and read every other target as a group of one, filtered and sorted natively. The merge
 * keeps the larger size per target. This avoids grouping and joining every entity, which timed
 * out at 10M entities. Same rows as the join-first query, as entity filters apply to the target.
 */
const buildAliasFirstGroupSizeSortQuery = (args: QueryArgs): string => {
  const entityFilter = buildFilterClause(args.entityExpression);
  const cursor = buildCursorClause(args.cursor);
  const indent = (steps: string[]) => steps.map((step) => `  ${step}`);
  return [
    'FROM (',
    ...indent([
      `FROM ${getEntityAlias(args.namespace)}`,
      `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
      `| STATS alias_count = COUNT(*) BY group_key = ${RESOLVED_TO_FIELD}`,
      '| RENAME group_key AS `entity.id`',
      buildLookupJoinClause(args.concreteEntityIndexName),
      `| WHERE ${ENTITY_TYPE_FILTER}`,
      ...entityFilter,
      // The target is a member of its own group unless it resolves to another entity.
      `| EVAL ${GROUP_SIZE_FIELD} = alias_count + CASE(${RESOLVED_TO_FIELD} IS NULL, 1, 0)`,
      `| KEEP \`entity.id\`, ${GROUP_SIZE_FIELD}`,
    ]),
    '), (',
    ...indent([
      `FROM ${getEntityAlias(args.namespace)}`,
      `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NULL`,
      ...entityFilter,
      `| EVAL ${GROUP_SIZE_FIELD} = TO_LONG(1)`,
      ...cursor,
      `| SORT \`entity.id\` ASC`,
      `| LIMIT ${args.pageSize + 1 + MAX_ALIAS_GROUPS}`,
      `| KEEP \`entity.id\`, ${GROUP_SIZE_FIELD}`,
    ]),
    ')',
    `| STATS ${GROUP_SIZE_FIELD} = MAX(${GROUP_SIZE_FIELD}) BY \`entity.id\``,
    ...cursor,
    buildSortSuffix(GROUP_SIZE_FIELD, args.sort.direction, args.pageSize),
    buildLookupJoinClause(args.concreteEntityIndexName),
    buildKeepClause(args, GROUP_SIZE_FIELD),
    // LOOKUP JOIN may not keep the input order.
    buildSortSuffix(GROUP_SIZE_FIELD, args.sort.direction, args.pageSize),
  ].join('\n');
};

/**
 * A search picks the rows, like it does for every sort: the targets that match. It doesn't
 * change their values, so each row keeps the size of its whole group and stays expandable.
 * KQL can't run after a join, so the targets in view merge with the sizes of every group.
 */
const buildSearchGroupSizeSortQuery = (args: QueryArgs): string =>
  buildMergedForeignSortQuery(args, {
    foreignRows: [
      `FROM ${getEntityAlias(args.namespace)}`,
      `| WHERE ${ENTITY_TYPE_FILTER}`,
      `| EVAL group_key = ${GROUP_KEY}`,
      `| STATS ${GROUP_SIZE_FIELD} = COUNT(*) BY group_key`,
      '| RENAME group_key AS `entity.id`',
    ],
    mergeAggregations: [`${GROUP_SIZE_FIELD} = MAX(${GROUP_SIZE_FIELD})`],
    sortField: GROUP_SIZE_FIELD,
  });

const buildGroupSizeSortQuery = (args: QueryArgs): string => {
  if (args.searchExpression) return buildSearchGroupSizeSortQuery(args);
  if (args.entityExpression) return buildAliasFirstGroupSizeSortQuery(args);
  return buildUnfilteredGroupSizeSortQuery(args);
};

// ── large views ───────────────────────────────────────────────────────────────

/**
 * Groups with aliases in view: count the alias docs per target, then keep the target when it
 * exists, has an allowed type, passes the entity filters and is not itself an alias (the same
 * rows the unfiltered query and the count keep). There are few of them.
 */
const buildAliasGroupsQuery = (args: QueryArgs): string =>
  [
    `FROM ${getEntityAlias(args.namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
    `| STATS alias_count = COUNT(*) BY group_key = ${RESOLVED_TO_FIELD}`,
    '| RENAME group_key AS `entity.id`',
    buildLookupJoinClause(args.concreteEntityIndexName),
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NULL`,
    ...buildFilterClause(args.entityExpression),
    `| EVAL ${GROUP_SIZE_FIELD} = alias_count + 1`,
    `| KEEP \`entity.id\`, ${GROUP_SIZE_FIELD}`,
    `| LIMIT ${MAX_ALIAS_GROUPS + 1}`,
  ].join('\n');

/**
 * Entities in view, as groups of one, after `afterId` by entity.id. A top level query, so
 * Lucene sorts and limits it; inside a FROM subquery it reads every entity.id. Some of them
 * head a group with aliases, so callers ask for that many extra rows.
 */
const buildSingleEntitiesQuery = (args: QueryArgs, afterId: string | null, limit: number) =>
  [
    ...buildEntitiesInViewSteps(args),
    ...(afterId != null ? [`| WHERE ${ENTITY_ID_FIELD} > ${esc(afterId)}`] : []),
    `| SORT ${ENTITY_ID_FIELD} ASC`,
    `| LIMIT ${limit}`,
    `| EVAL ${GROUP_SIZE_FIELD} = TO_LONG(1)`,
    buildKeepClause(args, GROUP_SIZE_FIELD),
  ].join('\n');

const getGroupSize = (row: Row): number => getNumber(row, GROUP_SIZE_FIELD) ?? 1;

/** `SORT group_size <dir>, entity.id ASC` order. */
const compareGroups =
  (direction: SortDir) =>
  (a: Row, b: Row): number => {
    const bySize = getGroupSize(a) - getGroupSize(b);
    if (bySize !== 0) return direction === 'desc' ? -bySize : bySize;
    return (getEntityId(a) ?? '') < (getEntityId(b) ?? '') ? -1 : 1;
  };

const isAfterCursor =
  (cursor: PageCursor | null) =>
  (row: Row): boolean => {
    if (cursor == null || typeof cursor.sortValue !== 'number') return true;
    const size = getGroupSize(row);
    if (size === cursor.sortValue) return (getEntityId(row) ?? '') > cursor.entityId;
    return cursor.sortDirection === 'desc' ? size < cursor.sortValue : size > cursor.sortValue;
  };

/**
 * Most targets a search page reads directly; above it, it reads the groups with aliases.
 *
 * Why: the direct read costs grow with the matches, the groups read doesn't. ES|QL returns at
 * most 10k rows, so the matches can't be listed past it anyway.
 * Measured (10M entities, 16GB ECH, Oct 2026): a narrow search 0.6s here vs 2–3s through the
 * groups; a broad search 2.5–4s, where the single search query timed out.
 */
const MAX_DIRECT_TARGETS = 10_000;

/**
 * Ids per IN list.
 *
 * Why: an ES|QL statement is capped at 1MB, and entity ids run to about 100 characters, so a
 * 10k-id list fails ("ESQL statement is too large"). 2,000 ids stays well under the cap.
 */
const ID_LIST_CHUNK_SIZE = 2_000;

/** Runs one query per chunk of ids, in parallel, and concatenates the rows. */
const fetchPerIdChunk = async (
  runQuery: EsqlRunner,
  ids: readonly string[],
  buildQuery: (chunk: readonly string[]) => string
): Promise<Row[]> => {
  const chunks: Array<readonly string[]> = [];
  for (let i = 0; i < ids.length; i += ID_LIST_CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + ID_LIST_CHUNK_SIZE));
  }
  return (await Promise.all(chunks.map((chunk) => runQuery(buildQuery(chunk))))).flat();
};

/** Size of the whole group of each target: its aliases and itself. */
const buildGroupSizesQuery = ({ namespace }: QueryArgs, targetIds: readonly string[]): string => {
  const ids = toList(targetIds);
  return [
    `FROM ${getEntityAlias(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    `| WHERE ${RESOLVED_TO_FIELD} IN (${ids}) OR (${ENTITY_ID_FIELD} IN (${ids}) AND ${RESOLVED_TO_FIELD} IS NULL)`,
    `| EVAL group_key = ${GROUP_KEY}`,
    `| STATS ${GROUP_SIZE_FIELD} = COUNT(*) BY group_key`,
    '| RENAME group_key AS `entity.id`',
    `| LIMIT ${targetIds.length}`,
  ].join('\n');
};

/** The targets among `targetIds` that the search matches. */
const buildSearchedTargetsQuery = (args: QueryArgs, targetIds: readonly string[]): string =>
  [
    ...buildEntitiesInViewSteps(args),
    `| WHERE ${ENTITY_ID_FIELD} IN (${toList(targetIds)})`,
    `| KEEP \`entity.id\``,
    `| LIMIT ${targetIds.length}`,
  ].join('\n');

/** Adds the entity fields to the page rows in `ids`, which carry only id and size. */
const fetchWithEntityDocs = async (
  args: QueryArgs,
  runQuery: EsqlRunner,
  page: Row[],
  ids: ReadonlySet<string>
): Promise<Row[]> => {
  const pageIds = getEntityIds(page).filter((id) => ids.has(id));
  if (!pageIds.length) return page;
  const docs = await runQuery(
    [
      `FROM ${getEntityAlias(args.namespace)}`,
      `| WHERE ${ENTITY_ID_FIELD} IN (${toList(pageIds)})`,
      buildKeepClause(args),
    ].join('\n')
  );
  const docsById = new Map(docs.map((doc) => [getEntityId(doc), doc]));
  return page.map((row) => {
    const id = getEntityId(row);
    return id != null && ids.has(id) ? { ...docsById.get(id), ...row } : row;
  });
};

const getPage = (rows: Row[], { sort, cursor, pageSize }: QueryArgs): Row[] =>
  rows
    .sort(compareGroups(sort.direction))
    .filter(isAfterCursor(cursor))
    .slice(0, pageSize + 1);

/**
 * A search that matches few targets: read them, then the size of just their groups. Faster
 * the narrower the search (about 0.6s for one name on a 10M-entity ECH). `null` when the
 * search matches more than MAX_DIRECT_TARGETS targets.
 */
const fetchSearchedTargetsPage = async (
  args: QueryArgs,
  runQuery: EsqlRunner
): Promise<Row[] | null> => {
  const targets = await runQuery(
    [
      ...buildEntitiesInViewSteps(args),
      `| KEEP \`entity.id\``,
      `| LIMIT ${MAX_DIRECT_TARGETS + 1}`,
    ].join('\n')
  );
  const targetIds = getEntityIds(targets);
  if (targetIds.length > MAX_DIRECT_TARGETS) return null;

  const sizes = await fetchPerIdChunk(runQuery, targetIds, (chunk) =>
    buildGroupSizesQuery(args, chunk)
  );
  const sizeById = new Map(sizes.map((row) => [getEntityId(row), getGroupSize(row)]));
  const page = getPage(
    targetIds.map((id) => ({ [ENTITY_ID_FIELD]: id, [GROUP_SIZE_FIELD]: sizeById.get(id) ?? 1 })),
    args
  );
  return fetchWithEntityDocs(args, runQuery, page, new Set(targetIds));
};

/**
 * The groups with aliases and a page of single entities, merged here. With a search, only
 * the groups whose target matches it.
 *
 * Why: most entities are alone in their group, so only the alias docs need grouping.
 * Measured (10M entities, 16GB ECH, Oct 2026): grouping every entity in one query 20–25s;
 * this 1.3–2.7s (a deep page 7s), with the same rows.
 * Rejected: caching the groups with aliases between pages. It saves ~1s per page after the
 * first, but would show stale group sizes as entities resolve.
 */
const fetchAliasGroupsPage = async (args: QueryArgs, runQuery: EsqlRunner): Promise<Row[]> => {
  const aliasGroups = await runQuery(buildAliasGroupsQuery(args));
  if (aliasGroups.length > MAX_ALIAS_GROUPS) return runQuery(buildGroupSizeSortQuery(args));
  const aliasGroupIds = new Set(getEntityIds(aliasGroups));

  // KQL can't run after the join in the alias groups query: check their targets separately.
  const searchedIds = args.searchExpression
    ? new Set(
        getEntityIds(
          await fetchPerIdChunk(runQuery, [...aliasGroupIds], (chunk) =>
            buildSearchedTargetsQuery(args, chunk)
          )
        )
      )
    : aliasGroupIds;
  const groups = aliasGroups.filter((row) => searchedIds.has(getEntityId(row) ?? ''));

  const { cursor } = args;
  const limit = args.pageSize + 1;
  // Groups with aliases (size 2 or more) sort before single entities descending, after them
  // ascending. Skip the singles when the page can't reach them.
  const groupsAfterCursor = groups.filter(isAfterCursor(cursor)).length;
  const needsSingles =
    args.sort.direction === 'desc'
      ? groupsAfterCursor < limit
      : cursor == null || cursor.sortValue === 1;
  // Single entities sort by entity.id: only a cursor among them skips some.
  const afterId = cursor?.sortValue === 1 ? cursor.entityId : null;
  const singles = needsSingles
    ? (await runQuery(buildSingleEntitiesQuery(args, afterId, limit + aliasGroupIds.size)))
        // A target with aliases is in `groups` with its full size.
        .filter((row) => !aliasGroupIds.has(getEntityId(row) ?? ''))
    : [];

  return fetchWithEntityDocs(args, runQuery, getPage([...groups, ...singles], args), searchedIds);
};

/**
 * One page of rows plus one. A search reads its targets directly, or the groups with aliases
 * when it matches many: the single search query groups every entity in the store, however
 * few rows the search keeps. Without a search, views of SPLIT_SORT_MIN_VIEW_SIZE entities or
 * more read the page in parts, and smaller views keep the single query.
 */
const fetchGroupSizeSortPage = async (
  args: QueryArgs,
  { runQuery, viewSize }: SortPageContext
): Promise<Row[]> => {
  if (args.searchExpression) {
    return (await fetchSearchedTargetsPage(args, runQuery)) ?? fetchAliasGroupsPage(args, runQuery);
  }
  if (viewSize < SPLIT_SORT_MIN_VIEW_SIZE) return runQuery(buildGroupSizeSortQuery(args));
  return fetchAliasGroupsPage(args, runQuery);
};

// ── enrichment ────────────────────────────────────────────────────────────────

const buildGroupSizeEnrichQuery = (
  { namespace }: QueryArgs,
  groupKeys: readonly string[]
): string => {
  const keys = toList(groupKeys);
  return [
    `FROM ${getEntityAlias(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    // Pushable prefilter for the group_key filter below.
    `| WHERE ${RESOLVED_TO_FIELD} IN (${keys}) OR ${ENTITY_ID_FIELD} IN (${keys})`,
    `| EVAL group_key = ${GROUP_KEY}`,
    `| WHERE group_key IN (${keys})`,
    `| STATS ${GROUP_SIZE_FIELD} = COUNT(*) BY group_key`,
  ].join('\n');
};

const groupSizeEnricher: PageEnricher = {
  fields: [GROUP_SIZE_FIELD],
  fetch: async (pageRows, args, { runQuery }) => {
    const entityIds = [...new Set(getEntityIds(pageRows))];
    if (!entityIds.length) return new Map();

    const rows = await runQuery(buildGroupSizeEnrichQuery(args, entityIds));

    const byGroupKey = new Map(
      rows.map((r) => [getString(r, 'group_key'), getNumber(r, GROUP_SIZE_FIELD)])
    );
    // A target row matches its group key and gets the member count. An alias row is
    // never a group key, so it gets 1: it is a single record.
    return new Map(entityIds.map((id) => [id, { [GROUP_SIZE_FIELD]: byGroupKey.get(id) ?? 1 }]));
  },
};

// ── query spec ────────────────────────────────────────────────────────────────

export const groupSizeQuerySpec = {
  sort: {
    buildSortQuery: buildGroupSizeSortQuery,
    // One row per target in view, like every other sort.
    buildCountQuery: buildEntitiesInViewCountQuery,
    fetchSortPage: fetchGroupSizeSortPage,
  },
  enricher: groupSizeEnricher,
} satisfies ColumnQuerySpec;
