/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorResponse } from '@kbn/actions-plugin/common/routes/connector/response';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type SuperTest from 'supertest';
import { getSpaceUrlPrefix } from '../get_space_prefix';

/**
 * Fetches all connectors
 *
 * @param supertest The supertest agent
 * @param spaceId The space id (optional, defaults to "default")
 */
export async function getAllConnectors(
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  { spaceId = 'default' } = {}
): Promise<ConnectorResponse[]> {
  const { body: connectors } = await supertest
    .get(`${getSpaceUrlPrefix(spaceId)}/api/actions/connectors`)
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .expect(200);

  return connectors;
}
