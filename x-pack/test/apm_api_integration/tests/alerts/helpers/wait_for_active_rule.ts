/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
// import { retryForSuccess } from '@kbn/ftr-common-functional-services';
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
  // const debugLog = ToolingLog.bind(ToolingLog, { level: 'debug', writeTo: process.stdout });
  // const retryCount = 10;
  // return await retryForSuccess(logger || new debugLog({ context: 'waitForActiveRule' }), {
  //   timeout: 20_000,
  //   methodName: 'waitForActiveRule',
  //   block: async () => {
  //     const response = await supertest.get(`/api/alerting/rule/${ruleId}`);
  //     const status = response.body?.execution_status?.status;
  //     const expectedStatus = 'active';

  //     if (status !== expectedStatus)
  //       throw new Error(`Expected: ${expectedStatus}: got ${status}`);

  //     return status;
  //   },
  //   retryCount,
  // });

  const result = await Effect.runPromise(retryFetch(`/api/alerting/rule/${ruleId}`));

  return result;
  function retryFetch(url: string) {
    return getRuleId(url).pipe(
      Effect.retry({ times: 100 }),
      Effect.timeout('2 minutes'),
      Effect.catchAll(Console.error)
    );
  }
  function getRuleId(url: string) {
    return Effect.tryPromise(() =>
      supertest.get(url).then((response) => {
        logger ? logResponse(logger, response) : () => {};

        const status = response.body?.execution_status?.status;
        const expectedStatus = 'active';

        if (status !== expectedStatus)
          throw new Error(`Expected: ${expectedStatus}: got ${status}`);

        return status;
      })
    );
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
