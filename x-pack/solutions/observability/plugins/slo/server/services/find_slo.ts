/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindSLOParams, FindSLOResponse } from '@kbn/slo-schema';
import { findSLOResponseSchema } from '@kbn/slo-schema';
import { keyBy } from 'lodash';
import type { SLODefinition } from '../domain/models';
import { IllegalArgumentError } from '../errors';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type {
  Pagination,
  Sort,
  SummaryResult,
  SummarySearchClient,
} from './summary_search_client/types';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;
const DEFAULT_SIZE = 100;
const MAX_PER_PAGE_OR_SIZE = 5000;

export class FindSLO {
  constructor(
    private repository: SLODefinitionRepository,
    private summarySearchClient: SummarySearchClient
  ) {}

  public async execute(params: FindSLOParams): Promise<FindSLOResponse> {
    const summaryResults = await this.summarySearchClient.search(
      params.kqlQuery ?? '',
      params.filters ?? '',
      toSort(params),
      toPagination(params),
      params.hideStale
    );

    const localSloDefinitions = await this.repository.findAllByIds(
      summaryResults.results
        .filter((summaryResult) => !summaryResult.remote)
        .map((summaryResult) => summaryResult.sloId)
    );

    return findSLOResponseSchema.encode({
      page: 'page' in summaryResults ? summaryResults.page : DEFAULT_PAGE,
      perPage: 'perPage' in summaryResults ? summaryResults.perPage : DEFAULT_PER_PAGE,
      size: 'size' in summaryResults ? summaryResults.size : undefined,
      searchAfter: 'searchAfter' in summaryResults ? summaryResults.searchAfter : undefined,
      total: summaryResults.total,
      results: mergeSloWithSummary(localSloDefinitions, summaryResults.results),
    });
  }
}

function mergeSloWithSummary(
  localSloDefinitions: SLODefinition[],
  summaryResults: SummaryResult[]
) {
  const localSloDefinitionsMap = keyBy(localSloDefinitions, (sloDefinition) => sloDefinition.id);

  const localSummaryList = summaryResults
    .filter((summaryResult) => !!localSloDefinitionsMap[summaryResult.sloId])
    .map((summaryResult) => ({
      ...localSloDefinitionsMap[summaryResult.sloId],
      instanceId: summaryResult.instanceId,
      summary: summaryResult.summary,
      groupings: summaryResult.groupings,
    }));

  const remoteSummaryList = summaryResults
    .filter((summaryResult) => !!summaryResult.remote)
    .map((summaryResult) => ({
      ...summaryResult.remote!.slo,
      instanceId: summaryResult.instanceId,
      summary: summaryResult.summary,
      groupings: summaryResult.groupings,
      remote: {
        remoteName: summaryResult.remote!.remoteName,
        kibanaUrl: summaryResult.remote!.kibanaUrl,
      },
    }));

  return [...localSummaryList, ...remoteSummaryList];
}

function toPagination(params: FindSLOParams): Pagination {
  const isCursorBased = !!params.searchAfter || !!params.size;

  if (isCursorBased) {
    const size = Number(params.size);
    if (!isNaN(size) && size > MAX_PER_PAGE_OR_SIZE) {
      throw new IllegalArgumentError('size limit set to 5000');
    }

    return {
      searchAfter: params.searchAfter,
      size: !isNaN(size) && size > 0 ? size : DEFAULT_SIZE,
    };
  }

  const page = Number(params.page);
  const perPage = Number(params.perPage);
  if (!isNaN(perPage) && perPage > MAX_PER_PAGE_OR_SIZE) {
    throw new IllegalArgumentError('perPage limit set to 5000');
  }

  return {
    page: !isNaN(page) && page >= 1 ? page : DEFAULT_PAGE,
    perPage: !isNaN(perPage) && perPage > 0 ? perPage : DEFAULT_PER_PAGE,
  };
}

function toSort(params: FindSLOParams): Sort {
  return {
    field: params.sortBy ?? 'status',
    direction: params.sortDirection ?? 'asc',
  };
}
