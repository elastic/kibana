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
  EsqlQueryRequest,
  EsqlQueryResponse,
  QueryDslQueryContainer,
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
      // P5 — only wrap the caller's query in an extra `bool` when there is
      // an excluded-tier filter to apply; otherwise pass the query straight
      // through. Saves a redundant Lucene rewrite layer on every infra search.
      const wrappedQuery = excludedQuery
        ? {
            bool: {
              filter: excludedQuery,
              must: [searchParams.query],
            },
          }
        : searchParams.query;
      const finalParams = {
        ...searchParams,
        ignore_unavailable: true,
        index: metricsIndices,
        query: wrappedQuery,
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
    // P10 — ES|QL execution path for the two-phase host endpoints. Bypasses
    // `framework.callWithRequest` (which only types `search` / `msearch`) and
    // calls `asCurrentUser.esql.query` directly so we can pass the official
    // `EsqlQueryRequest` shape end-to-end. Excluded-tier filtering composes
    // via the request's `filter` field; the caller may pass an extra `filter`
    // (typically the unified-search KQL converted via `buildEsQuery`) and the
    // two are merged with a top-level `bool { filter: [...] }`.
    async esql<TRow extends Record<string, unknown> = Record<string, unknown>>(
      params: {
        query: string;
        filter?: QueryDslQueryContainer;
        esqlParams?: EsqlQueryRequest['params'];
      },
      operationName?: string
    ): Promise<{ columns: EsqlQueryResponse['columns']; values: unknown[][]; rows: TRow[] }> {
      const startTime = Date.now();
      const collector = request ? inspectableEsQueriesMap.get(request) : undefined;
      const { elasticsearch } = await context.core;

      const mergedFilter: QueryDslQueryContainer | undefined =
        params.filter && excludedQuery
          ? { bool: { filter: [params.filter, ...excludedQuery] } }
          : params.filter ?? (excludedQuery ? { bool: { filter: excludedQuery } } : undefined);

      const esqlRequest: EsqlQueryRequest = {
        query: params.query,
        drop_null_columns: false,
        ...(mergedFilter ? { filter: mergedFilter } : {}),
        ...(params.esqlParams ? { params: params.esqlParams } : {}),
      };

      try {
        const response = (await elasticsearch.client.asCurrentUser.esql.query(
          esqlRequest
        )) as unknown as EsqlQueryResponse;

        const columns = response.columns ?? [];
        const values = response.values ?? [];
        const rows = values.map((row) => {
          const obj: Record<string, unknown> = {};
          for (let i = 0; i < columns.length; i++) {
            obj[columns[i].name] = row[i];
          }
          return obj as TRow;
        });

        if (collector && request) {
          collector.push(
            getInspectResponse({
              esError: null,
              // `getInspectResponse` is DSL-shaped; surfacing the ES|QL query
              // text + filter as `esRequestParams` is good enough for the
              // `_inspect` UI today (Kibana renders it as a JSON blob).
              esRequestParams: esqlRequest as unknown as Record<string, unknown>,
              esRequestStatus: RequestStatus.OK,
              esResponse: response as unknown as Record<string, unknown>,
              kibanaRequest: request,
              operationName: operationName ?? 'infra metrics esql',
              startTime,
            })
          );
        }

        return { columns, values, rows };
      } catch (error) {
        if (collector && request) {
          collector.push(
            getInspectResponse({
              esError: error,
              esRequestParams: esqlRequest as unknown as Record<string, unknown>,
              esRequestStatus: RequestStatus.ERROR,
              esResponse: null,
              kibanaRequest: request,
              operationName: operationName ?? 'infra metrics esql',
              startTime,
            })
          );
        }
        throw error;
      }
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
