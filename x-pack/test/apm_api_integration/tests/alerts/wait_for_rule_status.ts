/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ToolingLog } from '@kbn/tooling-log';
import expect from '@kbn/expect';
import type SuperTest from 'supertest';

const WAIT_FOR_STATUS_INCREMENT = 500;

export async function waitForRuleStatus({
  id,
  expectedStatus,
  waitMillis = 10000,
  supertest,
  log,
}: {
  expectedStatus: string;
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  log: ToolingLog;
  waitMillis?: number;
  id?: string;
}): Promise<Record<string, any>> {
  if (waitMillis < 0 || !id) {
    expect().fail(`waiting for alert ${id} status ${expectedStatus} timed out`);
  }

  const response = await supertest.get(`/api/alerting/rule/${id}`);
  expect(response.status).to.eql(200);

  const { execution_status: executionStatus } = response.body || {};
  const { status } = executionStatus || {};

  const message = `waitForStatus(${expectedStatus}): got ${JSON.stringify(executionStatus)}`;

  if (status === expectedStatus) {
    return executionStatus;
  }

  log.debug(`${message}, retrying`);

  await delay(WAIT_FOR_STATUS_INCREMENT);
  return await waitForRuleStatus({
    id,
    expectedStatus,
    waitMillis: waitMillis - WAIT_FOR_STATUS_INCREMENT,
    supertest,
    log,
  });
}

async function delay(millis: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, millis));
}
