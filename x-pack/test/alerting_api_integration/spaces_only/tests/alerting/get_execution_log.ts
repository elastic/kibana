/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { Spaces } from '../../scenarios';
import {
  getUrlPrefix,
  ObjectRemover,
  getTestRuleData,
  getEventLog,
  ESTestIndexTool,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createGetExecutionLogTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  const dateStart = new Date(Date.now() - 600000).toISOString();

  describe('getExecutionLog', () => {
    const objectRemover = new ObjectRemover(supertest);

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });

    afterEach(() => objectRemover.removeAll());

    it(`handles non-existent rule`, async () => {
      await supertest
        .get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/internal/alerting/rule/1/_execution_log?date_start=${dateStart}`
        )
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: 'Saved object [alert/1] not found',
        });
    });

    it('gets execution log for rule with executions', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ schedule: { interval: '15s' } }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, 'alerting', new Map([['execute', { gte: 2 }]]));
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_execution_log?date_start=${dateStart}`
      );

      expect(response.status).to.eql(200);

      expect(response.body.total).to.eql(2);
      expect(response.body.totalErrors).to.eql(0);
      expect(response.body.errors).to.eql([]);

      const execLogs = response.body.data;
      expect(execLogs.length).to.eql(2);

      let previousTimestamp: string | null = null;
      for (const log of execLogs) {
        if (previousTimestamp) {
          // default sort is `desc` by timestamp
          expect(Date.parse(log.timestamp)).to.be.lessThan(Date.parse(previousTimestamp));
        }
        previousTimestamp = log.timstamp;
        expect(Date.parse(log.timestamp)).to.be.greaterThan(Date.parse(dateStart));
        expect(Date.parse(log.timestamp)).to.be.lessThan(Date.parse(new Date().toISOString()));

        expect(log.duration_ms).to.be.greaterThan(0);
        expect(log.schedule_delay_ms).to.be.greaterThan(0);
        expect(log.status).to.equal('success');
        expect(log.timed_out).to.equal(false);

        // no-op rule doesn't generate alerts
        expect(log.num_active_alerts).to.equal(0);
        expect(log.num_new_alerts).to.equal(0);
        expect(log.num_recovered_alerts).to.equal(0);
        expect(log.num_triggered_actions).to.equal(0);
        expect(log.num_succeeded_actions).to.equal(0);
        expect(log.num_errored_actions).to.equal(0);

        // no-op rule doesn't query ES
        expect(log.total_search_duration_ms).to.equal(0);
        expect(log.es_search_duration_ms).to.equal(0);
      }
    });

    it('gets execution log for rule with no executions', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ schedule: { interval: '15s' } }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_execution_log?date_start=${dateStart}`
      );

      expect(response.status).to.eql(200);

      expect(response.body.total).to.eql(0);
      expect(response.body.data).to.eql([]);
      expect(response.body.totalErrors).to.eql(0);
      expect(response.body.errors).to.eql([]);
    });

    it('gets execution log for rule that performs ES searches', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.multipleSearches',
            params: {
              numSearches: 2,
              delay: `2s`,
            },
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, 'alerting', new Map([['execute', { gte: 1 }]]));
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_execution_log?date_start=${dateStart}`
      );

      expect(response.status).to.eql(200);

      expect(response.body.total).to.eql(1);
      expect(response.body.totalErrors).to.eql(0);
      expect(response.body.errors).to.eql([]);

      const execLogs = response.body.data;
      expect(execLogs.length).to.eql(1);

      for (const log of execLogs) {
        expect(log.duration_ms).to.be.greaterThan(0);
        expect(log.schedule_delay_ms).to.be.greaterThan(0);
        expect(log.status).to.equal('success');
        expect(log.timed_out).to.equal(false);

        // no-op rule doesn't generate alerts
        expect(log.num_active_alerts).to.equal(0);
        expect(log.num_new_alerts).to.equal(0);
        expect(log.num_recovered_alerts).to.equal(0);
        expect(log.num_triggered_actions).to.equal(0);
        expect(log.num_succeeded_actions).to.equal(0);
        expect(log.num_errored_actions).to.equal(0);

        // rule executes 2 searches with delay of 2 seconds each
        // setting compare threshold lower to avoid flakiness
        expect(log.total_search_duration_ms).to.be.greaterThan(2000);
        expect(log.es_search_duration_ms).to.be.greaterThan(2000);
      }
    });

    it('gets execution log for rule that errors', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.throw',
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, 'alerting', new Map([['execute', { gte: 1 }]]));
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_execution_log?date_start=${dateStart}`
      );

      expect(response.status).to.eql(200);

      expect(response.body.total).to.eql(1);

      const execLogs = response.body.data;
      expect(execLogs.length).to.eql(1);

      for (const log of execLogs) {
        expect(log.status).to.equal('failure');
        expect(log.timed_out).to.equal(false);
      }

      expect(response.body.totalErrors).to.eql(1);
      expect(response.body.errors.length).to.eql(1);

      for (const errors of response.body.errors) {
        expect(errors.type).to.equal('alerting');
        expect(errors.message).to.equal(
          `rule execution failure: test.throw:${createdRule.id}: 'abc' - this alert is intended to fail`
        );
      }
    });

    it('gets execution log for rule that times out', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternLongRunning',
            params: {
              pattern: [true, true, true, true],
            },
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, 'alerting', new Map([['execute', { gte: 1 }]]));
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_execution_log?date_start=${dateStart}`
      );

      expect(response.status).to.eql(200);

      expect(response.body.total).to.eql(1);
      expect(response.body.totalErrors).to.eql(0);
      expect(response.body.errors).to.eql([]);

      const execLogs = response.body.data;
      expect(execLogs.length).to.eql(1);

      for (const log of execLogs) {
        expect(log.status).to.equal('success');
        expect(log.timed_out).to.equal(true);
      }
    });

    it('gets execution log for rule that triggers actions', async () => {
      const { body: createdConnector } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'noop connector',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdConnector.id, 'action', 'actions');
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.cumulative-firing',
            actions: [
              {
                id: createdConnector.id,
                group: 'default',
                params: {},
              },
            ],
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, 'alerting', new Map([['execute', { gte: 1 }]]));
      await waitForEvents(createdRule.id, 'actions', new Map([['execute', { gte: 1 }]]));
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_execution_log?date_start=${dateStart}`
      );

      expect(response.status).to.eql(200);

      expect(response.body.total).to.eql(1);
      expect(response.body.totalErrors).to.eql(0);
      expect(response.body.errors).to.eql([]);

      const execLogs = response.body.data;
      expect(execLogs.length).to.eql(1);

      for (const log of execLogs) {
        expect(log.status).to.equal('success');

        expect(log.num_active_alerts).to.equal(1);
        expect(log.num_new_alerts).to.equal(1);
        expect(log.num_recovered_alerts).to.equal(0);
        expect(log.num_triggered_actions).to.equal(1);
        expect(log.num_succeeded_actions).to.equal(1);
        expect(log.num_errored_actions).to.equal(0);
      }
    });

    it('gets execution log for rule that has failed actions', async () => {
      const { body: createdConnector } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'connector that throws',
          connector_type_id: 'test.throw',
          config: {},
          secrets: {},
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdConnector.id, 'action', 'actions');
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.cumulative-firing',
            actions: [
              {
                id: createdConnector.id,
                group: 'default',
                params: {},
              },
            ],
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, 'alerting', new Map([['execute', { gte: 1 }]]));
      await waitForEvents(createdRule.id, 'actions', new Map([['execute', { gte: 1 }]]));
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_execution_log?date_start=${dateStart}`
      );

      expect(response.status).to.eql(200);

      expect(response.body.total).to.eql(1);

      const execLogs = response.body.data;
      expect(execLogs.length).to.eql(1);

      for (const log of execLogs) {
        expect(log.status).to.equal('success');

        expect(log.num_active_alerts).to.equal(1);
        expect(log.num_new_alerts).to.equal(1);
        expect(log.num_recovered_alerts).to.equal(0);
        expect(log.num_triggered_actions).to.equal(1);
        expect(log.num_succeeded_actions).to.equal(0);
        expect(log.num_errored_actions).to.equal(1);
      }

      expect(response.body.totalErrors).to.eql(1);
      expect(response.body.errors.length).to.eql(1);

      for (const errors of response.body.errors) {
        expect(errors.type).to.equal('actions');
        expect(errors.message).to.equal(
          `action execution failure: test.throw:${createdConnector.id}: connector that throws - an error occurred while running the action executor: this action is intended to fail`
        );
      }
    });

    it('handles date_end if specified', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ schedule: { interval: '10s' } }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, 'alerting', new Map([['execute', { gte: 2 }]]));

      // set the date end to date start - should filter out all execution logs
      const earlierDateStart = new Date(new Date(dateStart).getTime() - 900000).toISOString();
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_execution_log?date_start=${earlierDateStart}&date_end=${dateStart}`
      );

      expect(response.status).to.eql(200);

      expect(response.body.total).to.eql(0);
      expect(response.body.data.length).to.eql(0);
      expect(response.body.totalErrors).to.eql(0);
      expect(response.body.errors.length).to.eql(0);
    });

    it('handles sort query parameter', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ schedule: { interval: '5s' } }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, 'alerting', new Map([['execute', { gte: 3 }]]));
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_execution_log?date_start=${dateStart}&sort=[{"timestamp":{"order":"asc"}}]`
      );

      expect(response.status).to.eql(200);

      expect(response.body.total).to.eql(3);
      expect(response.body.totalErrors).to.eql(0);
      expect(response.body.errors).to.eql([]);

      const execLogs = response.body.data;
      expect(execLogs.length).to.eql(3);

      let previousTimestamp: string | null = null;
      for (const log of execLogs) {
        if (previousTimestamp) {
          // sorting by `asc` timestamp
          expect(Date.parse(log.timestamp)).to.be.greaterThan(Date.parse(previousTimestamp));
        }
        previousTimestamp = log.timstamp;
      }
    });

    it(`handles invalid date_start`, async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ schedule: { interval: '10s' } }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, 'alerting', new Map([['execute', { gte: 2 }]]));
      await supertest
        .get(
          `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
            createdRule.id
          }/_execution_log?date_start=X0X0-08-08T08:08:08.008Z`
        )
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid date for parameter dateStart: "X0X0-08-08T08:08:08.008Z"',
        });
    });
  });

  async function waitForEvents(
    id: string,
    provider: string,
    actions: Map<
      string,
      {
        gte: number;
      }
    >
  ) {
    await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id,
        provider,
        actions,
      });
    });
  }
}
