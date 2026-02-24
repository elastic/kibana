/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SearchRequest as ESSearchRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { InferSearchResponseOf } from '@kbn/es-types';
import type { KibanaRequest } from '@kbn/core/server';
import { RequestStatus } from '@kbn/inspector-plugin/common';
import { searchExcludedDataTiers } from '@kbn/observability-plugin/common/ui_settings_keys';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import { getInspectResponse } from '@kbn/observability-shared-plugin/common';
import { excludeTiersQuery } from '@kbn/observability-utils-common/es/queries/exclude_tiers_query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { InfraPluginRequestHandlerContext } from '../../types';
import type { InfraBackendLibs } from '../infra_types';
import { inspectableEsQueriesMap } from './with_inspect';

type RequiredParams = Omit<ESSearchRequest, 'index'> & {
  body: {
    size: number;
    track_total_hits: boolean | number;
  };
};

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

  const excludedQuery = excludedDataTiers.length
    ? excludeTiersQuery(excludedDataTiers)[0].bool!.must_not!
    : [];

  return {
    search<TDocument, TParams extends RequiredParams>(
      searchParams: TParams,
      operationName?: string
    ): Promise<InferSearchResponseOf<TDocument, TParams>> {
      const startTime = Date.now();
      const collector = request ? inspectableEsQueriesMap.get(request) : undefined;
      const searchFilter = searchParams.body.query?.bool?.must_not ?? [];

      // This flattens arrays by one level, and non-array values can be added as well, so it all
      // results in a nice [QueryDsl, QueryDsl, ...] array.
      const mustNot = ([] as QueryDslQueryContainer[]).concat(searchFilter, excludedQuery);

      const finalParams = {
        ...searchParams,
        ignore_unavailable: true,
        index: metricsIndices,
        body: {
          ...searchParams.body,
          query: {
            ...searchParams.body.query,
            bool: {
              ...searchParams.body.query?.bool,
              must_not: mustNot,
            },
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
  };
}
