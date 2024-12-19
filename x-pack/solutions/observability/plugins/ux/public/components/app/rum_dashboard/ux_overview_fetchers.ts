/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchResponse } from '@kbn/es-types';
import { DataPublicPluginStart, isRunningResponse } from '@kbn/data-plugin/public';
import { IKibanaSearchRequest } from '@kbn/search-types';
import {
  FetchDataParams,
  HasDataParams,
  UxFetchDataResponse,
  UXHasDataResponse,
} from '@kbn/observability-plugin/public';
import type { UXMetrics } from '@kbn/observability-shared-plugin/public';
import { inpQuery, transformINPResponse } from '../../../services/data/inp_query';
import {
  coreWebVitalsQuery,
  transformCoreWebVitalsResponse,
  DEFAULT_RANKS,
} from '../../../services/data/core_web_vitals_query';
import { callApmApi } from '../../../services/rest/create_call_apm_api';
import { formatHasRumResult, hasRumDataQuery } from '../../../services/data/has_rum_data_query';

export { createCallApmApi } from '../../../services/rest/create_call_apm_api';

type WithDataPlugin<T> = T & { dataStartPlugin: DataPublicPluginStart };

async function getCoreWebVitalsResponse({
  absoluteTime,
  serviceName,
  dataStartPlugin,
}: WithDataPlugin<FetchDataParams>) {
  const dataViewResponse = await callApmApi('GET /internal/apm/data_view/index_pattern', {
    signal: null,
  });

  return await Promise.all([
    esQuery<ReturnType<typeof coreWebVitalsQuery>>(dataStartPlugin, {
      params: {
        index: dataViewResponse.apmDataViewIndexPattern,
        ...coreWebVitalsQuery(absoluteTime.start, absoluteTime.end, undefined, {
          serviceName: serviceName ? [serviceName] : undefined,
        }),
      },
    }),
    esQuery<ReturnType<typeof inpQuery>>(dataStartPlugin, {
      params: {
        index: dataViewResponse.apmDataViewIndexPattern,
        ...inpQuery(absoluteTime.start, absoluteTime.end, undefined, {
          serviceName: serviceName ? [serviceName] : undefined,
        }),
      },
    }),
  ]);
}

const CORE_WEB_VITALS_DEFAULTS: UXMetrics = {
  coreVitalPages: 0,
  cls: 0,
  lcp: 0,
  tbt: 0,
  fcp: 0,
  lcpRanks: DEFAULT_RANKS,
  inpRanks: DEFAULT_RANKS,
  clsRanks: DEFAULT_RANKS,
};

export const fetchUxOverviewDate = async (
  params: WithDataPlugin<FetchDataParams>
): Promise<UxFetchDataResponse> => {
  const [coreWebVitalsResponse, inpResponse] = await getCoreWebVitalsResponse(params);
  const data = transformCoreWebVitalsResponse(coreWebVitalsResponse) ?? CORE_WEB_VITALS_DEFAULTS;
  const inpData = transformINPResponse(inpResponse);
  return {
    coreWebVitals: {
      ...data,
      ...(inpData ? { inp: inpData?.inp, inpRanks: inpData?.inpRanks } : {}),
    },
    appLink: `/app/ux?rangeFrom=${params.relativeTime.start}&rangeTo=${params.relativeTime.end}`,
  };
};

export async function hasRumData(
  params: WithDataPlugin<HasDataParams>
): Promise<UXHasDataResponse> {
  const dataViewResponse = await callApmApi('GET /internal/apm/data_view/index_pattern', {
    signal: null,
  });

  const esQueryResponse = await esQuery<ReturnType<typeof hasRumDataQuery>>(
    params.dataStartPlugin,
    {
      params: {
        index: dataViewResponse.apmDataViewIndexPattern,
        ...hasRumDataQuery({
          start: params?.absoluteTime?.start,
          end: params?.absoluteTime?.end,
        }),
      },
    }
  );

  return formatHasRumResult(esQueryResponse, dataViewResponse.apmDataViewIndexPattern);
}

async function esQuery<T>(
  dataStartPlugin: DataPublicPluginStart,
  query: IKibanaSearchRequest<T> & { params: { index?: string } }
) {
  // @ts-expect-error upgrade typescript v4.9.5
  return new Promise<ESSearchResponse<{}, T, { restTotalHitsAsInt: false }>>((resolve, reject) => {
    const search$ = dataStartPlugin.search
      .search(query, {
        legacyHitsTotal: false,
      })
      .subscribe({
        next: (result) => {
          if (!isRunningResponse(result)) {
            resolve(result.rawResponse as any);
            search$.unsubscribe();
          }
        },
        error: (err) => {
          reject(err);
        },
      });
  });
}
