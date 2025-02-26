/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import { Console, Effect } from 'effect';

export async function waitForActiveRule({
  ruleId,
  supertest,
  logger,
}: {
  ruleId: string;
  supertest: SuperTest.Agent;
  logger?: ToolingLog;
}) {
  const getRule = () => supertest.get(`/api/alerting/rule/${ruleId}`).then(logAndInspect);

  return await Effect.runPromise(
    Effect.tryPromise(getRule).pipe(
      Effect.retry({ times: 100 }),
      Effect.timeout('90 seconds'),
      Effect.catchAll(Console.error)
    )
  );

  function logAndInspect(response: any): any {
    if (logger) logResponse(logger, response);

    const status = response.body?.execution_status?.status;
    const expectedStatus = 'active';

    if (status !== expectedStatus) throw new Error(`Expected: ${expectedStatus}: got ${status}`);

    return status;
  }
}

function logResponse(logger: ToolingLog, response: any) {
  logger.debug(`\nλjs response.status: \n\t${response?.status}`);
  logger.debug(`\nλjs response.body?.status: \n\t${response.body?.status}`);
  logger.debug(
    `\nλjs response.body?.execution_status?.status: \n${JSON.stringify(
      response.body?.execution_status?.status,
      null,
      2
    )}`
  );
}
