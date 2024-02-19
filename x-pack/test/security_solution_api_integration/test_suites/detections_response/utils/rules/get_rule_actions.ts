/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

import { RuleActionArray } from '@kbn/securitysolution-io-ts-alerting-types';
import { createConnector } from '../../../../../common/utils/connectors';
import { getWebHookConnectorParams } from '../connectors/get_web_hook_connector_params';
import { getSlackConnectorParams } from '../connectors/get_slack_connector_params';

export const getActionsWithoutFrequencies = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>
): Promise<RuleActionArray> => {
  const webHookActionId = await createConnector(supertest, getWebHookConnectorParams());
  const slackConnectorId = await createConnector(supertest, getSlackConnectorParams());

  return [
    {
      group: 'default',
      id: webHookActionId,
      action_type_id: '.webhook',
      params: { message: 'Email message' },
    },
    {
      group: 'default',
      id: slackConnectorId,
      action_type_id: '.slack',
      params: { message: 'Slack message' },
    },
  ];
};

export const getActionsWithFrequencies = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>
): Promise<RuleActionArray> => {
  const webHookActionId = await createConnector(supertest, getWebHookConnectorParams());
  const slackConnectorId = await createConnector(supertest, getSlackConnectorParams());

  return [
    {
      group: 'default',
      id: webHookActionId,
      action_type_id: '.webhook',
      params: { message: 'Email message' },
      frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
    },
    {
      group: 'default',
      id: slackConnectorId,
      action_type_id: '.slack',
      params: { message: 'Slack message' },
      frequency: { summary: false, throttle: '3d', notifyWhen: 'onThrottleInterval' },
    },
  ];
};

export const getSomeActionsWithFrequencies = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>
): Promise<RuleActionArray> => {
  const webHookActionId = await createConnector(supertest, getWebHookConnectorParams());
  const slackConnectorId = await createConnector(supertest, getSlackConnectorParams());

  return [
    {
      group: 'default',
      id: webHookActionId,
      action_type_id: '.webhook',
      params: { message: 'Email message' },
      frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
    },
    {
      group: 'default',
      id: slackConnectorId,
      action_type_id: '.slack',
      params: { message: 'Slack message' },
      frequency: { summary: false, throttle: '3d', notifyWhen: 'onThrottleInterval' },
    },
    {
      group: 'default',
      id: slackConnectorId,
      action_type_id: '.slack',
      params: { message: 'Slack message' },
    },
  ];
};
