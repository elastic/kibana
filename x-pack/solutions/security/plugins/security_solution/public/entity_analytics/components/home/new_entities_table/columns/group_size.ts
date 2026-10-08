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
  ENTITY_ID_FIELD,
  ENTITY_TYPE_FILTER,
  GROUP_SIZE_FIELD,
  RESOLVED_TO_FIELD,
  entityAliasOf,
  buildKeepClause,
  buildFilterClause,
  buildLookupJoinClause,
  nullOnFailure,
  toList,
  buildSortSuffix,
  buildCursorClause,
  esc,
} from '../common';
import type {
  QueryArgs,
  PageEnricher,
  Row,
  ColumnQuerySpec,
  PageCursor,
  SortDir,
  SortPageContext,
} from '../common';
import { shouldSplitSort } from './split_sort';

const GROUP_KEY = `COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`;

// ── sort queries ──────────────────────────────────────────────────────────────

/**
 * Counts entities per resolution group, keyed by the target's `entity.id`.
 * The search expression filters the members. A group matches when any member matches,
 * even when the target does not. The inner FROM is the entity index, so KQL is valid.
 */
const buildGroupSizeBaseQuery = (
  { namespace, searchExpression }: QueryArgs,
  countColumn: string
): string =>
  [
    `FROM ${entityAliasOf(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildFilterClause(searchExpression),
    `| EVAL group_key = ${GROUP_KEY}`,
    `| STATS ${countColumn} = COUNT(*) BY group_key`,
    `| RENAME group_key AS \`entity.id\``,
  ].join('\n');

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
    `FROM ${entityAliasOf(args.namespace)}`,
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
      `FROM ${entityAliasOf(args.namespace)}`,
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
      `FROM ${entityAliasOf(args.namespace)}`,
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
 * A search applies to every member, so the size counts matching members and a target that does
 * not match still heads a group. A search cannot run after a join, so it keeps the join-first query.
 */
const buildSearchGroupSizeSortQuery = (args: QueryArgs): string =>
  [
    `FROM (\n${buildGroupSizeBaseQuery(args, GROUP_SIZE_FIELD)}\n)`,
    buildLookupJoinClause(args.concreteEntityIndexName),
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildFilterClause(args.entityExpression),
    buildKeepClause(args, GROUP_SIZE_FIELD),
    ...buildCursorClause(args.cursor),
    buildSortSuffix(GROUP_SIZE_FIELD, args.sort.direction, args.pageSize),
  ].join('\n');

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
    `FROM ${entityAliasOf(args.namespace)}`,
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
 * Entities in view that are not aliases, as groups of one, after `afterId` by entity.id. A top
 * level query, so Lucene sorts and limits it; inside a FROM subquery it reads every entity.id.
 * Some of them head a group with aliases, so callers ask for that many extra rows.
 */
const buildSingleEntitiesQuery = (args: QueryArgs, afterId: string | null, limit: number) =>
  [
    `FROM ${entityAliasOf(args.namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NULL`,
    ...buildFilterClause(args.entityExpression),
    ...(afterId != null ? [`| WHERE ${ENTITY_ID_FIELD} > ${esc(afterId)}`] : []),
    `| SORT ${ENTITY_ID_FIELD} ASC`,
    `| LIMIT ${limit}`,
    `| EVAL ${GROUP_SIZE_FIELD} = TO_LONG(1)`,
    buildKeepClause(args, GROUP_SIZE_FIELD),
  ].join('\n');

const groupSizeOf = (row: Row): number => getNumber(row, GROUP_SIZE_FIELD) ?? 1;

/** `SORT group_size <dir>, entity.id ASC` order. */
const compareGroups =
  (direction: SortDir) =>
  (a: Row, b: Row): number => {
    const bySize = groupSizeOf(a) - groupSizeOf(b);
    if (bySize !== 0) return direction === 'desc' ? -bySize : bySize;
    return (getEntityId(a) ?? '') < (getEntityId(b) ?? '') ? -1 : 1;
  };

const isAfterCursor =
  (cursor: PageCursor | null) =>
  (row: Row): boolean => {
    if (cursor == null || typeof cursor.sortValue !== 'number') return true;
    const size = groupSizeOf(row);
    if (size === cursor.sortValue) return (getEntityId(row) ?? '') > cursor.entityId;
    return cursor.sortDirection === 'desc' ? size < cursor.sortValue : size > cursor.sortValue;
  };

/**
 * One page of rows plus one for views of SPLIT_SORT_MIN_VIEW_SIZE entities or more, without a
 * search: the groups with aliases and a page of single entities, merged here. Grouping every
 * entity in one query took about 20s for 10M entities on ECH; this takes 2–5s. Smaller views
 * and searches keep the single query.
 */
const runGroupSizeSortPage = async (
  args: QueryArgs,
  { runQuery, viewSize }: SortPageContext
): Promise<Row[]> => {
  if (!shouldSplitSort(args, viewSize)) return runQuery(buildGroupSizeSortQuery(args));

  const groups = await runQuery(buildAliasGroupsQuery(args));
  if (groups.length > MAX_ALIAS_GROUPS) return runQuery(buildGroupSizeSortQuery(args));
  const groupIds = new Set(entityIdsOf(groups));

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
    ? (await runQuery(buildSingleEntitiesQuery(args, afterId, limit + groupIds.size)))
        // A target with aliases is in `groups` with its full size.
        .filter((row) => !groupIds.has(getEntityId(row) ?? ''))
    : [];

  const page = [...groups, ...singles]
    .sort(compareGroups(args.sort.direction))
    .filter(isAfterCursor(cursor))
    .slice(0, limit);

  // Entity fields of the page's groups with aliases.
  const pageGroupIds = entityIdsOf(page).filter((id) => groupIds.has(id));
  if (!pageGroupIds.length) return page;
  const docs = await runQuery(
    [
      `FROM ${entityAliasOf(args.namespace)}`,
      `| WHERE ${ENTITY_ID_FIELD} IN (${toList(pageGroupIds)})`,
      buildKeepClause(args),
    ].join('\n')
  );
  const docsById = new Map(docs.map((doc) => [getEntityId(doc), doc]));
  return page.map((row) => {
    const id = getEntityId(row);
    return id != null && groupIds.has(id) ? { ...docsById.get(id), ...row } : row;
  });
};

/**
 * Without a search, there is one group per target or standalone entity, and entity filters
 * apply to it: no aggregation or join needed.
 */
const buildGroupSizeCountQuery = (args: QueryArgs): string =>
  args.searchExpression
    ? [
        `FROM (\n${buildGroupSizeBaseQuery(args, '_c')}\n)`,
        buildLookupJoinClause(args.concreteEntityIndexName),
        `| WHERE ${ENTITY_TYPE_FILTER}`,
        ...buildFilterClause(args.entityExpression),
        `| STATS total = COUNT(*)`,
      ].join('\n')
    : [
        `FROM ${entityAliasOf(args.namespace)}`,
        `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NULL`,
        ...buildFilterClause(args.entityExpression),
        `| STATS total = COUNT(*)`,
      ].join('\n');

// ── enrichment ────────────────────────────────────────────────────────────────

const buildGroupSizeEnrichQuery = (
  { namespace }: QueryArgs,
  groupKeys: readonly string[]
): string => {
  const keys = toList(groupKeys);
  return [
    `FROM ${entityAliasOf(namespace)}`,
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
  read: async (pageRows, args, { runQuery }) => {
    const entityIds = [...new Set(entityIdsOf(pageRows))];
    if (!entityIds.length) return new Map();

    const rows = await nullOnFailure(runQuery(buildGroupSizeEnrichQuery(args, entityIds)));
    if (!rows) return null;

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
    buildCountQuery: buildGroupSizeCountQuery,
    runSortPage: runGroupSizeSortPage,
  },
  enricher: groupSizeEnricher,
} satisfies ColumnQuerySpec;
