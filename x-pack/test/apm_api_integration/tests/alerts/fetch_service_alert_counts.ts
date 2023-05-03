/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { ApmApiClient } from '../../common/config';

function getTimerange() {
  return {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
}

export async function fetchServiceInventoryAlertCounts(apmApiClient: ApmApiClient) {
  const timerange = getTimerange();
  const serviceInventoryResponse = await apmApiClient.readUser({
    endpoint: 'GET /internal/apm/services',
    params: {
      query: {
        ...timerange,
        environment: 'ENVIRONMENT_ALL',
        kuery: '',
        probability: 1,
        documentType: ApmDocumentType.ServiceTransactionMetric,
        rollupInterval: RollupInterval.SixtyMinutes,
      },
    },
  });
  return serviceInventoryResponse.body.items.reduce<Record<string, number>>((acc, item) => {
    return { ...acc, [item.serviceName]: item.alertsCount ?? 0 };
  }, {});
}

export async function fetchServiceTabAlertCount({
  apmApiClient,
  serviceName,
}: {
  apmApiClient: ApmApiClient;
  serviceName: string;
}) {
  const timerange = getTimerange();
  const alertsCountReponse = await apmApiClient.readUser({
    endpoint: 'GET /internal/apm/services/{serviceName}/alerts_count',
    params: {
      path: {
        serviceName,
      },
      query: {
        ...timerange,
        environment: 'ENVIRONMENT_ALL',
      },
    },
  });

  return alertsCountReponse.body.alertsCount;
}
