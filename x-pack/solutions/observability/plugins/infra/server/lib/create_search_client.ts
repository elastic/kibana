/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { getExcludedDataTiers, mergeDataTierFilter } from '@kbn/observability-shared-plugin/common';
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
    // Get excluded data tiers from UI settings
    const { uiSettings } = await requestContext.core;
    const excludedDataTiers = await getExcludedDataTiers(uiSettings.client);

    // Apply data tier filter only when there are tiers to exclude
    let searchOpts: CallWithRequestParams = opts;

    if (excludedDataTiers.length > 0) {
      const mustNot = mergeDataTierFilter(opts.body?.query?.bool?.must_not, excludedDataTiers);
      searchOpts = {
        ...opts,
        body: {
          ...opts.body,
          query: {
            ...opts.body?.query,
            bool: {
              ...opts.body?.query?.bool,
              must_not: mustNot,
            },
          },
        },
      };
    }

    return framework.callWithRequest(requestContext, 'search', searchOpts, request);
  };
