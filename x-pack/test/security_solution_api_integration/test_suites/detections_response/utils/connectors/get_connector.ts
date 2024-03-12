/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import type SuperTest from 'supertest';

export async function getConnector(
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  connectorId: string
): Promise<Connector> {
  const response = await supertest
    .get(`/api/actions/connector/${connectorId}`)
    .set('kbn-xsrf', 'foo')
    .expect(200);

  return response.body;
}
