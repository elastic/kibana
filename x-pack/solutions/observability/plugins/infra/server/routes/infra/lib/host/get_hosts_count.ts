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

export async function getHostsCount({
  infraMetricsClient,
  apmDataAccessServices,
  query,
  from,
  to,
  schema,
}: GetInfraEntityCountRequestBodyPayload & {
  infraMetricsClient: InfraMetricsClient;
  apmDataAccessServices?: ApmDataAccessServicesWrapper;
}) {
  assertQueryStructure(query);

  const apmDocumentSources = await apmDataAccessServices?.getDocumentSources({
    start: from,
    end: to,
  });

  const documentsFilter = await getDocumentsFilter({
    apmDataAccessServices,
    apmDocumentSources,
    from,
    to,
    schema,
  });

  const response = await infraMetricsClient.search({
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
      },
    },
    aggs: {
      totalCount: {
        cardinality: {
          field: HOST_NAME_FIELD,
        },
      },
    },
  });

  return response.aggregations?.totalCount.value ?? 0;
}
