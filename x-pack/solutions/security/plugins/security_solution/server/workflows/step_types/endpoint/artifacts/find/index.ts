/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeQuotes } from '@kbn/es-query';
import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  type ArtifactItem,
  type ArtifactSummary,
  type Entry,
  type Population,
  SUMMARY_DESCRIPTION_MAX_CHARS,
  SUMMARY_NAME_MAX_CHARS,
  SUMMARY_OS_TYPES_MAX,
  SUMMARY_POLICY_IDS_MAX,
  SUMMARY_TAGS_MAX,
  SUMMARY_TAG_MAX_CHARS,
  findEndpointArtifactsInputSchema,
  findEndpointArtifactsStepCommonDefinition,
  isArtifactIdentifierTag,
  toArtifactRef,
} from '../../../../../../common/workflows/step_types/endpoint/artifacts';
import { FETCH_CAP_DEFAULT } from '../../../../../../common/workflows/step_types/common/budget';
import {
  BY_POLICY_ARTIFACT_TAG_PREFIX,
  GLOBAL_ARTIFACT_TAG,
} from '../../../../../../common/endpoint/service/artifacts/constants';
import { toApiExecutionError } from '../../../../utils/to_api_execution_error';
import { isNotFound, isUnauthorized } from '../../common/read_error';

const PAGE_SIZE = 100;
const MAX_SUMMARY_ROWS = 5;
const MAX_ROW_CHARS = 80;

const stripSuffix = (field: string): string => field.replace(/\.(caseless|text)$/, '');

const formatSingleEntryRow = (entry: Exclude<Entry, { type: 'nested' }>): string => {
  const field = stripSuffix(entry.field);
  const { operator } = entry;

  if (entry.type === 'match_any') {
    const firstVal = entry.value[0] ?? '';
    const extraCount = entry.value.length > 1 ? ` (+${entry.value.length - 1})` : '';
    return `${field} ${operator} ${firstVal}${extraCount}`.trim();
  }

  if (entry.type === 'exists') {
    return `${field} ${operator}`.trim();
  }

  if (entry.type === 'list') {
    return `${field} ${operator} ${entry.list.id}`.trim();
  }

  return `${field} ${operator} ${entry.value}`.trim();
};

export const formatEntriesSummaryRow = (entry: Entry): string => {
  if (entry.type === 'nested') {
    const parent = stripSuffix(entry.field);
    const subRows = entry.entries.map((sub) => `${parent}: ${formatSingleEntryRow(sub)}`);
    const joined = subRows.join(' and ');
    return joined.length > MAX_ROW_CHARS ? joined.slice(0, MAX_ROW_CHARS) : joined;
  }

  const row = formatSingleEntryRow(entry);
  return row.length > MAX_ROW_CHARS ? row.slice(0, MAX_ROW_CHARS) : row;
};

export const formatEntriesSummary = (entries?: ArtifactItem['entries'] | null): string[] => {
  if (!entries || entries.length === 0) {
    return [];
  }

  const headEntries = entries.slice(0, MAX_SUMMARY_ROWS);
  const rows = headEntries.map(formatEntriesSummaryRow);

  if (entries.length > MAX_SUMMARY_ROWS) {
    rows.push(`+${entries.length - MAX_SUMMARY_ROWS} more`);
  }

  return rows;
};

export const buildFindFilter = (params: {
  os?: string;
  policyId?: string;
  itemIds?: readonly string[];
}): string | undefined => {
  const filters: string[] = [];

  if (params.os) {
    filters.push(`exception-list-agnostic.attributes.os_types:"${escapeQuotes(params.os)}"`);
  }

  if (params.policyId) {
    const escaped = escapeQuotes(params.policyId);
    filters.push(
      `(exception-list-agnostic.attributes.tags:"${GLOBAL_ARTIFACT_TAG}" OR exception-list-agnostic.attributes.tags:"${BY_POLICY_ARTIFACT_TAG_PREFIX}${escaped}")`
    );
  }

  if (params.itemIds && params.itemIds.length > 0) {
    filters.push(
      `exception-list-agnostic.attributes.item_id:(${params.itemIds
        .map((id) => `"${escapeQuotes(id)}"`)
        .join(' OR ')})`
    );
  }

  return filters.length > 0 ? filters.join(' AND ') : undefined;
};

const buildArtifactSummary = (item: ArtifactItem): ArtifactSummary => {
  const ref = toArtifactRef(item);
  let tagsTruncated = false;
  const tags = ref.tags.slice(0, SUMMARY_TAGS_MAX).map((tag) => {
    if (isArtifactIdentifierTag(tag)) {
      return tag;
    }
    tagsTruncated = tagsTruncated || tag.length > SUMMARY_TAG_MAX_CHARS;
    return tag.slice(0, SUMMARY_TAG_MAX_CHARS);
  });

  const policyIds = ref.policy_scope.policy_ids;
  const policyScope: ArtifactSummary['policy_scope'] = {
    kind: ref.policy_scope.kind,
    policy_ids: policyIds.slice(0, SUMMARY_POLICY_IDS_MAX),
    ...(ref.policy_scope.owner_space_id !== undefined
      ? { owner_space_id: ref.policy_scope.owner_space_id }
      : {}),
    ...(policyIds.length > SUMMARY_POLICY_IDS_MAX ? { policy_ids_total: policyIds.length } : {}),
  };

  return {
    ...ref,
    name: ref.name.slice(0, SUMMARY_NAME_MAX_CHARS),
    ...(ref.name.length > SUMMARY_NAME_MAX_CHARS ? { name_truncated: true as const } : {}),
    os_types: Array.from(new Set(item.os_types ?? [])).slice(0, SUMMARY_OS_TYPES_MAX),
    tags,
    ...(ref.tags.length > SUMMARY_TAGS_MAX ? { tags_total: ref.tags.length } : {}),
    ...(tagsTruncated ? { tags_truncated: true as const } : {}),
    policy_scope: policyScope,
    description: item.description.slice(0, SUMMARY_DESCRIPTION_MAX_CHARS),
    ...(item.description.length > SUMMARY_DESCRIPTION_MAX_CHARS
      ? { description_truncated: true as const }
      : {}),
    entries_summary: formatEntriesSummary(item.entries),
    created_at: item.created_at,
  };
};

interface FindApiResponse {
  data: ArtifactItem[];
  page: number;
  per_page: number;
  total: number;
}

export const findEndpointArtifactsStepDefinition = createServerStepDefinition({
  ...findEndpointArtifactsStepCommonDefinition,
  handler: async (context) => {
    const parsed = findEndpointArtifactsInputSchema.safeParse(context.input);
    if (!parsed.success) {
      throw new ExecutionError({ type: 'ValidationError', message: parsed.error.message });
    }
    const {
      list_id,
      item_ids,
      policy_id,
      os,
      search,
      fetch_cap = FETCH_CAP_DEFAULT,
      sort_field,
      sort_order,
      sort,
      offset = 0,
      limit,
    } = parsed.data;

    const filter = buildFindFilter({
      os,
      policyId: policy_id,
      itemIds: item_ids,
    });

    const fetchedItems: ArtifactItem[] = [];
    const seenItemIds = new Set<string>();
    let page = 1;
    let routeTotal = 0;

    try {
      while (fetchedItems.length < fetch_cap) {
        const queryParams = new URLSearchParams({
          namespace_type: 'agnostic',
          list_id,
          page: String(page),
          per_page: String(PAGE_SIZE),
        });

        if (filter !== undefined) {
          queryParams.set('filter', filter);
        }
        if (search !== undefined && search.length > 0) {
          queryParams.set('search', search);
        }
        if (sort_field !== undefined && sort_field.length > 0) {
          queryParams.set('sort_field', sort_field);
        }
        if (sort_order !== undefined) {
          queryParams.set('sort_order', sort_order);
        }

        const { body } = await context.contextManager.callKibanaApi<FindApiResponse>({
          method: 'GET',
          path: `/api/exception_lists/items/_find?${queryParams.toString()}`,
        });

        if (page === 1) {
          routeTotal = body.total ?? 0;
        }

        const pageData = body.data ?? [];
        if (pageData.length === 0) {
          break;
        }

        for (const item of pageData) {
          if (!seenItemIds.has(item.item_id)) {
            seenItemIds.add(item.item_id);
            fetchedItems.push(item);
            if (fetchedItems.length >= fetch_cap) {
              break;
            }
          }
        }

        if (page * PAGE_SIZE >= (body.total ?? 0) || page * PAGE_SIZE >= fetch_cap) {
          break;
        }

        page++;
      }
    } catch (error) {
      if (isUnauthorized(error) || isNotFound(error)) {
        const unauthorized = isUnauthorized(error);
        const emptyPopulation: Population = {
          total: 0,
          fetched: 0,
          truncated: false,
          fetch_unstable: false,
          unauthorized,
        };
        return {
          output: {
            items: [],
            summaries: [],
            population: emptyPopulation,
            next_offset: null,
            unauthorized,
          },
        };
      }
      throw toApiExecutionError(error, 'find endpoint artifacts');
    }

    const total = routeTotal;
    const fetched = fetchedItems.length;
    const truncated = total > fetch_cap;
    const fetchUnstable = fetched < Math.min(total, fetch_cap);
    const population: Population = {
      total,
      fetched,
      truncated,
      fetch_unstable: fetchUnstable,
      unauthorized: false,
    };

    if (sort === 'updated_at_item_id') {
      fetchedItems.sort((a, b) => {
        const timeCompare = a.updated_at.localeCompare(b.updated_at);
        if (timeCompare !== 0) {
          return timeCompare;
        }
        return a.item_id.localeCompare(b.item_id);
      });
    }

    const slicedItems = fetchedItems.slice(offset, offset + limit);

    const hasMore = offset + limit < fetchedItems.length;
    const nextOffset = hasMore ? offset + limit : null;

    const summaries: ArtifactSummary[] = slicedItems.map(buildArtifactSummary);

    return {
      output: {
        items: slicedItems,
        summaries,
        population,
        next_offset: nextOffset,
        unauthorized: false,
      },
    };
  },
});
