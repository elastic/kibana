/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover, getEventLog } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createAggregateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  const getEventLogWithRetry = async (id: string) => {
    await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id,
        provider: 'alerting',
        actions: new Map([['execute', { equal: 1 }]]),
      });
    });
  };

  describe('aggregate', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('should aggregate when there are no alerts', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`)
        .set('kbn-xsrf', 'foo')
        .send({});

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
        rule_last_run_outcome: {
          succeeded: 0,
          warning: 0,
          failed: 0,
        },
        rule_muted_status: {
          muted: 0,
          unmuted: 0,
        },
        rule_snoozed_status: {
          snoozed: 0,
        },
        rule_tags: [],
      });
    });

    it('should aggregate alert status totals', async () => {
      const NumOkAlerts = 4;
      const NumActiveAlerts = 1;
      const NumErrorAlerts = 2;

      const okAlertIds: string[] = [];
      const activeAlertIds: string[] = [];
      const errorAlertIds: string[] = [];

      await Promise.all(
        [...Array(NumOkAlerts)].map(async () => {
          const okAlertId = await createTestAlert({
            rule_type_id: 'test.noop',
            schedule: { interval: '24h' },
          });
          okAlertIds.push(okAlertId);
          objectRemover.add(Spaces.space1.id, okAlertId, 'rule', 'alerting');
        })
      );

      await Promise.all(okAlertIds.map((id) => getEventLogWithRetry(id)));

      await Promise.all(
        [...Array(NumActiveAlerts)].map(async () => {
          const activeAlertId = await createTestAlert({
            rule_type_id: 'test.patternFiring',
            schedule: { interval: '24h' },
            params: {
              pattern: { instance: new Array(100).fill(true) },
            },
          });
          activeAlertIds.push(activeAlertId);
          objectRemover.add(Spaces.space1.id, activeAlertId, 'rule', 'alerting');
        })
      );

      await Promise.all(activeAlertIds.map((id) => getEventLogWithRetry(id)));

      await Promise.all(
        [...Array(NumErrorAlerts)].map(async () => {
          const errorAlertId = await createTestAlert({
            rule_type_id: 'test.throw',
            schedule: { interval: '24h' },
          });
          errorAlertIds.push(errorAlertId);
          objectRemover.add(Spaces.space1.id, errorAlertId, 'rule', 'alerting');
        })
      );

      await Promise.all(errorAlertIds.map((id) => getEventLogWithRetry(id)));

      await retry.try(async () => {
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`)
          .set('kbn-xsrf', 'foo')
          .send({});

        expect(response.status).to.eql(200);
        expect(response.body).to.eql({
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
          rule_last_run_outcome: {
            succeeded: 5,
            warning: 0,
            failed: 2,
          },
          rule_muted_status: {
            muted: 0,
            unmuted: 7,
          },
          rule_snoozed_status: {
            snoozed: 0,
          },
          rule_tags: ['foo'],
        });
      });
    });

    it('should aggregate only filtered rules by rule type IDs', async () => {
      const NumOkAlerts = 4;
      const NumActiveAlerts = 1;
      const NumErrorAlerts = 2;

      const okAlertIds: string[] = [];
      const activeAlertIds: string[] = [];
      const errorAlertIds: string[] = [];

      await Promise.all(
        [...Array(NumOkAlerts)].map(async () => {
          const okAlertId = await createTestAlert({
            rule_type_id: 'test.noop',
            schedule: { interval: '24h' },
          });
          okAlertIds.push(okAlertId);
          objectRemover.add(Spaces.space1.id, okAlertId, 'rule', 'alerting');
        })
      );

      await Promise.all(okAlertIds.map((id) => getEventLogWithRetry(id)));

      await Promise.all(
        [...Array(NumActiveAlerts)].map(async () => {
          const activeAlertId = await createTestAlert({
            rule_type_id: 'test.patternFiring',
            schedule: { interval: '24h' },
            params: {
              pattern: { instance: new Array(100).fill(true) },
            },
          });
          activeAlertIds.push(activeAlertId);
          objectRemover.add(Spaces.space1.id, activeAlertId, 'rule', 'alerting');
        })
      );

      await Promise.all(activeAlertIds.map((id) => getEventLogWithRetry(id)));

      await Promise.all(
        [...Array(NumErrorAlerts)].map(async () => {
          const errorAlertId = await createTestAlert({
            rule_type_id: 'test.throw',
            schedule: { interval: '24h' },
          });
          errorAlertIds.push(errorAlertId);
          objectRemover.add(Spaces.space1.id, errorAlertId, 'rule', 'alerting');
        })
      );

      await Promise.all(errorAlertIds.map((id) => getEventLogWithRetry(id)));

      await retry.try(async () => {
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`)
          .set('kbn-xsrf', 'foo')
          .send({ rule_type_ids: ['test.noop'] });

        expect(response.status).to.eql(200);
        expect(response.body).to.eql({
          rule_enabled_status: {
            disabled: 0,
            enabled: 4,
          },
          rule_execution_status: {
            ok: NumOkAlerts,
            active: 0,
            error: 0,
            pending: 0,
            unknown: 0,
            warning: 0,
          },
          rule_last_run_outcome: {
            succeeded: 4,
            warning: 0,
            failed: 0,
          },
          rule_muted_status: {
            muted: 0,
            unmuted: 4,
          },
          rule_snoozed_status: {
            snoozed: 0,
          },
          rule_tags: ['foo'],
        });
      });
    });

    it('should aggregate only filtered rules by consumer', async () => {
      const NumOkAlerts = 4;
      const NumActiveAlerts = 1;
      const NumErrorAlerts = 2;

      const okAlertIds: string[] = [];
      const activeAlertIds: string[] = [];
      const errorAlertIds: string[] = [];

      await Promise.all(
        [...Array(NumOkAlerts)].map(async () => {
          const okAlertId = await createTestAlert({
            rule_type_id: 'test.restricted-noop',
            schedule: { interval: '24h' },
            consumer: 'alertsRestrictedFixture',
          });
          okAlertIds.push(okAlertId);
          objectRemover.add(Spaces.space1.id, okAlertId, 'rule', 'alerting');
        })
      );

      await Promise.all(okAlertIds.map((id) => getEventLogWithRetry(id)));

      await Promise.all(
        [...Array(NumActiveAlerts)].map(async () => {
          const activeAlertId = await createTestAlert({
            rule_type_id: 'test.patternFiring',
            schedule: { interval: '24h' },
            params: {
              pattern: { instance: new Array(100).fill(true) },
            },
          });
          activeAlertIds.push(activeAlertId);
          objectRemover.add(Spaces.space1.id, activeAlertId, 'rule', 'alerting');
        })
      );

      await Promise.all(activeAlertIds.map((id) => getEventLogWithRetry(id)));

      await Promise.all(
        [...Array(NumErrorAlerts)].map(async () => {
          const errorAlertId = await createTestAlert({
            rule_type_id: 'test.throw',
            schedule: { interval: '24h' },
          });
          errorAlertIds.push(errorAlertId);
          objectRemover.add(Spaces.space1.id, errorAlertId, 'rule', 'alerting');
        })
      );

      await Promise.all(errorAlertIds.map((id) => getEventLogWithRetry(id)));

      await retry.try(async () => {
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`)
          .set('kbn-xsrf', 'foo')
          .send({ consumers: ['alertsFixture'] });

        expect(response.status).to.eql(200);
        expect(response.body).to.eql({
          rule_execution_status: {
            error: NumErrorAlerts,
            active: NumActiveAlerts,
            ok: 0,
            pending: 0,
            unknown: 0,
            warning: 0,
          },
          rule_last_run_outcome: { failed: 2, succeeded: 1, warning: 0 },
          rule_enabled_status: { enabled: 3, disabled: 0 },
          rule_muted_status: { muted: 0, unmuted: 3 },
          rule_snoozed_status: { snoozed: 0 },
          rule_tags: ['foo'],
        });
      });
    });

    describe('tags limit', () => {
      it('should be 50 be default', async () => {
        const numOfAlerts = 3;
        const numOfTagsPerAlert = 30;

        await Promise.all(
          [...Array(numOfAlerts)].map(async (_, alertIndex) => {
            const okAlertId = await createTestAlert({
              rule_type_id: 'test.noop',
              schedule: { interval: '24h' },
              tags: [...Array(numOfTagsPerAlert)].map(
                (__, i) => `tag-${i + numOfTagsPerAlert * alertIndex}`
              ),
            });
            objectRemover.add(Spaces.space1.id, okAlertId, 'rule', 'alerting');
          })
        );

        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`)
          .set('kbn-xsrf', 'foo')
          .send({});

        expect(response.body.rule_tags.length).to.eql(50);
      });
    });
  });

  async function createTestAlert(testAlertOverrides = {}) {
    const { body: createdAlert } = await supertest
      .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .send(getTestRuleData(testAlertOverrides))
      .expect(200);
    return createdAlert.id;
  }
}
