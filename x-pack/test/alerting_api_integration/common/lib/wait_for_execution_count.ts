/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import supertest from 'supertest';
import { getUrlPrefix } from './space_test_utils';

async function delay(millis: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, millis));
}

export function createWaitForExecutionCount(
  st: supertest.SuperTest<supertest.Test>,
  spaceId?: string,
  delayMs: number = 3000
) {
  const MAX_ATTEMPTS = 25;
  let attempts = 0;

  return async function waitForExecutionCount(count: number, id: string): Promise<boolean> {
    if (attempts++ >= MAX_ATTEMPTS) {
      expect().fail(`waiting for execution of alert ${id} to hit ${count}`);
      return true;
    }
    const prefix = spaceId ? getUrlPrefix(spaceId) : '';
    const getResponse = await st.get(`${prefix}/internal/alerting/rule/${id}`);
    expect(getResponse.status).to.eql(200);
    if (getResponse.body.monitoring.execution.history.length >= count) {
      attempts = 0;
      return true;
    }
    // eslint-disable-next-line no-console
    console.log(
      `found ${getResponse.body.monitoring.execution.history.length} and looking for ${count}, waiting 3s then retrying`
    );
    await delay(delayMs);
    return waitForExecutionCount(count, id);
  };
}
