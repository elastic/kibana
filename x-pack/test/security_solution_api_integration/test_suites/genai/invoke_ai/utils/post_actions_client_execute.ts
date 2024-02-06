/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { Response } from 'superagent';

/**
 * Gets the stats from the stats endpoint.
 * @param supertest The supertest agent.
 * @returns The detection metrics
 */
export const postActionsClientExecute = async (
  connectorId: string,
  args: any,
  supertest: SuperTest.SuperTest<SuperTest.Test>
  // log: ToolingLog
): Promise<Response> => {
  const response = await supertest
    .post(`/internal/elastic_assistant/actions/connector/${connectorId}/_execute`)
    .set('kbn-xsrf', 'true')
    // TODO once merge with yuliia
    // .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .send(args);

  return response;
};
