/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { GET_SPACE_HEALTH_URL } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_monitoring';
import type { GetSpaceHealthResponse } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_monitoring/detection_engine_health/get_space_health/get_space_health_route';
import type SuperTest from 'supertest';

interface GetSpaceHealthParams {
  interval?: {
    type: string;
    granularity: string;
  };
  num_of_top_rules?: number;
  debug?: boolean;
}

export const getSpaceHealth = async (
  supertest: SuperTest.Agent,
  body: GetSpaceHealthParams = {}
): Promise<GetSpaceHealthResponse> => {
  const response = await supertest
    .post(GET_SPACE_HEALTH_URL)
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .send(body);

  if (response.status !== 200) {
    throw new Error(
      `Expected 200 from POST ${GET_SPACE_HEALTH_URL}, got ${response.status}: ${JSON.stringify(
        response.body
      )}`
    );
  }

  return response.body;
};

export const getSpaceHealthWithDefaults = async (
  supertest: SuperTest.Agent
): Promise<GetSpaceHealthResponse> => {
  const response = await supertest
    .get(GET_SPACE_HEALTH_URL)
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');

  if (response.status !== 200) {
    throw new Error(
      `Expected 200 from GET ${GET_SPACE_HEALTH_URL}, got ${response.status}: ${JSON.stringify(
        response.body
      )}`
    );
  }

  return response.body;
};
