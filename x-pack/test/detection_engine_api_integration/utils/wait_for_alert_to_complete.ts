/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';

import { waitFor } from './wait_for';

export const waitForAlertToComplete = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  id: string
): Promise<void> => {
  await waitFor(
    async () => {
      const response = await supertest.get(`/api/alerts/alert/${id}/state`).set('kbn-xsrf', 'true');
      if (response.status !== 200) {
        log.debug(
          `Did not get an expected 200 "ok" when waiting for an alert to complete (waitForAlertToComplete). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
            response.body
          )}, status: ${JSON.stringify(response.status)}`
        );
      }
      return response.body.previousStartedAt != null;
    },
    'waitForAlertToComplete',
    log
  );
};
