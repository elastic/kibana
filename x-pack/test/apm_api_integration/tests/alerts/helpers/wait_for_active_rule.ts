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

// // const debugLog = ToolingLog.bind(ToolingLog, { level: 'debug', writeTo: process.stdout });
// const retryCount = 10;

export async function waitForActiveRule({
  ruleId,
  supertest,
  logger,
}: {
  ruleId: string;
  supertest: SuperTest.Agent;
  logger?: ToolingLog;
}) {
  // return await retryForSuccess(logger || new debugLog({ context: 'waitForActiveRule' }), {
  //   timeout: 20_000,
  //   methodName: 'waitForActiveRule',
  //   block: async () => {
  //     const response = await supertest.get(`/api/alerting/rule/${ruleId}`);
  //     const status = response.body?.execution_status?.status;
  //     const expectedStatus = 'active';
  //
  //     if (status !== expectedStatus) throw new Error(`Expected: ${expectedStatus}: got ${status}`);
  //
  //     return status;
  //   },
  //   retryCount,
  // });

  const program = (url: string) =>
    getRuleId(url).pipe(
      Effect.retry({ times: 100 }),
      Effect.timeout('2 minutes'),
      Effect.catchAll(Console.error)
    );

  Effect.runFork(program(`/api/alerting/rule/${ruleId}`));

  function getRuleId(url: string) {
    return Effect.tryPromise(() =>
      supertest.get(url).then((response) => {
        console.log(`\nλjs response.status: \n\t${response?.status}`);
        console.log(`\nλjs response.body?.status: \n\t${response.body?.status}`);
        console.log(`\nλjs response.body?.execution_status?.status: \n${JSON.stringify(response.body?.execution_status?.status, null, 2)}`);
        const status = response.body?.execution_status?.status;
        const expectedStatus = 'active';

        if (status !== expectedStatus)
          throw new Error(`Expected: ${expectedStatus}: got ${status}`);

        return status;
      })
    );
  }
}
