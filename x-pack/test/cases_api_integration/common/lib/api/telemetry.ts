/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { CasesTelemetry } from '@kbn/cases-plugin/server/telemetry/types';
import { CASES_TELEMETRY_TASK_NAME } from '@kbn/cases-plugin/common/constants';

interface CasesTelemetryPayload {
  stats: { stack_stats: { kibana: { plugins: { cases: CasesTelemetry } } } };
}

export const getTelemetry = async (supertest: SuperTest.Agent): Promise<CasesTelemetryPayload> => {
  const { body } = await supertest
    .post('/internal/telemetry/clusters/_stats')
    .set('kbn-xsrf', 'xxx')
    .set(ELASTIC_HTTP_VERSION_HEADER, '2')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .send({ unencrypted: true, refreshCache: true })
    .expect(200);

  return body[0];
};

export const runTelemetryTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/cases_fixture/telemetry/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({ taskId: CASES_TELEMETRY_TASK_NAME })
    .expect(200);
};
