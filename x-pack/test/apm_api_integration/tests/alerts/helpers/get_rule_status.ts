/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type SuperTest from 'supertest';
import { RULE_ENDPOINT } from './constants';

export async function getRuleStatus({
  id,
  expectedStatus,
  supertest,
}: {
  id: string;
  expectedStatus: string;
  supertest: SuperTest.SuperTest<SuperTest.Test>;
}): Promise<Record<string, any>> {
  const response = await supertest.get(`${RULE_ENDPOINT}/${id}`);
  const { execution_status: executionStatus } = response.body || {};
  const { status } = executionStatus || {};
  if (status !== expectedStatus) {
    throw new Error(`waitForStatus(${expectedStatus}): got ${status}`);
  }
  return executionStatus;
}
