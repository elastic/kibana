/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

import type { RuleActionArray } from '@kbn/securitysolution-io-ts-alerting-types';
import { getServerLogAction, getWebHookAction } from '..';

const createConnector = async (supertest: SuperTest.Agent, payload: Record<string, unknown>) =>
  (await supertest.post('/api/actions/connector').set('kbn-xsrf', 'true').send(payload).expect(200))
    .body;
const createWebHookConnector = (supertest: SuperTest.Agent) =>
  createConnector(supertest, getWebHookAction());
const createServerLogConnector = (supertest: SuperTest.Agent) =>
  createConnector(supertest, getServerLogAction());

export const getActionsWithoutFrequencies = async (
  supertest: SuperTest.Agent
): Promise<RuleActionArray> => {
  const webHookAction = await createWebHookConnector(supertest);
  const serverLogConnector = await createServerLogConnector(supertest);
  return [
    {
      group: 'default',
      id: webHookAction.id,
      action_type_id: '.webhook',
      params: { message: 'Email message' },
    },
    {
      group: 'default',
      id: serverLogConnector.id,
      action_type_id: '.server-log',
      params: { level: 'info', message: 'Server log message' },
    },
  ];
};

export const getActionsWithFrequencies = async (
  supertest: SuperTest.Agent
): Promise<RuleActionArray> => {
  const webHookAction = await createWebHookConnector(supertest);
  const serverLogConnector = await createServerLogConnector(supertest);
  return [
    {
      group: 'default',
      id: webHookAction.id,
      action_type_id: '.webhook',
      params: { message: 'Email message' },
      frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
    },
    {
      group: 'default',
      id: serverLogConnector.id,
      action_type_id: '.server-log',
      params: { level: 'info', message: 'Server log message' },
      frequency: { summary: false, throttle: '3d', notifyWhen: 'onThrottleInterval' },
    },
  ];
};

export const getSomeActionsWithFrequencies = async (
  supertest: SuperTest.Agent
): Promise<RuleActionArray> => {
  const webHookAction = await createWebHookConnector(supertest);
  const serverLogConnector = await createServerLogConnector(supertest);
  return [
    {
      group: 'default',
      id: webHookAction.id,
      action_type_id: '.webhook',
      params: { message: 'Email message' },
      frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
    },
    {
      group: 'default',
      id: serverLogConnector.id,
      action_type_id: '.server-log',
      params: { level: 'info', message: 'Server log message' },
      frequency: { summary: false, throttle: '3d', notifyWhen: 'onThrottleInterval' },
    },
    {
      group: 'default',
      id: serverLogConnector.id,
      action_type_id: '.server-log',
      params: { level: 'info', message: 'Server log message' },
    },
  ];
};
