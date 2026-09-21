/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import type { ToolingLog } from '@kbn/tooling-log';
import { waitFor } from '@kbn/detections-response-ftr-services';

/**
 * Triggers a run for a rule using the best-effort `_run_soon` API, polling until it answers
 * `204` (run scheduled) instead of `200` with a message explaining it declined to schedule one.
 */
export const runSoonRule = async (
  supertest: SuperTest.Agent,
  log: ToolingLog,
  ruleId: string
): Promise<void> => {
  await waitFor(
    async () => {
      const response = await supertest
        .post(`/internal/alerting/rule/${ruleId}/_run_soon`)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'kibana')
        .set('elastic-api-version', '2023-10-31');

      if (response.status !== 204) {
        log.debug(
          `_run_soon declined to schedule a run for rule ${ruleId}: ${response.status} ${response.text}`
        );
        return false;
      }

      return true;
    },
    'runSoonRule',
    log,
    60000,
    1000
  );
};
