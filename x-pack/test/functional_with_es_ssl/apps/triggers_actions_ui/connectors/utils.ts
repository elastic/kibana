/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { findIndex } from 'lodash';
import { RuleNotifyWhen } from '@kbn/alerting-plugin/common';
import { ObjectRemover } from '../../../lib/object_remover';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getTestConnectorData, getTestAlertData } from '../../../lib/get_test_data';

export const createSlackConnectorAndObjectRemover = async ({
  getService,
}: {
  getService: FtrProviderContext['getService'];
}) => {
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  const testData = getTestConnectorData();
  const createdAction = await createSlackConnector({
    name: testData.name,
    getService,
  });
  objectRemover.add(createdAction.id, 'connector', 'actions');

  return objectRemover;
};

export const createSlackConnector = async ({
  name,
  getService,
}: {
  name: string;
  getService: FtrProviderContext['getService'];
}) => {
  const actions = getService('actions');
  const connector = await actions.api.createConnector({
    name,
    config: {},
    secrets: { webhookUrl: 'https://test.com' },
    connectorTypeId: '.slack',
  });

  return connector;
};

export const getConnectorByName = async (name: string, supertest: SuperTest.Agent) => {
  const { body } = await supertest
    .get(`/api/actions/connectors`)
    .set('kbn-xsrf', 'foo')
    .expect(200);
  const i = findIndex(body, (c: any) => c.name === name);
  return body[i];
};

export async function createRuleWithActionsAndParams(
  connectorId: string,
  testRunUuid: string,
  params: Record<string, any> = {},
  overwrites: Record<string, any> = {},
  supertest: SuperTest.Agent
) {
  return await createAlwaysFiringRule(
    {
      name: `test-rule-${testRunUuid}`,
      actions: [
        {
          id: connectorId,
          group: 'default',
          params: {
            message: 'from alert 1s',
            level: 'warn',
          },
          frequency: {
            summary: false,
            notify_when: RuleNotifyWhen.THROTTLE,
            throttle: '1m',
          },
        },
      ],
      params,
      ...overwrites,
    },
    supertest
  );
}

async function createAlwaysFiringRule(
  overwrites: Record<string, any> = {},
  supertest: SuperTest.Agent
) {
  const { body: createdRule } = await supertest
    .post(`/api/alerting/rule`)
    .set('kbn-xsrf', 'foo')
    .send(
      getTestAlertData({
        rule_type_id: 'test.always-firing',
        ...overwrites,
      })
    )
    .expect(200);
  return createdRule;
}

export async function getAlertSummary(ruleId: string, supertest: SuperTest.Agent) {
  const { body: summary } = await supertest
    .get(`/internal/alerting/rule/${encodeURIComponent(ruleId)}/_alert_summary`)
    .expect(200);
  return summary;
}
