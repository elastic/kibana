/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getServiceNames, serviceNameQuery } from '../data/service_name_query';
import { callApmApi, createCallApmApi } from './create_call_apm_api';

/** Names of the services with RUM page loads between `start` and `end`. */
export const fetchClassicRumApplications = async ({
  core,
  data,
  start,
  end,
  signal,
}: {
  core: CoreStart;
  data: DataPublicPluginStart;
  start: number;
  end: number;
  signal?: AbortSignal;
}): Promise<string[]> => {
  // The APM client is otherwise only initialized when the ux app mounts.
  createCallApmApi(core);
  const { apmDataViewIndexPattern } = await callApmApi(
    'GET /internal/apm/data_view/index_pattern',
    { signal: signal ?? null }
  );

  const { rawResponse } = await lastValueFrom(
    data.search.search(
      { params: { index: apmDataViewIndexPattern, ...serviceNameQuery(start, end) } },
      { abortSignal: signal }
    )
  );

  return getServiceNames(rawResponse.aggregations);
};
