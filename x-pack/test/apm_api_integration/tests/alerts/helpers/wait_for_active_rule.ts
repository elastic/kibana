/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';
import type { Agent as SuperTestAgent } from 'supertest';
import { SupertestWithRoleScope } from '../../../../api_integration/deployment_agnostic/services/role_scoped_supertest';

const RETRIES_COUNT = 10;

export async function waitForActiveRule({
  ruleId,
  supertest,
  logger,
}: {
  ruleId: string;
  supertest: SuperTestAgent | SupertestWithRoleScope;
  logger?: ToolingLog;
}): Promise<Record<string, any>> {
  return pRetry(
    async () => {
      const response = await supertest.get(`/api/alerting/rule/${ruleId}`);
      const status = response.body?.execution_status?.status;
      const expectedStatus = 'active';

      if (status !== expectedStatus) {
        throw new Error(`Expected: ${expectedStatus}: got ${status}`);
      }

      return status;
    },
    {
      retries: RETRIES_COUNT,
      onFailedAttempt: (error) => {
        if (logger) {
          logger.info(`Attempt ${error.attemptNumber}/${RETRIES_COUNT}: Waiting for active rule`);
        }
      },
    }
  );
}
