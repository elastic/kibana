/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import {
  INITIALIZE_SECURITY_SOLUTION_URL,
  type InitializationFlowId,
} from '@kbn/security-solution-plugin/common/api/initialization';

/**
 * Calls the Security Solution initialization endpoint with the given flows.
 */
export const initializeSecuritySolution = (
  supertest: SuperTest.Agent,
  flows: InitializationFlowId[]
) =>
  supertest
    .post(INITIALIZE_SECURITY_SOLUTION_URL)
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
    .set('x-elastic-internal-origin', 'kibana')
    .send({ flows });
