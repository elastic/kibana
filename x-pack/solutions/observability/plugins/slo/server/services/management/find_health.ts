/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { FindSLOHealthParams, FindSLOHealthResponse } from '@kbn/slo-schema';
import { HEALTH_INDEX_PATTERN } from '../../../common/constants';
import { SLOHealth } from '../../domain/models';

export class FindSLOHealth {
  constructor(
    private esClient: ElasticsearchClient,
    private logger: Logger,
    private spaceId: string
  ) {}

  public async execute(params: FindSLOHealthParams): Promise<FindSLOHealthResponse> {
    const parsedFilters = parseFilters(params.filters);
    const result = await this.esClient.search<SLOHealth>({
      index: HEALTH_INDEX_PATTERN,
      track_total_hits: true,
      query: {
        bool: {
          filter: [
            { term: { spaceId: this.spaceId } },
            getElasticsearchQueryOrThrow(params.query),
            ...(parsedFilters.filter ?? []),
          ],
          must_not: parsedFilters.must_not ?? [],
        },
      },
      sort: [
        {
          [toSortField(params.sortBy)]: {
            order: params.sortDirection ?? 'desc',
          },
          id: {
            order: 'desc',
          },
        },
      ],
      ...toPaginationQuery(params),
    });

    const results = result.hits.hits.map((doc) => doc._source).filter(Boolean) as SLOHealth[];

    return {
      // @ts-ignore
      total: result.hits.total.value,
      size: result.hits.hits.length,
      searchAfter:
        !params.page && result.hits.hits.length > 0
          ? JSON.stringify(result.hits.hits[result.hits.hits.length - 1].sort)
          : undefined,
      page: params.page ? toPage(params.page) : undefined,
      results,
    };
  }
}

export function parseFilters(filters?: string) {
  if (!filters) {
    return {};
  }
  try {
    return JSON.parse(filters);
  } catch (e) {
    return {};
  }
}

function toSortField(sort?: FindSLOHealthParams['sortBy']) {
  switch (sort) {
    case 'status':
    default:
      return 'status';
  }
}

function toSize(size?: string): number {
  const parsedSize = Number(size);
  if (isNaN(parsedSize)) {
    return 25;
  }

  return parsedSize < 0 ? 0 : parsedSize > 100 ? 100 : parsedSize;
}

function toPage(page?: string): number {
  const parsedPage = Number(page);
  if (isNaN(parsedPage)) {
    return 1;
  }

  return parsedPage < 1 ? 1 : parsedPage;
}

function toSearchAfter(searchAfter?: string): any | undefined {
  if (!searchAfter) {
    return undefined;
  }

  try {
    return JSON.parse(searchAfter);
  } catch (err) {
    return undefined;
  }
}

function getElasticsearchQueryOrThrow(query: string = '') {
  try {
    return toElasticsearchQuery(fromKueryExpression(query));
  } catch (err) {
    throw new Error(`Invalid KQL: ${query}`);
  }
}

function toPaginationQuery(
  params: FindSLOHealthParams
): { size: number; search_after?: Array<string | number> } | { size: number; from: number } {
  const size = toSize(params.size);
  if (params.searchAfter) {
    return {
      size,
      search_after: toSearchAfter(params.searchAfter),
    };
  }

  const page = toPage(params.page);
  return {
    size,
    from: (page - 1) * size,
  };
}
