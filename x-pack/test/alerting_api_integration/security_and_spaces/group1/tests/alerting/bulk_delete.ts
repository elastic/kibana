/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';

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
              expect(response.body).to.eql({ errors: [], total: 1 });
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
              expect(response.body).to.eql({ errors: [], total: 1 });
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
              expect(response.body).to.eql({ errors: [], total: 1 });
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
              expect(response.body).to.eql({ errors: [], total: 1 });
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
                .send(getTestRuleData({ tags: ['multiple-rules-edit'] }))
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
              expect(response.body).to.eql({ errors: [], total: 3 });
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
              expect(response.body).to.eql({ errors: [], total: 3 });
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

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body.message).to.eql(
                "Both 'filter' and 'ids' are supplied. Define either 'ids' or 'filter' properties in method arguments"
              );
              objectRemover.add(space.id, createdRule1.id, 'rule', 'alerting');
              await getScheduledTask(createdRule1.scheduled_task_id);
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
              expect(response.body).to.eql({ errors: [], total: 1 });
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

        it('should return an error if we pass more than 1000 ids', async () => {
          const ids = [...Array(1001)].map((_, i) => `rule${i}`);

          const response = await supertestWithoutAuth
            .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_delete`)
            .set('kbn-xsrf', 'foo')
            .send({ ids })
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                error: 'Bad Request',
                message:
                  '[request body.ids]: array size is [1001], but cannot be greater than [1000]',
                statusCode: 400,
              });
              expect(response.statusCode).to.eql(400);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
};
