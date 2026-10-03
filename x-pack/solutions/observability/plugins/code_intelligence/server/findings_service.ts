/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { CatalogSignalType } from '../common/catalog_filters';
import { FINDING_TYPES, type FindingStatus } from '../common/finding_filters';

/** A finding document as stored, with its `_id` as `id`. */
export type FindingEntry = { readonly id: string } & Readonly<Record<string, unknown>>;

export interface FindingsSearchParams {
  readonly repositories: readonly string[];
  readonly statuses: readonly FindingStatus[];
  readonly signalTypes: readonly CatalogSignalType[];
  /** Free text matched against the title, summary, and evidence paths. */
  readonly q?: string;
  readonly page: number;
  readonly perPage: number;
}

export interface FindingsSearchResult {
  readonly page: number;
  readonly perPage: number;
  readonly total: number;
  readonly items: readonly FindingEntry[];
}

/**
 * Filters and pages the findings, newest first; any selected value of a filter matches.
 * Only the finding types the classifiers may file today are returned, so documents left
 * behind by a retired type stay hidden until the next extraction prunes them.
 */
export const searchFindings = async (
  client: ElasticsearchClient,
  index: string,
  { repositories, statuses, signalTypes, q, page, perPage }: FindingsSearchParams
): Promise<FindingsSearchResult> => {
  const filters: object[] = [{ terms: { finding_type: [...FINDING_TYPES] } }];
  if (repositories.length > 0) filters.push({ terms: { repository: repositories } });
  if (statuses.length > 0) filters.push({ terms: { status: statuses } });
  if (signalTypes.length > 0) filters.push({ terms: { signal_type: signalTypes } });
  const textQuery =
    q === undefined
      ? {}
      : {
          should: [
            { multi_match: { query: q, fields: ['title^2', 'summary'] } },
            { match_phrase_prefix: { 'evidence.path': q } },
          ],
          minimum_should_match: 1,
        };
  const result = await client.search<Record<string, unknown>>({
    index,
    // The findings index does not exist until the first extraction files a finding.
    ignore_unavailable: true,
    from: (page - 1) * perPage,
    size: perPage,
    query: { bool: { filter: filters, ...textQuery } },
    sort: [...(q === undefined ? [] : ['_score' as const]), { updated_at: 'desc' }, '_doc'],
  });
  return {
    page,
    perPage,
    total:
      typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0,
    items: result.hits.hits.map((hit) => ({ id: hit._id ?? '', ...hit._source })),
  };
};

/** Reads 1 finding; `undefined` when it does not exist. */
export const getFinding = async (
  client: ElasticsearchClient,
  index: string,
  id: string
): Promise<FindingEntry | undefined> => {
  const result = await client.get<Record<string, unknown>>({ index, id }, { ignore: [404] });
  return result.found ? { id: result._id, ...result._source } : undefined;
};

export interface FindingStatusUpdate {
  readonly id: string;
  readonly status: FindingStatus;
  /** Why the reviewer or the AI Agent chose this status. */
  readonly note?: string;
  readonly reviewedAt?: string;
}

/**
 * Sets the review state of 1 finding. Extraction never rewrites `status`, `review_note`, or
 * `reviewed_at`, so the verdict survives the next run. Returns the updated finding, or
 * `undefined` when it does not exist.
 */
export const updateFindingStatus = async (
  client: ElasticsearchClient,
  index: string,
  { id, status, note, reviewedAt = new Date().toISOString() }: FindingStatusUpdate
): Promise<FindingEntry | undefined> => {
  const result = await client.update<Record<string, unknown>, Record<string, unknown>>(
    {
      index,
      id,
      doc: { status, review_note: note ?? null, reviewed_at: reviewedAt },
      _source: true,
      refresh: 'wait_for',
    },
    { ignore: [404] }
  );
  // A missing document answers 404 with no `get`; an update or no-op returns the source.
  const source = result.get?._source;
  if (source === undefined) return undefined;
  return { id, ...source };
};
