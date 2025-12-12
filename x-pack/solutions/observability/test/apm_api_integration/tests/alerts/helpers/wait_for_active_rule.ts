/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import { retryForSuccess } from '@kbn/ftr-common-functional-services';

const debugLog = ToolingLog.bind(ToolingLog, { level: 'debug', writeTo: process.stdout });
const retryCount = 10;

export async function waitForActiveRule({
  ruleId,
  supertest,
  logger,
}: {
  ruleId: string;
  supertest: SuperTest.Agent;
  logger?: ToolingLog;
}): Promise<Record<string, any>> {
  return await retryForSuccess(logger || new debugLog({ context: 'waitForActiveRule' }), {
    timeout: 20_000,
    methodName: 'waitForActiveRule',
    block: async () => {
      const response = await supertest.get(`/api/alerting/rule/${ruleId}`);
      const status = response.body?.execution_status?.status;
      const expectedStatus = 'active';

      if (status !== expectedStatus) throw new Error(`Expected: ${expectedStatus}: got ${status}`);

      return status;
    },
    retryCount,
  });
}
