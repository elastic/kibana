/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { searchExcludedDataTiers } from '@kbn/observability-plugin/common/ui_settings_keys';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import { excludeTiersQuery } from '@kbn/observability-utils-common/es/queries/exclude_tiers_query';
import type { InfraPluginRequestHandlerContext } from '../types';
import type { CallWithRequestParams, InfraDatabaseSearchResponse } from './adapters/framework';
import type { KibanaFramework } from './adapters/framework/kibana_framework_adapter';
export const createSearchClient =
  (
    requestContext: InfraPluginRequestHandlerContext,
    framework: KibanaFramework,
    request?: KibanaRequest
  ) =>
  async <Hit = {}, Aggregation = undefined>(
    opts: CallWithRequestParams
  ): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>> => {
    const { uiSettings } = await requestContext.core;

    const excludedDataTiers = await uiSettings.client.get<DataTier[]>(searchExcludedDataTiers);

    const excludedQuery = excludedDataTiers.length
      ? excludeTiersQuery(excludedDataTiers)
      : undefined;

    return framework.callWithRequest(
      requestContext,
      'search',
      {
        ...opts,
        body: {
          ...(opts.body ?? {}),
          query: {
            bool: {
              ...(opts.body?.query ? { must: [opts.body?.query] } : {}),
              filter: excludedQuery,
            },
          },
        },
      },
      request
    );
  };
