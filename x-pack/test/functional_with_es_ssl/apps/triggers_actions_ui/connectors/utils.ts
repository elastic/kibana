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

export const createConnectorAndObjectRemover = async ({
  getPageObject,
  getService,
}: {
  getPageObject: FtrProviderContext['getPageObject'];
  getService: FtrProviderContext['getService'];
}) => {
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  const testData = getTestActionData();
  const createdAction = await createSlackConnector({
    name: testData.name,
    getPageObject,
    getService,
  });
  objectRemover.add(createdAction.id, 'action', 'actions');

  return objectRemover;
};

export const createSlackConnector = async ({
  name,
  getPageObject,
  getService,
}: {
  name: string;
  getPageObject: FtrProviderContext['getPageObject'];
  getService: FtrProviderContext['getService'];
}) => {
  const connector = await createConnector({
    name,
    config: {},
    secrets: { webhookUrl: 'https://test.com' },
    connectorTypeId: '.slack',
    getPageObject,
    getService,
  });

  return connector;
};

export const getConnector = async (
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

export const createConnector = async ({
  name,
  config,
  secrets,
  connectorTypeId,
  getPageObject,
  getService,
}: {
  name: string;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
  connectorTypeId: string;
  getPageObject: FtrProviderContext['getPageObject'];
  getService: FtrProviderContext['getService'];
}) => {
  const common = getPageObject('common');
  const supertest = getService('supertest');

  const { body: createdAction } = await supertest
    .post(`/api/actions/connector`)
    .set('kbn-xsrf', 'foo')
    .send({
      name,
      config,
      secrets,
      connector_type_id: connectorTypeId,
    })
    .expect(200);

  await common.navigateToApp('triggersActionsConnectors');

  return createdAction;
};
