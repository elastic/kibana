/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { isCCSRemoteIndexName } from '@kbn/es-query';
import { ALL_VALUE } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import { partition } from 'lodash';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../common/constants';
import type { SLOSettings } from '../../domain/models';
import { toHighPrecision } from '../../utils/number';
import { createEsParams, typedSearch } from '../../utils/queries';
import type { EsSummaryDocument } from '../summary_transform_generator/helpers/create_temp_summary';
import { getElasticsearchQueryOrThrow, parseStringFilters } from '../transform_generators';
import { fromRemoteSummaryDocumentToSloDefinition } from '../unsafe_federated/remote_summary_doc_to_slo';
import { getFlattenedGroupings } from '../utils';
import { getSummaryIndices } from '../utils/get_summary_indices';
import { excludeStaleSummaryFilter } from '../utils/summary_stale_filter';
import type {
  Paginated,
  Pagination,
  Sort,
  SortField,
  SummaryResult,
  SummarySearchClient,
} from './types';
import { isCursorPagination } from './types';

export class DefaultSummarySearchClient implements SummarySearchClient {
  constructor(
    private scopedClusterClient: IScopedClusterClient,
    private logger: Logger,
    private spaceId: string,
    private settings: SLOSettings
  ) {}

  async search(
    kqlQuery: string,
    filters: string,
    sort: Sort,
    pagination: Pagination,
    hideStale: boolean = false
  ): Promise<Paginated<SummaryResult>> {
    const parsedFilters = parseStringFilters(filters, this.logger);

    const { indices } = await getSummaryIndices(
      this.scopedClusterClient.asInternalUser,
      this.settings
    );

    const esParams = createEsParams({
      index: indices,
      track_total_hits: true,
      query: {
        bool: {
          filter: [
            { term: { spaceId: this.spaceId } },
            ...excludeStaleSummaryFilter({
              settings: this.settings,
              kqlFilter: kqlQuery,
              forceExclude: hideStale,
            }),
            getElasticsearchQueryOrThrow(kqlQuery),
            ...(parsedFilters.filter ?? []),
          ],
          must_not: [...(parsedFilters.must_not ?? [])],
        },
      },
      sort: {
        // non-temp first, then temp documents
        isTempDoc: {
          order: 'asc',
        },
        [toDocumentSortField(sort.field)]: {
          order: sort.direction,
        },
        'slo.id': {
          order: 'asc',
        },
        'slo.instanceId': {
          order: 'asc',
        },
      },
      ...toPaginationQuery(pagination),
    });

    try {
      const summarySearch = await typedSearch<EsSummaryDocument, typeof esParams>(
        this.scopedClusterClient.asCurrentUser,
        esParams
      );

      const total = summarySearch.hits.total.value ?? 0;
      if (total === 0) {
        return { total: 0, ...pagination, results: [] };
      }

      const [tempSummaryDocuments, summaryDocuments] = partition(
        summarySearch.hits.hits,
        (doc) => !!doc._source?.isTempDoc
      );

      // TODO filter out remote summary documents from the deletion of outdated summaries
      const summarySloIds = summaryDocuments.map((doc) => doc._source.slo.id);
      await this.deleteOutdatedTemporarySummaries(summarySloIds);

      const tempSummaryDocumentsDeduped = tempSummaryDocuments.filter(
        (doc) => !summarySloIds.includes(doc._source.slo.id)
      );

      const finalResults = summaryDocuments
        .concat(tempSummaryDocumentsDeduped)
        .slice(0, isCursorPagination(pagination) ? pagination.size : pagination.perPage);

      const finalTotal = total - (tempSummaryDocuments.length - tempSummaryDocumentsDeduped.length);

      const paginationResults = isCursorPagination(pagination)
        ? {
            // `sort` has unknown as types
            searchAfter: finalResults[finalResults.length - 1].sort as Array<string | number>,
            size: pagination.size,
          }
        : pagination;

      return {
        ...paginationResults,
        total: finalTotal,
        results: finalResults.map((doc) => {
          const summaryDoc = doc._source;
          const remoteName = getRemoteClusterName(doc._index);
          const isRemote = !!remoteName;
          let remoteSloDefinition;
          if (isRemote) {
            remoteSloDefinition = fromRemoteSummaryDocumentToSloDefinition(summaryDoc, this.logger);
          }

          return {
            ...(isRemote &&
              !!remoteSloDefinition && {
                remote: {
                  kibanaUrl: summaryDoc.kibanaUrl ?? '',
                  remoteName,
                  slo: remoteSloDefinition,
                },
              }),
            sloId: summaryDoc.slo.id,
            instanceId: summaryDoc.slo.instanceId ?? ALL_VALUE,
            summary: {
              errorBudget: {
                initial: toHighPrecision(summaryDoc.errorBudgetInitial),
                consumed: toHighPrecision(summaryDoc.errorBudgetConsumed),
                remaining: toHighPrecision(summaryDoc.errorBudgetRemaining),
                isEstimated: summaryDoc.errorBudgetEstimated,
              },
              sliValue: toHighPrecision(doc._source.sliValue),
              status: summaryDoc.status,
              summaryUpdatedAt: summaryDoc.summaryUpdatedAt,
              fiveMinuteBurnRate: toHighPrecision(summaryDoc.fiveMinuteBurnRate?.value ?? 0),
              oneHourBurnRate: toHighPrecision(summaryDoc.oneHourBurnRate?.value ?? 0),
              oneDayBurnRate: toHighPrecision(summaryDoc.oneDayBurnRate?.value ?? 0),
            },
            groupings: getFlattenedGroupings({
              groupings: summaryDoc.slo.groupings,
              groupBy: summaryDoc.slo.groupBy,
            }),
          };
        }),
      };
    } catch (err) {
      this.logger.debug(`Error while searching SLO summary documents. ${err}`);
      return { total: 0, ...pagination, results: [] };
    }
  }

  private async deleteOutdatedTemporarySummaries(summarySloIds: string[]) {
    // Always attempt to delete temporary summary documents with an existing non-temp summary document
    // The temp summary documents are _eventually_ removed as we get through the real summary documents

    await this.scopedClusterClient.asCurrentUser.deleteByQuery({
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      wait_for_completion: false,
      conflicts: 'proceed',
      slices: 'auto',
      query: {
        bool: {
          filter: [{ terms: { 'slo.id': summarySloIds } }, { term: { isTempDoc: true } }],
        },
      },
    });
  }
}

function getRemoteClusterName(index: string) {
  if (isCCSRemoteIndexName(index)) {
    return index.substring(0, index.indexOf(':'));
  }
}

function toDocumentSortField(field: SortField) {
  switch (field) {
    case 'error_budget_consumed':
      return 'errorBudgetConsumed';
    case 'error_budget_remaining':
      return 'errorBudgetRemaining';
    case 'status':
      return 'status';
    case 'sli_value':
      return 'sliValue';
    case 'burn_rate_5m':
      return 'fiveMinuteBurnRate.value';
    case 'burn_rate_1h':
      return 'oneHourBurnRate.value';
    case 'burn_rate_1d':
      return 'oneDayBurnRate.value';
    default:
      assertNever(field);
  }
}

function toPaginationQuery(
  pagination: Pagination
): { size: number; search_after?: Array<string | number> } | { size: number; from: number } {
  if (isCursorPagination(pagination)) {
    return {
      size: pagination.size * 2, // Potential duplicates between temp and non-temp summaries
      search_after: pagination.searchAfter,
    };
  }

  return {
    size: pagination.perPage * 2, // Potential duplicates between temp and non-temp summaries
    from: (pagination.page - 1) * pagination.perPage,
  };
}
