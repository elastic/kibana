/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { serviceNameQuery } from '../services/data/service_name_query';
import { callApmApi } from '../services/rest/create_call_apm_api';

interface ServicesAggregation {
  services?: { buckets?: Array<{ key: string }> };
}

export const fetchClassicRumApplications = async ({
  data,
  start,
  end,
}: {
  data: DataPublicPluginStart;
  start: number;
  end: number;
}): Promise<string[]> => {
  const { apmDataViewIndexPattern } = await callApmApi(
    'GET /internal/apm/data_view/index_pattern',
    { signal: null }
  );

  const { rawResponse } = await lastValueFrom(
    data.search.search({
      params: { index: apmDataViewIndexPattern, ...serviceNameQuery(start, end) },
    })
  );

  const { services } = (rawResponse.aggregations ?? {}) as ServicesAggregation;
  return services?.buckets?.map(({ key }) => key) ?? [];
};
