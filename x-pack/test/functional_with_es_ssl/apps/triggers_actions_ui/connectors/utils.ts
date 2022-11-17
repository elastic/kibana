/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { findIndex } from 'lodash';

import { ObjectRemover } from '../../../lib/object_remover';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getTestActionData } from '../../../lib/get_test_data';

export const createSlackConnectorAndObjectRemover = async ({
  getService,
}: {
  getService: FtrProviderContext['getService'];
}) => {
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  const testData = getTestActionData();
  const createdAction = await createSlackConnector({
    name: testData.name,
    getService,
  });
  objectRemover.add(createdAction.id, 'action', 'actions');

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

export const getConnectorByName = async (
  name: string,
  supertest: SuperTest.SuperTest<SuperTest.Test>
) => {
  const { body } = await supertest
    .get(`/api/actions/connectors`)
    .set('kbn-xsrf', 'foo')
    .expect(200);
  const i = findIndex(body, (c: any) => c.name === name);
  return body[i];
};
