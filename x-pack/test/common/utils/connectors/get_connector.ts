/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import type SuperTest from 'supertest';
import { getSpaceUrlPrefix } from '../get_space_prefix';

/**
 * Fetch a connector
 *
 * @param supertest The supertest agent
 * @param connectorId The connector to fetch
 * @param spaceId The space id (optional, defaults to "default")
 */
export async function getConnector(
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  connectorId: string,
  { spaceId = 'default' } = {}
): Promise<Connector> {
  const response = await supertest
    .get(`${getSpaceUrlPrefix(spaceId)}/api/actions/connector/${connectorId}`)
    .set('kbn-xsrf', 'foo')
    .expect(200);

  return response.body;
}
