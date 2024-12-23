/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type { KibanaRequest } from '@kbn/core/server';
import { searchExcludedDataTiers } from '@kbn/observability-plugin/common/ui_settings_keys';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import { excludeTiersQuery } from '@kbn/observability-utils-common/es/queries/exclude_tiers_query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { InfraPluginRequestHandlerContext } from '../../types';
import type { InfraBackendLibs } from '../infra_types';

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
      searchParams: TParams
    ): Promise<InferSearchResponseOf<TDocument, TParams>> {
      const searchFilter = searchParams.body.query?.bool?.must_not ?? [];

      // This flattens arrays by one level, and non-array values can be added as well, so it all
      // results in a nice [QueryDsl, QueryDsl, ...] array.
      const mustNot = ([] as QueryDslQueryContainer[]).concat(searchFilter, excludedQuery);

      return framework.callWithRequest(
        context,
        'search',
        {
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
        },
        request
      ) as Promise<any>;
    },
  };
}
