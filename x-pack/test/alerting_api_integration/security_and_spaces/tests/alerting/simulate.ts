/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';
import { UserAtSpaceScenarios } from '../../scenarios';
import {
  getConsumerUnauthorizedErrorMessage,
  getUrlPrefix,
  ObjectRemover,
  ESTestIndexTool,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getDefaultAlwaysFiringAlertData } from '../../../common/lib/alert_utils';

// eslint-disable-next-line import/no-default-export
export default function createAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  // const authorizationIndex = '.kibana-test-authorization';

  describe('simulate', () => {
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
      // await es.indices.create({ index: authorizationIndex });
    });
    after(async () => {
      await esTestIndexTool.destroy();
      // await es.indices.delete({ index: authorizationIndex });
      await objectRemover.removeAll();
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle simulate alert request appropriately', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My action',
              connector_type_id: 'test.index-record',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            })
            .expect(200);
          objectRemover.add(space.id, createdAction.id, 'action', 'actions');

          const reference = `rule-simulation-${uuid.v4()}:${user.username}`;

          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alerting/_simulate_rule`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(getDefaultAlwaysFiringAlertData(reference, createdAction.id));

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage(
                  'create',
                  'test.always-firing',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to get actions`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              // console.log(JSON.stringify(response));
              expect(response.body).to.be.an('object');

              // wait for executor Alert Executor to be run, which means the underlying task is running
              await esTestIndexTool.waitForDocs('action:test.index-record', reference);

              // const searchResult = await esTestIndexTool.search(
              //   'action:test.index-record',
              //   reference
              // );
              // // @ts-expect-error doesnt handle total: number
              // expect(searchResult.body.hits.total.value).to.eql(1);
              // const indexedRecord = searchResult.body.hits.hits[0];
              // expect(indexedRecord._source).to.eql({
              //   params: {
              //     reference,
              //     index: ES_TEST_INDEX_NAME,
              //     message: 'Testing 123',
              //   },
              //   config: {
              //     unencrypted: `This value shouldn't get encrypted`,
              //   },
              //   secrets: {
              //     encrypted: 'This value should be encrypted',
              //   },
              //   reference,
              //   source: 'action:test.index-record',
              // });

              // await validateEventLog({
              //   spaceId: space.id,
              //   connectorId: createdAction.id,
              //   outcome: 'success',
              //   actionTypeId: 'test.index-record',
              //   message: `action executed: test.index-record:${createdAction.id}: My action`,
              // });

              // objectRemover.add(space.id, response.body.id, 'rule', 'alerting');
              // expect(response.body).to.eql({
              //   id: response.body.id,
              //   name: 'abc',
              //   tags: ['foo'],
              //   actions: [
              //     {
              //       id: createdAction.id,
              //       connector_type_id: createdAction.connector_type_id,
              //       group: 'default',
              //       params: {},
              //     },
              //   ],
              //   enabled: true,
              //   rule_type_id: 'test.always-firing',
              //   consumer: 'alertsFixture',
              //   params: {},
              //   created_by: user.username,
              //   schedule: { interval: '1m' },
              //   scheduled_task_id: response.body.scheduled_task_id,
              //   created_at: response.body.created_at,
              //   updated_at: response.body.updated_at,
              //   throttle: '1m',
              //   notify_when: 'onThrottleInterval',
              //   updated_by: user.username,
              //   api_key_owner: user.username,
              //   mute_all: false,
              //   muted_alert_ids: [],
              //   execution_status: response.body.execution_status,
              // });
              // expect(typeof response.body.scheduled_task_id).to.be('string');
              // expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
              // expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);

              // const taskRecord = await getScheduledTask(response.body.scheduled_task_id);
              // expect(taskRecord.type).to.eql('task');
              // expect(taskRecord.task.taskType).to.eql('alerting:test.always-firing');
              // expect(JSON.parse(taskRecord.task.params)).to.eql({
              //   alertId: response.body.id,
              //   spaceId: space.id,
              //   consumer: 'alertsFixture',
              // });
              // // Ensure AAD isn't broken
              // await checkAAD({
              //   supertest,
              //   spaceId: space.id,
              //   type: 'alert',
              //   id: response.body.id,
              // });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        // it.skip('should handle create alert request appropriately when consumer is the same as producer', async () => {
        //   const response = await supertestWithoutAuth
        //     .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        //     .set('kbn-xsrf', 'foo')
        //     .auth(user.username, user.password)
        //     .send(
        //       getSimulationTestRuleData({
        //         rule_type_id: 'test.restricted-noop',
        //         consumer: 'alertsRestrictedFixture',
        //       })
        //     );

        //   switch (scenario.id) {
        //     case 'no_kibana_privileges at space1':
        //     case 'global_read at space1':
        //     case 'space_1_all at space2':
        //     case 'space_1_all at space1':
        //     case 'space_1_all_alerts_none_actions at space1':
        //       expect(response.statusCode).to.eql(403);
        //       expect(response.body).to.eql({
        //         error: 'Forbidden',
        //         message: getConsumerUnauthorizedErrorMessage(
        //           'create',
        //           'test.restricted-noop',
        //           'alertsRestrictedFixture'
        //         ),
        //         statusCode: 403,
        //       });
        //       break;
        //     case 'superuser at space1':
        //     case 'space_1_all_with_restricted_fixture at space1':
        //       expect(response.statusCode).to.eql(200);
        //       objectRemover.add(space.id, response.body.id, 'rule', 'alerting');
        //       break;
        //     default:
        //       throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
        //   }
        // });

        // it.skip('should handle create alert request appropriately when consumer is not the producer', async () => {
        //   const response = await supertestWithoutAuth
        //     .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        //     .set('kbn-xsrf', 'foo')
        //     .auth(user.username, user.password)
        //     .send(
        //       getSimulationTestRuleData({
        //         rule_type_id: 'test.unrestricted-noop',
        //         consumer: 'alertsFixture',
        //       })
        //     );

        //   switch (scenario.id) {
        //     case 'no_kibana_privileges at space1':
        //     case 'global_read at space1':
        //     case 'space_1_all at space2':
        //       expect(response.statusCode).to.eql(403);
        //       expect(response.body).to.eql({
        //         error: 'Forbidden',
        //         message: getConsumerUnauthorizedErrorMessage(
        //           'create',
        //           'test.unrestricted-noop',
        //           'alertsFixture'
        //         ),
        //         statusCode: 403,
        //       });
        //       break;
        //     case 'space_1_all at space1':
        //     case 'space_1_all_alerts_none_actions at space1':
        //       expect(response.statusCode).to.eql(403);
        //       expect(response.body).to.eql({
        //         error: 'Forbidden',
        //         message: getProducerUnauthorizedErrorMessage(
        //           'create',
        //           'test.unrestricted-noop',
        //           'alertsRestrictedFixture'
        //         ),
        //         statusCode: 403,
        //       });
        //       break;
        //     case 'superuser at space1':
        //     case 'space_1_all_with_restricted_fixture at space1':
        //       expect(response.statusCode).to.eql(200);
        //       objectRemover.add(space.id, response.body.id, 'rule', 'alerting');
        //       break;
        //     default:
        //       throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
        //   }
        // });

        // it.skip('should handle create alert request appropriately when consumer is "alerts"', async () => {
        //   const response = await supertestWithoutAuth
        //     .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        //     .set('kbn-xsrf', 'foo')
        //     .auth(user.username, user.password)
        //     .send(
        //       getSimulationTestRuleData({
        //         rule_type_id: 'test.always-firing',
        //         consumer: 'alerts',
        //       })
        //     );

        //   switch (scenario.id) {
        //     case 'no_kibana_privileges at space1':
        //     case 'space_1_all at space2':
        //       expect(response.statusCode).to.eql(403);
        //       expect(response.body).to.eql({
        //         error: 'Forbidden',
        //         message: getConsumerUnauthorizedErrorMessage('create', 'test.always-firing', 'alerts'),
        //         statusCode: 403,
        //       });
        //       break;
        //     case 'global_read at space1':
        //       expect(response.statusCode).to.eql(403);
        //       expect(response.body).to.eql({
        //         error: 'Forbidden',
        //         message: getProducerUnauthorizedErrorMessage(
        //           'create',
        //           'test.always-firing',
        //           'alertsFixture'
        //         ),
        //         statusCode: 403,
        //       });
        //       break;
        //     case 'space_1_all at space1':
        //     case 'space_1_all_alerts_none_actions at space1':
        //     case 'superuser at space1':
        //     case 'space_1_all_with_restricted_fixture at space1':
        //       expect(response.statusCode).to.eql(200);
        //       objectRemover.add(space.id, response.body.id, 'rule', 'alerting');
        //       break;
        //     default:
        //       throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
        //   }
        // });

        // it.skip('should handle create alert request appropriately when consumer is unknown', async () => {
        //   const response = await supertestWithoutAuth
        //     .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        //     .set('kbn-xsrf', 'foo')
        //     .auth(user.username, user.password)
        //     .send(
        //       getSimulationTestRuleData({
        //         rule_type_id: 'test.always-firing',
        //         consumer: 'some consumer patrick invented',
        //       })
        //     );

        //   switch (scenario.id) {
        //     case 'no_kibana_privileges at space1':
        //     case 'global_read at space1':
        //     case 'space_1_all at space2':
        //     case 'space_1_all at space1':
        //     case 'space_1_all_alerts_none_actions at space1':
        //     case 'space_1_all_with_restricted_fixture at space1':
        //     case 'superuser at space1':
        //       expect(response.statusCode).to.eql(403);
        //       expect(response.body).to.eql({
        //         error: 'Forbidden',
        //         message: getConsumerUnauthorizedErrorMessage(
        //           'create',
        //           'test.always-firing',
        //           'some consumer patrick invented'
        //         ),
        //         statusCode: 403,
        //       });
        //       break;
        //     default:
        //       throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
        //   }
        // });

        // it.skip('should handle create alert request appropriately when an alert is disabled ', async () => {
        //   const response = await supertestWithoutAuth
        //     .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        //     .set('kbn-xsrf', 'foo')
        //     .auth(user.username, user.password)
        //     .send(getSimulationTestRuleData({ enabled: false }));

        //   switch (scenario.id) {
        //     case 'no_kibana_privileges at space1':
        //     case 'global_read at space1':
        //     case 'space_1_all at space2':
        //       expect(response.statusCode).to.eql(403);
        //       expect(response.body).to.eql({
        //         error: 'Forbidden',
        //         message: getConsumerUnauthorizedErrorMessage(
        //           'create',
        //           'test.always-firing',
        //           'alertsFixture'
        //         ),
        //         statusCode: 403,
        //       });
        //       break;
        //     case 'superuser at space1':
        //     case 'space_1_all at space1':
        //     case 'space_1_all_alerts_none_actions at space1':
        //     case 'space_1_all_with_restricted_fixture at space1':
        //       expect(response.statusCode).to.eql(200);
        //       objectRemover.add(space.id, response.body.id, 'rule', 'alerting');
        //       expect(response.body.scheduled_task_id).to.eql(undefined);
        //       break;
        //     default:
        //       throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
        //   }
        // });

        // it.skip('should handle create alert request appropriately when alert name has leading and trailing whitespaces', async () => {
        //   const response = await supertestWithoutAuth
        //     .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        //     .set('kbn-xsrf', 'foo')
        //     .auth(user.username, user.password)
        //     .send(
        //       getSimulationTestRuleData({
        //         name: ' leading and trailing whitespace ',
        //       })
        //     );

        //   switch (scenario.id) {
        //     case 'no_kibana_privileges at space1':
        //     case 'global_read at space1':
        //     case 'space_1_all at space2':
        //       expect(response.statusCode).to.eql(403);
        //       expect(response.body).to.eql({
        //         error: 'Forbidden',
        //         message: getConsumerUnauthorizedErrorMessage(
        //           'create',
        //           'test.always-firing',
        //           'alertsFixture'
        //         ),
        //         statusCode: 403,
        //       });
        //       break;
        //     case 'superuser at space1':
        //     case 'space_1_all at space1':
        //     case 'space_1_all_alerts_none_actions at space1':
        //     case 'space_1_all_with_restricted_fixture at space1':
        //       expect(response.statusCode).to.eql(200);
        //       expect(response.body.name).to.eql(' leading and trailing whitespace ');
        //       objectRemover.add(space.id, response.body.id, 'rule', 'alerting');
        //       break;
        //     default:
        //       throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
        //   }
        // });

        // it.skip('should handle create alert request appropriately when alert type is unregistered', async () => {
        //   const response = await supertestWithoutAuth
        //     .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        //     .set('kbn-xsrf', 'foo')
        //     .auth(user.username, user.password)
        //     .send(
        //       getSimulationTestRuleData({
        //         rule_type_id: 'test.unregistered-alert-type',
        //       })
        //     );

        //   switch (scenario.id) {
        //     case 'no_kibana_privileges at space1':
        //     case 'global_read at space1':
        //     case 'space_1_all at space2':
        //     case 'space_1_all at space1':
        //     case 'space_1_all_alerts_none_actions at space1':
        //     case 'space_1_all_with_restricted_fixture at space1':
        //     case 'superuser at space1':
        //       expect(response.statusCode).to.eql(400);
        //       expect(response.body).to.eql({
        //         statusCode: 400,
        //         error: 'Bad Request',
        //         message: 'Rule type "test.unregistered-alert-type" is not registered.',
        //       });
        //       break;
        //     default:
        //       throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
        //   }
        // });

        // it.skip('should handle create alert request appropriately when payload is empty and invalid', async () => {
        //   const response = await supertestWithoutAuth
        //     .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        //     .set('kbn-xsrf', 'foo')
        //     .auth(user.username, user.password)
        //     .send({});

        //   switch (scenario.id) {
        //     case 'no_kibana_privileges at space1':
        //     case 'global_read at space1':
        //     case 'space_1_all at space2':
        //     case 'superuser at space1':
        //     case 'space_1_all at space1':
        //     case 'space_1_all_alerts_none_actions at space1':
        //     case 'space_1_all_with_restricted_fixture at space1':
        //       expect(response.statusCode).to.eql(400);
        //       expect(response.body).to.eql({
        //         statusCode: 400,
        //         error: 'Bad Request',
        //         message: '[request body.name]: expected value of type [string] but got [undefined]',
        //       });
        //       break;
        //     default:
        //       throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
        //   }
        // });

        // it.skip(`should handle create alert request appropriately when params isn't valid`, async () => {
        //   const response = await supertestWithoutAuth
        //     .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        //     .set('kbn-xsrf', 'foo')
        //     .auth(user.username, user.password)
        //     .send(
        //       getSimulationTestRuleData({
        //         rule_type_id: 'test.validation',
        //       })
        //     );

        //   switch (scenario.id) {
        //     case 'no_kibana_privileges at space1':
        //     case 'global_read at space1':
        //     case 'space_1_all at space2':
        //       expect(response.statusCode).to.eql(403);
        //       expect(response.body).to.eql({
        //         error: 'Forbidden',
        //         message: getConsumerUnauthorizedErrorMessage(
        //           'create',
        //           'test.validation',
        //           'alertsFixture'
        //         ),
        //         statusCode: 403,
        //       });
        //       break;
        //     case 'superuser at space1':
        //     case 'space_1_all at space1':
        //     case 'space_1_all_alerts_none_actions at space1':
        //     case 'space_1_all_with_restricted_fixture at space1':
        //       expect(response.statusCode).to.eql(400);
        //       expect(response.body).to.eql({
        //         statusCode: 400,
        //         error: 'Bad Request',
        //         message:
        //           'params invalid: [param1]: expected value of type [string] but got [undefined]',
        //       });
        //       break;
        //     default:
        //       throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
        //   }
        // });

        // it.skip('should handle create alert request appropriately when interval schedule is wrong syntax', async () => {
        //   const response = await supertestWithoutAuth
        //     .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        //     .set('kbn-xsrf', 'foo')
        //     .auth(user.username, user.password)
        //     .send(getSimulationTestRuleData({ schedule: { interval: '10x' } }));

        //   switch (scenario.id) {
        //     case 'no_kibana_privileges at space1':
        //     case 'global_read at space1':
        //     case 'space_1_all at space2':
        //     case 'superuser at space1':
        //     case 'space_1_all at space1':
        //     case 'space_1_all_alerts_none_actions at space1':
        //     case 'space_1_all_with_restricted_fixture at space1':
        //       expect(response.statusCode).to.eql(400);
        //       expect(response.body).to.eql({
        //         error: 'Bad Request',
        //         message: '[request body.schedule.interval]: string is not a valid duration: 10x',
        //         statusCode: 400,
        //       });
        //       break;
        //     default:
        //       throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
        //   }
        // });

        // it.skip('should handle create alert request appropriately when interval schedule is 0', async () => {
        //   const response = await supertestWithoutAuth
        //     .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        //     .set('kbn-xsrf', 'foo')
        //     .auth(user.username, user.password)
        //     .send(getSimulationTestRuleData({ schedule: { interval: '0s' } }));

        //   switch (scenario.id) {
        //     case 'no_kibana_privileges at space1':
        //     case 'global_read at space1':
        //     case 'space_1_all at space2':
        //     case 'superuser at space1':
        //     case 'space_1_all at space1':
        //     case 'space_1_all_alerts_none_actions at space1':
        //     case 'space_1_all_with_restricted_fixture at space1':
        //       expect(response.statusCode).to.eql(400);
        //       expect(response.body).to.eql({
        //         error: 'Bad Request',
        //         message: '[request body.schedule.interval]: string is not a valid duration: 0s',
        //         statusCode: 400,
        //       });
        //       break;
        //     default:
        //       throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
        //   }
        // });
      });
    }
  });
}
