/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { ObservabilityApmAlert } from '@kbn/alerts-as-data-utils';
import type { ApmApiClient } from '../../../../../services/apm_api';

export const APM_ALERTS_INDEX = '.alerts-observability.apm.alerts-*';
export const APM_ACTION_VARIABLE_INDEX = 'apm-index-connector-test';

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
        useDurationSummary: true,
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

export function getIndexAction({
  actionId,
  actionVariables,
}: {
  actionId: string;
  actionVariables: Array<{ name: string }>;
}) {
  return {
    group: 'threshold_met',
    id: actionId,
    params: {
      documents: [
        actionVariables.reduce<Record<string, string>>((acc, actionVariable) => {
          acc[actionVariable.name] = `{{context.${actionVariable.name}}}`;
          return acc;
        }, {}),
      ],
    },
    frequency: {
      notify_when: 'onActionGroupChange',
      throttle: null,
      summary: false,
    },
  };
}

export type ApmAlertFields = ParsedTechnicalFields & ObservabilityApmAlert;
