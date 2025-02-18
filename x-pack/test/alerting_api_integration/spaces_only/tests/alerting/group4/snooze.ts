/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import { Spaces } from '../../../scenarios';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  AlertUtils,
  checkAAD,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getEventLog,
} from '../../../../common/lib';

const NOW = new Date().toISOString();
const SNOOZE_SCHEDULE = {
  duration: 864000000,
  rRule: {
    dtstart: NOW,
    tzid: 'UTC',
    count: 1,
  },
};

// eslint-disable-next-line import/no-default-export
export default function createSnoozeRuleTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  const retry = getService('retry');

  describe('snooze', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    const alertUtils = new AlertUtils({ space: Spaces.space1, supertestWithoutAuth });

    describe('handle snooze rule request appropriately', function () {
      this.tags('skipFIPS');
      it('should handle snooze rule request appropriately', async () => {
        const { body: createdConnector } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'MY Connector',
            connector_type_id: 'test.noop',
            config: {},
            secrets: {},
          })
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdConnector.id, 'connector', 'actions');

        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
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

        const response = await alertUtils
          .getSnoozeRequest(createdRule.id)
          .send({ snooze_schedule: SNOOZE_SCHEDULE });

        expect(response.statusCode).to.eql(204);
        expect(response.body).to.eql('');
        const { body: updatedAlert } = await supertestWithoutAuth
          .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`)
          .set('kbn-xsrf', 'foo')
          .expect(200);
        expect(updatedAlert.snooze_schedule.length).to.eql(1);
        const { rRule, duration } = updatedAlert.snooze_schedule[0];
        expect(rRule.dtstart).to.eql(NOW);
        expect(duration).to.eql(SNOOZE_SCHEDULE.duration);
        expect(updatedAlert.mute_all).to.eql(false);
        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: Spaces.space1.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: createdRule.id,
        });
      });
    });

    describe('handle snooze rule request appropriately when duration is -1', function () {
      this.tags('skipFIPS');
      it('should handle snooze rule request appropriately when duration is -1', async () => {
        const { body: createdConnector } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'MY Connector',
            connector_type_id: 'test.noop',
            config: {},
            secrets: {},
          })
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdConnector.id, 'connector', 'actions');

        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
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

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          snooze_schedule: {
            ...SNOOZE_SCHEDULE,
            duration: -1,
          },
        });

        expect(response.statusCode).to.eql(204);
        expect(response.body).to.eql('');
        const { body: updatedAlert } = await supertestWithoutAuth
          .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`)
          .set('kbn-xsrf', 'foo')
          .expect(200);
        expect(updatedAlert.snooze_schedule).to.eql([]);
        expect(updatedAlert.mute_all).to.eql(true);
        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: Spaces.space1.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: createdRule.id,
        });
      });
    });

    it('should not trigger actions when snoozed', async () => {
      const { body: createdConnector, status: connStatus } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY Connector',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        });
      expect(connStatus).to.be(200);
      objectRemover.add(Spaces.space1.id, createdConnector.id, 'connector', 'actions');

      log.info('creating rule');
      const { body: createdRule, status: ruleStatus } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            name: 'should not trigger actions when snoozed',
            rule_type_id: 'test.patternFiring',
            schedule: { interval: '1s' },
            throttle: null,
            notify_when: 'onActiveAlert',
            params: {
              pattern: { instance: arrayOfTrues(100) },
            },
            actions: [
              {
                id: createdConnector.id,
                group: 'default',
                params: {},
              },
            ],
          })
        );
      expect(ruleStatus).to.be(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      // wait for an action to be triggered
      log.info('wait for rule to trigger an action');
      await getRuleEvents(createdRule.id);

      log.info('start snoozing');
      const now = new Date().toISOString();
      const snoozeSeconds = 10;
      const snoozeDuration = snoozeSeconds * 1000;
      await alertUtils.getSnoozeRequest(createdRule.id).send({
        snooze_schedule: {
          duration: snoozeDuration,
          rRule: {
            dtstart: now,
            tzid: 'UTC',
            count: 1,
          },
        },
      });

      // could be an action execution while calling snooze, so set snooze start
      // to a value that we know it will be in effect (after this call)
      const snoozeStartDate = new Date();

      // wait for 4 triggered actions - in case some fired before snooze went into effect
      log.info('wait for snoozing to end');
      const ruleEvents = await getRuleEvents(createdRule.id, 4);
      const snoozeStart = snoozeStartDate.valueOf();
      const snoozeEnd = snoozeStartDate.valueOf();
      let actionsBefore = 0;
      let actionsDuring = 0;
      let actionsAfter = 0;

      for (const event of ruleEvents) {
        const timestamp = event?.['@timestamp'];
        if (!timestamp) continue;

        const time = new Date(timestamp).valueOf();
        if (time < snoozeStart) {
          actionsBefore++;
        } else if (time > snoozeEnd) {
          actionsAfter++;
        } else {
          actionsDuring++;
        }
      }

      expect(actionsBefore).to.be.greaterThan(0, 'no actions triggered before snooze');
      expect(actionsAfter).to.be.greaterThan(0, 'no actions triggered after snooze');
      expect(actionsDuring).to.be(0);
    });

    describe('prevent more than 5 schedules from being added to a rule', function () {
      this.tags('skipFIPS');
      it('should prevent more than 5 schedules from being added to a rule', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        // Creating 5 snooze schedules, using Promise.all is very flaky, therefore
        // the schedules are being created 1 at a time
        await alertUtils
          .getSnoozeRequest(createdRule.id)
          .send({
            snooze_schedule: {
              ...SNOOZE_SCHEDULE,
              id: uuidv4(),
            },
          })
          .expect(204);
        await alertUtils
          .getSnoozeRequest(createdRule.id)
          .send({
            snooze_schedule: {
              ...SNOOZE_SCHEDULE,
              id: uuidv4(),
            },
          })
          .expect(204);
        await alertUtils
          .getSnoozeRequest(createdRule.id)
          .send({
            snooze_schedule: {
              ...SNOOZE_SCHEDULE,
              id: uuidv4(),
            },
          })
          .expect(204);

        await alertUtils
          .getSnoozeRequest(createdRule.id)
          .send({
            snooze_schedule: {
              ...SNOOZE_SCHEDULE,
              id: uuidv4(),
            },
          })
          .expect(204);

        await alertUtils
          .getSnoozeRequest(createdRule.id)
          .send({
            snooze_schedule: {
              ...SNOOZE_SCHEDULE,
              id: uuidv4(),
            },
          })
          .expect(204);

        // Adding the 6th snooze schedule, should fail
        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          snooze_schedule: {
            ...SNOOZE_SCHEDULE,
            id: uuidv4(),
          },
        });
        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql('Rule cannot have more than 5 snooze schedules');
      });
    });

    describe('clear the snooze after it expires', function () {
      this.tags('skipFIPS');
      it('should clear the snooze after it expires', async () => {
        const { body: createdConnector } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'MY Connector',
            connector_type_id: 'test.noop',
            config: {},
            secrets: {},
          })
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdConnector.id, 'connector', 'actions');

        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              name: 'should not trigger actions when snoozed',
              rule_type_id: 'test.patternFiring',
              schedule: { interval: '1s' },
              throttle: null,
              notify_when: 'onActiveAlert',
              params: {
                pattern: { instance: arrayOfTrues(100) },
              },
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

        const dateStart = new Date().toISOString();
        const snooze = {
          ...SNOOZE_SCHEDULE,
          rRule: {
            ...SNOOZE_SCHEDULE.rRule,
            // updating the dtstart to the current time because otherwise the snooze might be over already
            dtstart: dateStart,
          },
          duration: 3000,
        };

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          snooze_schedule: snooze,
        });

        expect(response.statusCode).to.eql(204);
        expect(response.body).to.eql('');

        await retry.try(async () => {
          const { body: updatedAlert } = await supertestWithoutAuth
            .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`)
            .set('kbn-xsrf', 'foo')
            .expect(200);
          expect(updatedAlert.snooze_schedule).to.eql([snooze]);
        });
        log.info('wait for snoozing to end');
        await retry.try(async () => {
          const { body: alertWithExpiredSnooze } = await supertestWithoutAuth
            .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`)
            .set('kbn-xsrf', 'foo')
            .expect(200);
          expect(alertWithExpiredSnooze.snooze_schedule).to.eql([]);
        });
        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: Spaces.space1.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: createdRule.id,
        });
      });
    });

    describe('validation', function () {
      this.tags('skipFIPS');
      it('should return 400 if the id is not in a valid format', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          snooze_schedule: {
            ...SNOOZE_SCHEDULE,
            id: 'invalid key',
          },
        });

        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql(
          `[request body.snooze_schedule.id]: Key must be lower case, a-z, 0-9, '_', and '-' are allowed`
        );
      });

      it('accepts a uuid as a key', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        await alertUtils
          .getSnoozeRequest(createdRule.id)
          .send({
            snooze_schedule: {
              ...SNOOZE_SCHEDULE,
              id: 'e58e2340-dba6-454c-8308-b2ca66a7cf7',
            },
          })
          .expect(204);
      });

      it('should return 400 if the timezone is not valid', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          snooze_schedule: {
            ...SNOOZE_SCHEDULE,
            rRule: { ...SNOOZE_SCHEDULE.rRule, tzid: 'invalid' },
          },
        });

        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql(
          '[request body.snooze_schedule.rRule.tzid]: string is not a valid timezone: invalid'
        );
      });

      it('should return 400 if the byweekday is not valid', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          snooze_schedule: {
            ...SNOOZE_SCHEDULE,
            rRule: { ...SNOOZE_SCHEDULE.rRule, byweekday: ['invalid'] },
          },
        });

        expect(response.statusCode).to.eql(400);
      });

      it('should return 400 if the bymonthday is not valid', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          snooze_schedule: {
            ...SNOOZE_SCHEDULE,
            rRule: { ...SNOOZE_SCHEDULE.rRule, bymonthday: [35] },
          },
        });

        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql(
          '[request body.snooze_schedule.rRule.bymonthday.0]: Value must be equal to or lower than [31].'
        );
      });

      it('should return 400 if the bymonth is not valid', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          snooze_schedule: {
            ...SNOOZE_SCHEDULE,
            rRule: { ...SNOOZE_SCHEDULE.rRule, bymonth: [14] },
          },
        });

        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql(
          '[request body.snooze_schedule.rRule.bymonth.0]: Value must be equal to or lower than [12].'
        );
      });
    });
  });

  async function getRuleEvents(id: string, minActions: number = 1) {
    return await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id,
        provider: 'alerting',
        actions: new Map([['execute-action', { gte: minActions }]]),
      });
    });
  }
}

function arrayOfTrues(length: number) {
  const result = [];
  for (let i = 0; i < length; i++) {
    result.push(true);
  }
  return result;
}
