/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';
import { ENTITY_CASE_COUNTS_INTERNAL_URL } from '../../../../../../common/entity_analytics/entity_analytics/constants';
import { getEntityIds } from '../common';
import type { QueryArgs, Row } from '../common';
import { fetchGroupMembers } from './group_members';
import type { ColumnQuerySpec, PageEnricher, RunContext } from './types';

const CASE_COUNT_FIELD = 'case_count';

/** Case counts per entity id; `null` when the user can't read Security cases. */
const fetchCaseCounts = async (
  { http, signal }: RunContext,
  entityIds: readonly string[],
  memberIds: Readonly<Record<string, readonly string[]>>
): Promise<Map<string, number> | null> => {
  if (entityIds.length === 0) return new Map();
  try {
    const result = await http.post<Record<string, number>>(ENTITY_CASE_COUNTS_INTERNAL_URL, {
      body: JSON.stringify({
        entity_ids: entityIds,
        ...(Object.keys(memberIds).length ? { member_ids: memberIds } : {}),
      }),
      version: '1',
      signal,
    });
    return new Map(Object.entries(result));
  } catch (error) {
    if (isHttpFetchError(error) && error.response?.status === 403) return null;
    throw error;
  }
};

/** The ids of the members of each group on a page of resolved rows; none for individual rows. */
const fetchMemberIds = async (
  pageRows: readonly Row[],
  args: QueryArgs,
  { runQuery }: RunContext
): Promise<Record<string, string[]>> => {
  if (args.rowsMode !== 'resolved') return {};
  const members = await fetchGroupMembers(args, runQuery, getEntityIds(pageRows));
  return Object.fromEntries([...members].map(([headId, rows]) => [headId, getEntityIds(rows)]));
};

/** A group's cases are the distinct cases of its members, which only the server can tell apart. */
const caseCountEnricher: PageEnricher = {
  fields: [CASE_COUNT_FIELD],
  fetch: async (pageRows, args, ctx) => {
    const entityIds = getEntityIds(pageRows);
    const counts = await fetchCaseCounts(ctx, entityIds, await fetchMemberIds(pageRows, args, ctx));
    // Without access, the counts stay unset: unknown, not zero, and not an error.
    if (counts == null) return new Map();
    return new Map(entityIds.map((id) => [id, { [CASE_COUNT_FIELD]: counts.get(id) ?? 0 }]));
  },
};

// ── query spec ────────────────────────────────────────────────────────────────

export const caseCountQuerySpec = { enricher: caseCountEnricher } satisfies ColumnQuerySpec;
