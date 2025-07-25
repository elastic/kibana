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
import { searchExcludedDataTiers } from '@kbn/observability-plugin/common/ui_settings_keys';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import { excludeTiersQuery } from '@kbn/observability-utils-common/es/queries/exclude_tiers_query';
import type { InfraPluginRequestHandlerContext } from '../../types';
import type { InfraBackendLibs } from '../infra_types';

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
      searchParams: TParams
    ): Promise<InferSearchResponseOf<TDocument, TParams>> {
      return framework.callWithRequest(
        context,
        'search',
        {
          ...searchParams,
          ignore_unavailable: true,
          index: metricsIndices,
          query: {
            bool: {
              filter: excludedQuery,
              must: [searchParams.query],
            },
          },
        },
        request
      ) as Promise<any>;
    },
    msearch<TDocument, TParams extends MSearchParams>(
      searchParams: TParams[]
    ): Promise<TypedMSearchResponse<TDocument, TParams>> {
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
      return framework.callWithRequest(context, 'msearch', { searches }, request) as Promise<any>;
    },
  };
}
