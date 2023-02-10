/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios, SuperuserAtSpace1 } from '../../../scenarios';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';

const getDefaultRules = (response: any) => ({
  id: response.body.rules[0].id,
  apiKey: response.body.rules[0].apiKey,
  notifyWhen: 'onThrottleInterval',
  enabled: true,
  name: 'abc',
  tags: ['foo'],
  consumer: 'alertsFixture',
  throttle: '1m',
  alertTypeId: 'test.noop',
  apiKeyOwner: response.body.rules[0].apiKeyOwner,
  createdBy: 'elastic',
  updatedBy: response.body.rules[0].updatedBy,
  muteAll: false,
  mutedInstanceIds: [],
  schedule: { interval: '1m' },
  actions: [],
  params: {},
  running: false,
  snoozeSchedule: [],
  updatedAt: response.body.rules[0].updatedAt,
  createdAt: response.body.rules[0].createdAt,
  scheduledTaskId: response.body.rules[0].scheduledTaskId,
  executionStatus: response.body.rules[0].executionStatus,
  monitoring: response.body.rules[0].monitoring,
  ...(response.body.rules[0].nextRun ? { nextRun: response.body.rules[0].nextRun } : {}),
  ...(response.body.rules[0].lastRun ? { lastRun: response.body.rules[0].lastRun } : {}),
});

const getThreeRules = (response: any) => {
  const rules: any[] = [];
  for (let i = 0; i < 3; i++) {
    rules.push({
      id: response.body.rules[i].id,
      apiKey: response.body.rules[i].apiKey,
      notifyWhen: 'onThrottleInterval',
      enabled: true,
      name: 'abc',
      tags: ['multiple-rules-delete'],
      consumer: 'alertsFixture',
      throttle: '1m',
      alertTypeId: 'test.noop',
      apiKeyOwner: response.body.rules[i].apiKeyOwner,
      createdBy: 'elastic',
      updatedBy: response.body.rules[i].updatedBy,
      muteAll: false,
      mutedInstanceIds: [],
      schedule: { interval: '1m' },
      actions: [],
      params: {},
      running: false,
      snoozeSchedule: [],
      updatedAt: response.body.rules[i].updatedAt,
      createdAt: response.body.rules[i].createdAt,
      scheduledTaskId: response.body.rules[i].scheduledTaskId,
      executionStatus: response.body.rules[i].executionStatus,
      monitoring: response.body.rules[i].monitoring,
      ...(response.body.rules[i].nextRun ? { nextRun: response.body.rules[i].nextRun } : {}),
      ...(response.body.rules[i].lastRun ? { lastRun: response.body.rules[i].lastRun } : {}),
    });
  }
  return rules;
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('bulkDelete', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    const getScheduledTask = async (id: string) => {
      return await es.get({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
    };

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;

      describe(scenario.id, () => {
        afterEach(() => objectRemover.removeAll());
        it('should handle bulk delete of one rule appropriately based on id', async () => {
          const { body: createdRule1 } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);

          const response = await supertestWithoutAuth
            .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_delete`)
            .set('kbn-xsrf', 'foo')
            .send({ ids: [createdRule1.id] })
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              objectRemover.add(space.id, createdRule1.id, 'rule', 'alerting');
              // Ensure task still exists
              await getScheduledTask(createdRule1.scheduled_task_id);
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to bulkDelete a "test.noop" rule for "alertsFixture"',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              objectRemover.add(space.id, createdRule1.id, 'rule', 'alerting');
              // Ensure task still exists
              await getScheduledTask(createdRule1.scheduled_task_id);
              break;
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                rules: [getDefaultRules(response)],
                errors: [],
                total: 1,
                taskIdsFailedToBeDeleted: [],
              });
              expect(response.statusCode).to.eql(200);
              try {
                await getScheduledTask(createdRule1.scheduled_task_id);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.meta.statusCode).to.eql(404);
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle bulk delete of one rule appropriately based on id  when consumer is the same as producer', async () => {
          const { body: createdRule1 } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.restricted-noop',
                consumer: 'alertsRestrictedFixture',
              })
            )
            .expect(200);

          const response = await supertestWithoutAuth
            .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_delete`)
            .set('kbn-xsrf', 'foo')
            .send({ ids: [createdRule1.id] })
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              objectRemover.add(space.id, createdRule1.id, 'rule', 'alerting');
              // Ensure task still exists
              await getScheduledTask(createdRule1.scheduled_task_id);
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message:
                  'Unauthorized to bulkDelete a "test.restricted-noop" rule for "alertsRestrictedFixture"',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              objectRemover.add(space.id, createdRule1.id, 'rule', 'alerting');
              // Ensure task still exists
              await getScheduledTask(createdRule1.scheduled_task_id);
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: 'No rules found for bulk delete',
              });
              expect(response.statusCode).to.eql(400);
              objectRemover.add(space.id, createdRule1.id, 'rule', 'alerting');
              // Ensure task still exists
              await getScheduledTask(createdRule1.scheduled_task_id);
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                rules: [
                  {
                    ...getDefaultRules(response),
                    alertTypeId: 'test.restricted-noop',
                    consumer: 'alertsRestrictedFixture',
                  },
                ],
                errors: [],
                total: 1,
                taskIdsFailedToBeDeleted: [],
              });
              expect(response.statusCode).to.eql(200);
              try {
                await getScheduledTask(createdRule1.scheduled_task_id);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.meta.statusCode).to.eql(404);
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle delete alert request appropriately when consumer is not the producer', async () => {
          const { body: createdRule1 } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.restricted-noop',
                consumer: 'alertsFixture',
              })
            )
            .expect(200);

          const response = await supertestWithoutAuth
            .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_delete`)
            .set('kbn-xsrf', 'foo')
            .send({ ids: [createdRule1.id] })
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              objectRemover.add(space.id, createdRule1.id, 'rule', 'alerting');
              // Ensure task still exists
              await getScheduledTask(createdRule1.scheduled_task_id);
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'global_read at space1':
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: 'No rules found for bulk delete',
              });
              expect(response.statusCode).to.eql(400);
              objectRemover.add(space.id, createdRule1.id, 'rule', 'alerting');
              // Ensure task still exists
              await getScheduledTask(createdRule1.scheduled_task_id);
              break;
            case 'superuser at space1':
              expect(response.body).to.eql({
                rules: [{ ...getDefaultRules(response), alertTypeId: 'test.restricted-noop' }],
                errors: [],
                total: 1,
                taskIdsFailedToBeDeleted: [],
              });
              expect(response.statusCode).to.eql(200);
              try {
                await getScheduledTask(createdRule1.scheduled_task_id);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.meta.statusCode).to.eql(404);
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle delete alert request appropriately when consumer is "alerts"', async () => {
          const { body: createdRule1 } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.noop',
                consumer: 'alerts',
              })
            )
            .expect(200);

          const response = await supertestWithoutAuth
            .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_delete`)
            .set('kbn-xsrf', 'foo')
            .send({ ids: [createdRule1.id] })
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              objectRemover.add(space.id, createdRule1.id, 'rule', 'alerting');
              // Ensure task still exists
              await getScheduledTask(createdRule1.scheduled_task_id);
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to bulkDelete a "test.noop" rule by "alertsFixture"',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              objectRemover.add(space.id, createdRule1.id, 'rule', 'alerting');
              // Ensure task still exists
              await getScheduledTask(createdRule1.scheduled_task_id);
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                rules: [{ ...getDefaultRules(response), consumer: 'alerts' }],
                errors: [],
                total: 1,
                taskIdsFailedToBeDeleted: [],
              });
              expect(response.statusCode).to.eql(200);
              try {
                await getScheduledTask(createdRule1.scheduled_task_id);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.meta.statusCode).to.eql(404);
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle bulk delete of several rules ids appropriately based on ids', async () => {
          const rules = await Promise.all(
            Array.from({ length: 3 }).map(() =>
              supertest
                .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
                .set('kbn-xsrf', 'foo')
                .send(getTestRuleData({ tags: ['multiple-rules-delete'] }))
                .expect(200)
            )
          );

          const response = await supertestWithoutAuth
            .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_delete`)
            .set('kbn-xsrf', 'foo')
            .send({ ids: rules.map((rule) => rule.body.id) })
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              await Promise.all(
                rules.map((rule) => {
                  objectRemover.add(space.id, rule.body.id, 'rule', 'alerting');
                  return getScheduledTask(rule.body.scheduled_task_id);
                })
              );
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to bulkDelete a "test.noop" rule for "alertsFixture"',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              await Promise.all(
                rules.map((rule) => {
                  objectRemover.add(space.id, rule.body.id, 'rule', 'alerting');
                  return getScheduledTask(rule.body.scheduled_task_id);
                })
              );
              break;
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                rules: getThreeRules(response),
                errors: [],
                total: 3,
                taskIdsFailedToBeDeleted: [],
              });
              expect(response.statusCode).to.eql(200);
              for (const rule of rules) {
                try {
                  await getScheduledTask(rule.body.scheduled_task_id);
                  throw new Error('Should have removed scheduled task');
                } catch (e) {
                  expect(e.meta.statusCode).to.eql(404);
                }
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle bulk delete of several rules ids appropriately based on filter', async () => {
          const rules = await Promise.all(
            Array.from({ length: 3 }).map(() =>
              supertest
                .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
                .set('kbn-xsrf', 'foo')
                .send(getTestRuleData({ tags: ['multiple-rules-delete'] }))
                .expect(200)
            )
          );

          const response = await supertestWithoutAuth
            .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_delete`)
            .set('kbn-xsrf', 'foo')
            .send({ filter: `alert.attributes.tags: "multiple-rules-delete"` })
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              await Promise.all(
                rules.map((rule) => {
                  objectRemover.add(space.id, rule.body.id, 'rule', 'alerting');
                  return getScheduledTask(rule.body.scheduled_task_id);
                })
              );
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to bulkDelete a "test.noop" rule for "alertsFixture"',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              await Promise.all(
                rules.map((rule) => {
                  objectRemover.add(space.id, rule.body.id, 'rule', 'alerting');
                  return getScheduledTask(rule.body.scheduled_task_id);
                })
              );
              break;
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                rules: getThreeRules(response),
                errors: [],
                total: 3,
                taskIdsFailedToBeDeleted: [],
              });
              expect(response.statusCode).to.eql(200);
              for (const rule of rules) {
                try {
                  await getScheduledTask(rule.body.scheduled_task_id);
                  throw new Error('Should have removed scheduled task');
                } catch (e) {
                  expect(e.meta.statusCode).to.eql(404);
                }
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should not delete rule from another space', async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix('other')}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);

          const response = await supertestWithoutAuth
            .patch(`${getUrlPrefix('other')}/internal/alerting/rules/_bulk_delete`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({ ids: [createdRule.id] });

          switch (scenario.id) {
            // This superuser has more privileges that we think
            case 'superuser at space1':
              expect(response.body).to.eql({
                rules: [getDefaultRules(response)],
                errors: [],
                total: 1,
                taskIdsFailedToBeDeleted: [],
              });
              expect(response.statusCode).to.eql(200);
              try {
                await getScheduledTask(createdRule.scheduled_task_id);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.meta.statusCode).to.eql(404);
              }
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to bulkDelete a "test.noop" rule for "alertsFixture"',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              objectRemover.add('other', createdRule.id, 'rule', 'alerting');
              await getScheduledTask(createdRule.scheduled_task_id);
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              expect(response.statusCode).to.eql(403);
              objectRemover.add('other', createdRule.id, 'rule', 'alerting');
              await getScheduledTask(createdRule.scheduled_task_id);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    describe('Validation tests', () => {
      const { user, space } = SuperuserAtSpace1;
      it('should throw an error when bulk delete of rules when both ids and filter supplied in payload', async () => {
        const { body: createdRule1 } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData({ tags: ['foo'] }))
          .expect(200);

        const response = await supertestWithoutAuth
          .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_delete`)
          .set('kbn-xsrf', 'foo')
          .send({ filter: 'fake_filter', ids: [createdRule1.id] })
          .auth(user.username, user.password);

        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql(
          "Both 'filter' and 'ids' are supplied. Define either 'ids' or 'filter' properties in method's arguments"
        );
        objectRemover.add(space.id, createdRule1.id, 'rule', 'alerting');
        await getScheduledTask(createdRule1.scheduled_task_id);
      });

      it('should return an error if we pass more than 1000 ids', async () => {
        const ids = [...Array(1001)].map((_, i) => `rule${i}`);

        const response = await supertestWithoutAuth
          .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_delete`)
          .set('kbn-xsrf', 'foo')
          .send({ ids })
          .auth(user.username, user.password);

        expect(response.body).to.eql({
          error: 'Bad Request',
          message: '[request body.ids]: array size is [1001], but cannot be greater than [1000]',
          statusCode: 400,
        });
      });

      it('should return an error if we do not pass any arguments', async () => {
        await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        const response = await supertestWithoutAuth
          .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_delete`)
          .set('kbn-xsrf', 'foo')
          .send({})
          .auth(user.username, user.password);

        expect(response.body).to.eql({
          error: 'Bad Request',
          message: "Either 'ids' or 'filter' property in method's arguments should be provided",
          statusCode: 400,
        });
      });

      it('should return an error if we pass empty ids array', async () => {
        const response = await supertestWithoutAuth
          .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_delete`)
          .set('kbn-xsrf', 'foo')
          .send({ ids: [] })
          .auth(user.username, user.password);

        expect(response.body).to.eql({
          error: 'Bad Request',
          message: '[request body.ids]: array size is [0], but cannot be smaller than [1]',
          statusCode: 400,
        });
      });

      it('should return an error if we pass empty string instead of fiter', async () => {
        const response = await supertestWithoutAuth
          .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_delete`)
          .set('kbn-xsrf', 'foo')
          .send({ filter: '' })
          .auth(user.username, user.password);

        expect(response.body).to.eql({
          error: 'Bad Request',
          message: "Either 'ids' or 'filter' property in method's arguments should be provided",
          statusCode: 400,
        });
      });
    });
  });
};
