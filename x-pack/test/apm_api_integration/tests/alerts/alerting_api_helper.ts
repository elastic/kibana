/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuperTest, Test } from 'supertest';
import { ApmRuleType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { ApmRuleParamsType } from '@kbn/apm-plugin/common/rules/schema';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { ApmApiClient } from '../../common/config';

export async function createIndexConnector({
  supertest,
  name,
  indexName,
}: {
  supertest: SuperTest<Test>;
  name: string;
  indexName: string;
}) {
  const { body } = await supertest
    .post(`/api/actions/connector`)
    .set('kbn-xsrf', 'foo')
    .send({
      name,
      config: {
        index: indexName,
        refresh: true,
      },
      connector_type_id: '.index',
    });
  return body.id as string;
}

export async function createApmRule<T extends ApmRuleType>({
  supertest,
  name,
  ruleTypeId,
  params,
  actions = [],
}: {
  supertest: SuperTest<Test>;
  ruleTypeId: T;
  name: string;
  params: ApmRuleParamsType[T];
  actions?: any[];
}) {
  try {
    const { body } = await supertest
      .post(`/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .send({
        params,
        consumer: 'apm',
        schedule: {
          interval: '1m',
        },
        tags: ['apm'],
        name,
        rule_type_id: ruleTypeId,
        actions,
      });
    return body;
  } catch (error: any) {
    throw new Error(`[Rule] Creating a rule failed: ${error}`);
  }
}

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
