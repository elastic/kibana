/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { RequestStatus } from '@kbn/inspector-plugin/common';
import { searchExcludedDataTiers } from '@kbn/observability-plugin/common/ui_settings_keys';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import { getInspectResponse } from '@kbn/observability-shared-plugin/common';
import { excludeTiersQuery } from '@kbn/observability-utils-common/es/queries/exclude_tiers_query';
import type { InfraPluginRequestHandlerContext } from '../types';
import type { CallWithRequestParams, InfraDatabaseSearchResponse } from './adapters/framework';
import type { KibanaFramework } from './adapters/framework/kibana_framework_adapter';
import { inspectableEsQueriesMap } from './helpers/with_inspect';

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

    const finalParams = {
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
    };

    const startTime = Date.now();
    const collector = request ? inspectableEsQueriesMap.get(request) : undefined;

    return framework
      .callWithRequest<Hit, Aggregation>(requestContext, 'search', finalParams, request)
      .then(
        (response) => {
          if (collector && request) {
            collector.push(
              getInspectResponse({
                esError: null,
                esRequestParams: finalParams,
                esRequestStatus: RequestStatus.OK,
                esResponse: response,
                kibanaRequest: request,
                operationName: 'snapshot search',
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
                operationName: 'snapshot search',
                startTime,
              })
            );
          }
          throw error;
        }
      );
  };
