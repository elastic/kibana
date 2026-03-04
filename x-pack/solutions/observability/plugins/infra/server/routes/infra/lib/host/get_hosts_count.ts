/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import type { ApmDataAccessServicesWrapper } from '../../../../lib/helpers/get_apm_data_access_client';
import type { GetInfraEntityCountRequestBodyPayload } from '../../../../../common/http_api';
import type { InfraMetricsClient } from '../../../../lib/helpers/get_infra_metrics_client';
import { HOST_NAME_FIELD } from '../../../../../common/constants';
import { assertQueryStructure } from '../utils';
import { getDocumentsFilter } from '../helpers/query';
import { getInfraHostNames } from './get_filtered_hosts';

const HOSTS_TO_REMOVE_LIMIT = 10000;

export async function getHostsCount({
  infraMetricsClient,
  apmDataAccessServices,
  query,
  from,
  to,
  schema = 'ecs',
}: GetInfraEntityCountRequestBodyPayload & {
  infraMetricsClient: InfraMetricsClient;
  apmDataAccessServices?: ApmDataAccessServicesWrapper;
}) {
  assertQueryStructure(query);

  const apmDocumentSources = await apmDataAccessServices?.getDocumentSources({
    start: from,
    end: to,
  });

  const [{ allHosts, availableHosts }, documentsFilter] = await Promise.all([
    getInfraHostNames({
      infraMetricsClient,
      query,
      from,
      to,
      limit: HOSTS_TO_REMOVE_LIMIT,
      schema,
    }),
    getDocumentsFilter({
      apmDataAccessServices,
      apmDocumentSources,
      from,
      to,
      schema,
    }),
  ]);

  const availableHostsSet = new Set(availableHosts);
  const hostsToRemove = allHosts.filter((h) => !availableHostsSet.has(h));

  const response = await infraMetricsClient.search(
    {
      allow_no_indices: true,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            query,
            ...rangeQuery(from, to),
            {
              bool: {
                should: [...documentsFilter],
              },
            },
          ],
          ...(hostsToRemove.length > 0 && {
            must_not: [{ terms: { [HOST_NAME_FIELD]: hostsToRemove } }],
          }),
        },
      },
      aggs: {
        totalCount: {
          cardinality: {
            field: HOST_NAME_FIELD,
          },
        },
      },
    },
    'get hosts count'
  );

  return response.aggregations?.totalCount.value ?? 0;
}
