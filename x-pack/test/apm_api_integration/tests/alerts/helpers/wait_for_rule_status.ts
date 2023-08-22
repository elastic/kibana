/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import pRetry from 'p-retry';
import type SuperTest from 'supertest';

export async function waitForRuleStatus({
  id,
  expectedStatus,
  supertest,
}: {
  id: string;
  expectedStatus: string;
  supertest: SuperTest.SuperTest<SuperTest.Test>;
}): Promise<Record<string, any>> {
  return pRetry(
    async () => {
      const response = await supertest.get(`/api/alerting/rule/${id}`);
      const status = response.body?.execution_status?.status;

      if (status !== expectedStatus) {
        throw new Error(`waitForStatus(${expectedStatus}): got ${status}`);
      }
      return status;
    },
    { retries: 10 }
  );
}

export function waitFor<T>({
  expectation,
  fn,
  debug = false,
}: {
  expectation: T;
  fn: () => Promise<T>;
  debug?: boolean;
}) {
  return pRetry(
    async () => {
      const actual = await fn();
      if (debug) {
        // eslint-disable-next-line no-console
        console.log('Waiting for', expectation, 'got', actual);
      }

      if (!isEqual(actual, expectation)) {
        throw new Error(`Expected ${actual} to be ${expectation}`);
      }
    },
    { retries: 5 }
  );
}
