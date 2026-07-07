/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { ApmDataAccessServicesWrapper } from '../../../../lib/helpers/get_apm_data_access_client';
import type { GetInfraEntityCountRequestBodyPayload } from '../../../../../common/http_api';
import type { InfraMetricsClient } from '../../../../lib/helpers/get_infra_metrics_client';
import {
  DEFAULT_SCHEMA,
  HOST_NAME_FIELD,
  MAX_HOST_COUNT_LIMIT,
} from '../../../../../common/constants';
import { assertQueryStructure, extractExcludedMetadataValues } from '../utils';
import { getDocumentsFilter } from '../helpers/query';
import { getFilteredHostNames } from './get_filtered_hosts';
import { getApmHostNames } from './get_apm_hosts';

export async function getHostsCount({
  infraMetricsClient,
  apmDataAccessServices,
  query,
  from,
  to,
  schema = DEFAULT_SCHEMA,
}: GetInfraEntityCountRequestBodyPayload & {
  infraMetricsClient: InfraMetricsClient;
  apmDataAccessServices?: ApmDataAccessServicesWrapper;
}) {
  assertQueryStructure(query);

  const apmDocumentSources = await apmDataAccessServices?.getDocumentSources({
    start: from,
    end: to,
  });

  const [filteredHosts, apmHosts] = await Promise.all([
    getFilteredHostNames({
      infraMetricsClient,
      query,
      from,
      to,
      limit: MAX_HOST_COUNT_LIMIT,
      schema,
    }),
    apmDataAccessServices && apmDocumentSources
      ? getApmHostNames({
          apmDataAccessServices,
          apmDocumentSources,
          query,
          from,
          to,
          limit: MAX_HOST_COUNT_LIMIT,
          schema,
        })
      : undefined,
  ]);

  const hostNames = [...new Set([...filteredHosts, ...(apmHosts ?? [])])];

  if (hostNames.length === 0) return 0;

  const excludedValues = extractExcludedMetadataValues(query);
  if (excludedValues.size === 0) return hostNames.length;

  const documentsFilter = await getDocumentsFilter({
    apmDataAccessServices,
    apmDocumentSources,
    from,
    to,
    schema,
  });

  const metadataAggs: Record<string, object> = {};
  for (const field of excludedValues.keys()) {
    metadataAggs[field] = {
      filter: { exists: { field } },
      aggs: {
        latest: {
          top_metrics: { metrics: [{ field }], size: 1, sort: { '@timestamp': 'desc' } },
        },
      },
    };
  }

  const response = await infraMetricsClient.search(
    {
      allow_no_indices: true,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...termsQuery(HOST_NAME_FIELD, ...hostNames),
            ...rangeQuery(from, to),
            { bool: { should: [...documentsFilter] } },
          ],
        },
      },
      aggs: {
        hosts: {
          terms: { field: HOST_NAME_FIELD, size: MAX_HOST_COUNT_LIMIT, order: { _key: 'asc' } },
          aggs: metadataAggs,
        },
      },
    },
    'get hosts count'
  );

  const buckets = response.aggregations?.hosts?.buckets ?? [];

  return buckets.filter((bucket: Record<string, any>) =>
    [...excludedValues.entries()].every(([field, values]) => {
      const metaValue = bucket[field]?.latest?.top?.[0]?.metrics?.[field];
      if (metaValue == null) return true;
      if (Array.isArray(metaValue)) {
        return metaValue.every((v: unknown) => !values.has(String(v)));
      }
      return !values.has(String(metaValue));
    })
  ).length;
}
