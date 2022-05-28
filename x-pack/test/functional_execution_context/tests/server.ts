/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';
import { assertLogContains, isExecutionContextLog, ANY } from '../test_utils';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const supertest = getService('supertest');
  const log = getService('log');

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

    log.debug(
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
          rule_type_id: 'test.executionContext',
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
        description:
          'task manager execution context propagates to Elasticsearch via "x-opaque-id" header',
        predicate: (record) =>
          Boolean(
            // exclude part with taskId
            record.http?.request?.id?.includes(
              `kibana:task%20manager:run%20alerting%3Atest.executionContext:`
            )
          ),
        retry,
      });

      await assertLogContains({
        description:
          'alerting execution context propagates to Elasticsearch via "x-opaque-id" header',
        predicate: (record) =>
          Boolean(
            record.http?.request?.id?.includes(`alert:execute%20test.executionContext:${alertId}`)
          ),
        retry,
      });

      await assertLogContains({
        description: 'execution context propagates to Kibana logs',
        predicate: (record) =>
          isExecutionContextLog(record?.message, {
            type: 'task manager',
            name: 'run alerting:test.executionContext',
            // @ts-expect-error. it accepts strings only
            id: ANY,
            description: 'run task',
            child: {
              type: 'alert',
              name: 'execute test.executionContext',
              id: alertId,
              description: 'execute [test.executionContext] with name [abc] in [default] namespace',
            },
          }),
        retry,
      });
    });

    it('propagates context for Telemetry collection', async () => {
      await supertest
        .post('/api/telemetry/v2/clusters/_stats')
        .set('kbn-xsrf', 'true')
        .send({ unencrypted: false })
        .expect(200);

      await assertLogContains({
        description:
          'usage_collection execution context propagates to Elasticsearch via "x-opaque-id" header',
        predicate: (record) =>
          Boolean(
            // exclude part with collector types
            record.http?.request?.id?.includes(
              `kibana:usage_collection:collector.fetch:application_usage`
            )
          ),
        retry,
      });

      await assertLogContains({
        description: 'execution context propagates to Kibana logs',
        predicate: (record) =>
          isExecutionContextLog(record?.message, {
            type: 'usage_collection',
            name: 'collector.fetch',
            id: 'application_usage',
            description: 'Fetch method in the Collector "application_usage"',
          }),
        retry,
      });
    });
  });
}
