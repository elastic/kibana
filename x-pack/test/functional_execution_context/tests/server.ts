/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';
import { assertLogContains, isExecutionContextLog, ANY, logFilePath } from '../test_utils';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const supertest = getService('supertest');

  async function waitForStatus(
    id: string,
    statuses: Set<string>,
    waitMillis: number = 10000
  ): Promise<Record<string, any>> {
    if (waitMillis < 0) {
      expect().fail(`waiting for alert ${id} statuses ${Array.from(statuses)} timed out`);
    }

    const response = await supertest.get(`/api/alerting/rule/${id}`);
    expect(response.status).to.eql(200);
    const { status } = response.body.execution_status;
    if (statuses.has(status)) return response.body.execution_status;

    // eslint-disable-next-line no-console
    console.log(
      `waitForStatus(${Array.from(statuses)} for id:${id}): got ${JSON.stringify(
        response.body.execution_status
      )}, retrying`
    );

    const WaitForStatusIncrement = 500;
    await delay(WaitForStatusIncrement);
    return await waitForStatus(id, statuses, waitMillis - WaitForStatusIncrement);
  }

  describe('Server-side apps', () => {
    it('propagates context for Task and Alerts', async () => {
      const { body: createdAlert } = await supertest
        .post('/api/alerting/rule')
        .set('kbn-xsrf', 'true')
        .send({
          enabled: true,
          name: 'abc',
          tags: ['foo'],
          rule_type_id: 'test.longRunning',
          consumer: 'alertsFixture',
          schedule: { interval: '3s' },
          throttle: '20s',
          actions: [],
          params: {},
          notify_when: 'onThrottleInterval',
        })
        .expect(200);

      const alertId = createdAlert.id;

      await waitForStatus(alertId, new Set(['ok']), 90_000);

      await assertLogContains({
        description: 'execution context propagates to Elasticsearch via "x-opaque-id" header1',
        predicate: (record) =>
          Boolean(
            // exclude part with taskId
            record.http?.request?.id?.includes(`kibana:task manager:run alerting:test.longRunning:`)
          ),
        retry,
        path: logFilePath,
      });

      await assertLogContains({
        description: 'execution context propagates to Elasticsearch via "x-opaque-id" header1',
        predicate: (record) =>
          Boolean(record.http?.request?.id?.includes(`alert:execute test.longRunning:${alertId}`)),
        retry,
        path: logFilePath,
      });

      await assertLogContains({
        description: 'execution context propagates to Kibana logs',
        predicate: (record) =>
          isExecutionContextLog(record?.message, {
            parent: {
              type: 'task manager',
              name: 'run alerting:test.longRunning',
              // @ts-expect-error. it accepts strings only
              id: ANY,
              description: 'run task',
            },
            type: 'alert',
            name: 'execute test.longRunning',
            id: alertId,
            description: 'execute [test.longRunning] with name [abc] in [default] namespace',
          }),
        retry,
        path: logFilePath,
      });
    });
  });
}
