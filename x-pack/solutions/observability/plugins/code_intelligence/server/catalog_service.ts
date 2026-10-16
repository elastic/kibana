/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from '@kbn/core/server';

import {
  CATALOG_SEVERITIES,
  CATALOG_SEVERITY_RANGES,
  MAX_CATALOG_SUMMARY_REPOSITORIES,
  type CatalogRepositorySummary,
  type CatalogSeverity,
  type CatalogSignalType,
  type CatalogSort,
} from '../common/catalog_filters';

/** A catalog document as stored, with its `_id` as `id`. */
export type CatalogEntry = { readonly id: string } & Readonly<Record<string, unknown>>;

export interface CatalogSearchParams {
  readonly repositories: readonly string[];
  readonly signalTypes: readonly CatalogSignalType[];
  readonly severities: readonly CatalogSeverity[];
  readonly q?: string;
  readonly sort?: CatalogSort;
  readonly page: number;
  readonly perPage: number;
}

export interface CatalogSearchResult {
  readonly page: number;
  readonly perPage: number;
  readonly total: number;
  readonly items: readonly CatalogEntry[];
}

const catalogSortClauses = (sort: CatalogSort, searching: boolean): estypes.SortCombinations[] => {
  const relevance: estypes.SortCombinations[] = searching ? ['_score'] : [];
  if (sort === 'default') return [...relevance, { updated_at: 'desc' }, '_doc'];
  return [
    {
      severity_score: { order: sort === 'severity_desc' ? 'desc' : 'asc', missing: '_last' },
    },
    ...relevance,
    { updated_at: 'desc' },
    '_doc',
  ];
};

/** Filters, sorts, and pages the catalog; any selected value of a filter matches. */
export const searchCatalog = async (
  client: ElasticsearchClient,
  index: string,
  { repositories, signalTypes, severities, q, sort, page, perPage }: CatalogSearchParams
): Promise<CatalogSearchResult> => {
  const filters: object[] = [];
  if (repositories.length > 0) filters.push({ terms: { repository: repositories } });
  if (signalTypes.length > 0) filters.push({ terms: { signal_type: signalTypes } });
  if (severities.length > 0) {
    filters.push({
      bool: {
        should: severities.map((level) => ({
          range: { severity_score: CATALOG_SEVERITY_RANGES[level] },
        })),
        minimum_should_match: 1,
      },
    });
  }
  // `title` and `description` are `semantic_text`, which rejects `match`/`multi_match`.
  const textQuery =
    q === undefined
      ? {}
      : {
          should: [
            { semantic: { field: 'title', query: q } },
            { semantic: { field: 'description', query: q } },
            { match: { query: q } },
          ],
          minimum_should_match: 1,
        };
  const result = await client.search<Record<string, unknown>>({
    index,
    from: (page - 1) * perPage,
    size: perPage,
    query: { bool: { filter: filters, ...textQuery } },
    sort: catalogSortClauses(sort ?? 'default', q !== undefined),
  });
  return {
    page,
    perPage,
    total:
      typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0,
    items: result.hits.hits.map((hit) => ({ id: hit._id ?? '', ...hit._source })),
  };
};

/** Counts catalog entries per repository and severity level. */
export const summarizeCatalog = async (
  client: ElasticsearchClient,
  index: string
): Promise<CatalogRepositorySummary[]> => {
  const result = await client.search({
    index,
    // The catalog index does not exist until the first extraction writes to it.
    ignore_unavailable: true,
    size: 0,
    aggs: {
      repositories: {
        terms: { field: 'repository', size: MAX_CATALOG_SUMMARY_REPOSITORIES },
        aggs: {
          severities: {
            filters: {
              filters: Object.fromEntries(
                CATALOG_SEVERITIES.map((level) => [
                  level,
                  { range: { severity_score: CATALOG_SEVERITY_RANGES[level] } },
                ])
              ),
            },
          },
        },
      },
    },
  });
  const buckets =
    (
      result.aggregations?.repositories as
        | {
            buckets?: Array<{
              key: string;
              doc_count: number;
              severities?: { buckets?: Partial<Record<string, { doc_count?: number }>> };
            }>;
          }
        | undefined
    )?.buckets ?? [];
  return buckets.map((bucket) => ({
    repository: bucket.key,
    total: bucket.doc_count,
    severities: {
      low: bucket.severities?.buckets?.low?.doc_count ?? 0,
      medium: bucket.severities?.buckets?.medium?.doc_count ?? 0,
      high: bucket.severities?.buckets?.high?.doc_count ?? 0,
      critical: bucket.severities?.buckets?.critical?.doc_count ?? 0,
    },
  }));
};

/** Reads 1 catalog document; `undefined` when it does not exist. */
export const getCatalogEntry = async (
  client: ElasticsearchClient,
  index: string,
  id: string
): Promise<CatalogEntry | undefined> => {
  const result = await client.get<Record<string, unknown>>({ index, id }, { ignore: [404] });
  return result.found ? { id: result._id, ...result._source } : undefined;
};
