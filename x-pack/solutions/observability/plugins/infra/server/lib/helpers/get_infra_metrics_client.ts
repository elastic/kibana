/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  SearchRequest as ESSearchRequest,
  MsearchMultisearchHeader,
  SearchSearchRequestBody,
} from '@elastic/elasticsearch/lib/api/types';
import type { InferSearchResponseOf } from '@kbn/es-types';
import type { KibanaRequest } from '@kbn/core/server';
import { RequestStatus } from '@kbn/inspector-plugin/common';
import { searchExcludedDataTiers } from '@kbn/observability-plugin/common/ui_settings_keys';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import { getInspectResponse } from '@kbn/observability-shared-plugin/common';
import { excludeTiersQuery } from '@kbn/observability-utils-common/es/queries/exclude_tiers_query';
import type { InfraPluginRequestHandlerContext } from '../../types';
import type { InfraBackendLibs } from '../infra_types';
import { inspectableEsQueriesMap } from './with_inspect';

type RequiredParams = Omit<ESSearchRequest, 'index'> & {
  size: number;
  track_total_hits: boolean | number;
};

export type MSearchParams = Omit<RequiredParams, 'allow_no_indices'>;
interface TypedMSearchResponse<TDocument, TParams extends RequiredParams> {
  responses: Array<InferSearchResponseOf<TDocument, TParams>>;
}

export type InfraMetricsClient = Awaited<ReturnType<typeof getInfraMetricsClient>>;

export async function getInfraMetricsClient({
  libs,
  context,
  request,
}: {
  libs: InfraBackendLibs;
  context: InfraPluginRequestHandlerContext;
  request?: KibanaRequest;
}) {
  const { framework } = libs;
  const infraContext = await context.infra;
  const { uiSettings } = await context.core;

  const excludedDataTiers = await uiSettings.client.get<DataTier[]>(searchExcludedDataTiers);
  const metricsIndices = await infraContext.getMetricsIndices();

  const excludedQuery = excludedDataTiers.length ? excludeTiersQuery(excludedDataTiers) : undefined;

  return {
    search<TDocument, TParams extends RequiredParams>(
      searchParams: TParams,
      operationName?: string
    ): Promise<InferSearchResponseOf<TDocument, TParams>> {
      const startTime = Date.now();
      const collector = request ? inspectableEsQueriesMap.get(request) : undefined;
      const finalParams = {
        ...searchParams,
        ignore_unavailable: true,
        index: metricsIndices,
        query: {
          bool: {
            filter: excludedQuery,
            must: [searchParams.query],
          },
        },
      };

      return (
        framework.callWithRequest(context, 'search', finalParams, request) as Promise<any>
      ).then(
        (response) => {
          if (collector && request) {
            collector.push(
              getInspectResponse({
                esError: null,
                esRequestParams: finalParams,
                esRequestStatus: RequestStatus.OK,
                esResponse: response,
                kibanaRequest: request,
                operationName: operationName ?? 'infra metrics search',
                startTime,
              })
            );
          }
          return response;
        },
        (error) => {
          if (collector && request) {
            collector.push(
              getInspectResponse({
                esError: error,
                esRequestParams: finalParams,
                esRequestStatus: RequestStatus.ERROR,
                esResponse: null,
                kibanaRequest: request,
                operationName: operationName ?? 'infra metrics search',
                startTime,
              })
            );
          }
          throw error;
        }
      );
    },
    msearch<TDocument, TParams extends MSearchParams>(
      searchParams: TParams[],
      operationName?: string
    ): Promise<TypedMSearchResponse<TDocument, TParams>> {
      const startTime = Date.now();
      const collector = request ? inspectableEsQueriesMap.get(request) : undefined;
      const searches = searchParams
        .map((params) => {
          const search: [MsearchMultisearchHeader, SearchSearchRequestBody] = [
            {
              index: metricsIndices,
              preference: 'any',
              ignore_unavailable: true,
              expand_wildcards: ['open', 'hidden'],
            },
            {
              ...params,
              query: {
                bool: {
                  filter: [params.query, ...(excludedQuery ? excludedQuery : [])].filter(Boolean),
                },
              },
            },
          ];
          return search;
        })
        .flat();

      const msearchParams = { searches };

      return (
        framework.callWithRequest(context, 'msearch', msearchParams, request) as Promise<any>
      ).then(
        (response) => {
          if (collector && request) {
            collector.push(
              getInspectResponse({
                esError: null,
                esRequestParams: msearchParams,
                esRequestStatus: RequestStatus.OK,
                esResponse: response,
                kibanaRequest: request,
                operationName: operationName ?? 'infra metrics msearch',
                startTime,
              })
            );
          }
          return response;
        },
        (error) => {
          if (collector && request) {
            collector.push(
              getInspectResponse({
                esError: error,
                esRequestParams: msearchParams,
                esRequestStatus: RequestStatus.ERROR,
                esResponse: null,
                kibanaRequest: request,
                operationName: operationName ?? 'infra metrics msearch',
                startTime,
              })
            );
          }
          throw error;
        }
      );
    },
  };
}
