/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

export interface CreateConnectorBody {
  readonly name: string;
  readonly config: Record<string, unknown>;
  readonly connector_type_id: string;
  readonly secrets: Record<string, unknown>;
}

export async function createConnector(
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  connector: CreateConnectorBody,
  id = ''
): Promise<string> {
  const { body } = await supertest
    .post(`/api/actions/connector/${id}`)
    .set('kbn-xsrf', 'foo')
    .send(connector)
    .expect(200);

  return body.id;
}
