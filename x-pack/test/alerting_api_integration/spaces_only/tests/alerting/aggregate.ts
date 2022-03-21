/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createAggregateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('aggregate', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    it('should aggregate when there are no alerts', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`
      );

      expect(response.status).to.eql(200);
      expect(response.body).to.eql({
        rule_enabled_status: {
          disabled: 0,
          enabled: 0,
        },
        rule_execution_status: {
          ok: 0,
          active: 0,
          error: 0,
          pending: 0,
          unknown: 0,
          warning: 0,
        },
        rule_muted_status: {
          muted: 0,
          unmuted: 0,
        },
      });
    });

    it('should aggregate alert status totals', async () => {
      const NumOkAlerts = 4;
      const NumActiveAlerts = 1;
      const NumErrorAlerts = 2;

      await Promise.all(
        [...Array(NumOkAlerts)].map(async () => {
          const okAlertId = await createTestAlert(
            {
              rule_type_id: 'test.noop',
              schedule: { interval: '1s' },
            },
            'ok'
          );
          objectRemover.add(Spaces.space1.id, okAlertId, 'rule', 'alerting');
        })
      );

      await Promise.all(
        [...Array(NumActiveAlerts)].map(async () => {
          const activeAlertId = await createTestAlert(
            {
              rule_type_id: 'test.patternFiring',
              schedule: { interval: '1s' },
              params: {
                pattern: { instance: new Array(100).fill(true) },
              },
            },
            'active'
          );
          objectRemover.add(Spaces.space1.id, activeAlertId, 'rule', 'alerting');
        })
      );

      await Promise.all(
        [...Array(NumErrorAlerts)].map(async () => {
          const activeAlertId = await createTestAlert(
            {
              rule_type_id: 'test.throw',
              schedule: { interval: '1s' },
            },
            'error'
          );
          objectRemover.add(Spaces.space1.id, activeAlertId, 'rule', 'alerting');
        })
      );

      // Adding delay to allow ES refresh cycle to run. Even when the waitForStatus
      // calls are successful, the call to aggregate may return stale totals if called
      // too early.
      await delay(1000);
      const reponse = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`
      );

      expect(reponse.status).to.eql(200);
      expect(reponse.body).to.eql({
        rule_enabled_status: {
          disabled: 0,
          enabled: 7,
        },
        rule_execution_status: {
          ok: NumOkAlerts,
          active: NumActiveAlerts,
          error: NumErrorAlerts,
          pending: 0,
          unknown: 0,
          warning: 0,
        },
        rule_muted_status: {
          muted: 0,
          unmuted: 7,
        },
      });
    });

    describe('legacy', () => {
      it('should aggregate alert status totals', async () => {
        const NumOkAlerts = 4;
        const NumActiveAlerts = 1;
        const NumErrorAlerts = 2;

        await Promise.all(
          [...Array(NumOkAlerts)].map(async () => {
            const okAlertId = await createTestAlert(
              {
                rule_type_id: 'test.noop',
                schedule: { interval: '1s' },
              },
              'ok'
            );
            objectRemover.add(Spaces.space1.id, okAlertId, 'rule', 'alerting');
          })
        );

        await Promise.all(
          [...Array(NumActiveAlerts)].map(async () => {
            const activeAlertId = await createTestAlert(
              {
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '1s' },
                params: {
                  pattern: { instance: new Array(100).fill(true) },
                },
              },
              'active'
            );
            objectRemover.add(Spaces.space1.id, activeAlertId, 'rule', 'alerting');
          })
        );

        await Promise.all(
          [...Array(NumErrorAlerts)].map(async () => {
            const activeAlertId = await createTestAlert(
              {
                rule_type_id: 'test.throw',
                schedule: { interval: '1s' },
              },
              'error'
            );
            objectRemover.add(Spaces.space1.id, activeAlertId, 'rule', 'alerting');
          })
        );

        // Adding delay to allow ES refresh cycle to run. Even when the waitForStatus
        // calls are successful, the call to aggregate may return stale totals if called
        // too early.
        await delay(1000);
        const reponse = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerts/_aggregate`
        );

        expect(reponse.status).to.eql(200);
        expect(reponse.body).to.eql({
          alertExecutionStatus: {
            ok: NumOkAlerts,
            active: NumActiveAlerts,
            error: NumErrorAlerts,
            pending: 0,
            unknown: 0,
            warning: 0,
          },
          ruleEnabledStatus: {
            disabled: 0,
            enabled: 7,
          },
          ruleMutedStatus: {
            muted: 0,
            unmuted: 7,
          },
        });
      });
    });
  });

  const WaitForStatusIncrement = 500;

  async function waitForStatus(
    id: string,
    statuses: Set<string>,
    waitMillis: number = 10000
  ): Promise<Record<string, any>> {
    if (waitMillis < 0) {
      expect().fail(`waiting for alert ${id} statuses ${Array.from(statuses)} timed out`);
    }

    const response = await supertest.get(
      `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${id}`
    );
    expect(response.status).to.eql(200);

    const { execution_status: executionStatus } = response.body || {};
    const { status } = executionStatus || {};

    const message = `waitForStatus(${Array.from(statuses)}): got ${JSON.stringify(
      executionStatus
    )}`;

    if (statuses.has(status)) {
      return executionStatus;
    }

    // eslint-disable-next-line no-console
    console.log(`${message}, retrying`);

    await delay(WaitForStatusIncrement);
    return await waitForStatus(id, statuses, waitMillis - WaitForStatusIncrement);
  }

  async function delay(millis: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, millis));
  }

  async function createTestAlert(testAlertOverrides = {}, status: string) {
    const { body: createdAlert } = await supertest
      .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .send(getTestRuleData(testAlertOverrides))
      .expect(200);

    await waitForStatus(createdAlert.id, new Set([status]));
    return createdAlert.id;
  }
}
