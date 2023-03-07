/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces, UserAtSpaceScenarios } from '../../../scenarios';
import {
  checkAAD,
  getTestRuleData,
  getConsumerUnauthorizedErrorMessage,
  getUrlPrefix,
  ObjectRemover,
  TaskManagerDoc,
} from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

interface RuleSpace {
  body: any;
}

// eslint-disable-next-line import/no-default-export
export default function createAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('clone', async () => {
    const objectRemover = new ObjectRemover(supertest);
    const space1 = Spaces[0].id;
    const space2 = Spaces[1].id;
    let ruleSpace1: RuleSpace = { body: {} };
    let ruleSpace2: RuleSpace = { body: {} };
    after(() => objectRemover.removeAll());
    before(async () => {
      const { body: createdActionSpace1 } = await supertest
        .post(`${getUrlPrefix(space1)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      const { body: createdActionSpace2 } = await supertest
        .post(`${getUrlPrefix(space2)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      ruleSpace1 = await supertest
        .post(`${getUrlPrefix(space1)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            actions: [
              {
                id: createdActionSpace1.id,
                group: 'default',
                params: {},
              },
            ],
          })
        );
      objectRemover.add(space1, ruleSpace1.body.id, 'rule', 'alerting');

      ruleSpace2 = await supertest
        .post(`${getUrlPrefix(space2)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            actions: [
              {
                id: createdActionSpace2.id,
                group: 'default',
                params: {},
              },
            ],
          })
        );
      objectRemover.add(space2, ruleSpace2.body.id, 'rule', 'alerting');
    });

    async function getScheduledTask(id: string): Promise<TaskManagerDoc> {
      const scheduledTask = await es.get<TaskManagerDoc>({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
      return scheduledTask._source!;
    }

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle clone rule request appropriately', async () => {
          const ruleIdToClone =
            space.id === space1
              ? ruleSpace1.body.id
              : space.id === space2
              ? ruleSpace2.body.id
              : null;
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rule/${ruleIdToClone}/_clone`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send();

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage(
                  'create',
                  'test.noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              objectRemover.add(space.id, response.body.id, 'rule', 'alerting');
              expect(response.body).to.eql({
                id: response.body.id,
                name: 'abc [Clone]',
                tags: ['foo'],
                actions: [
                  {
                    id: response.body.actions[0].id,
                    connector_type_id: response.body.actions[0].connector_type_id,
                    group: 'default',
                    params: {},
                    uuid: response.body.actions[0].uuid,
                  },
                ],
                enabled: true,
                rule_type_id: 'test.noop',
                running: false,
                consumer: 'alertsFixture',
                params: {},
                created_by: user.username,
                schedule: { interval: '1m' },
                scheduled_task_id: response.body.scheduled_task_id,
                created_at: response.body.created_at,
                updated_at: response.body.updated_at,
                throttle: '1m',
                notify_when: 'onThrottleInterval',
                updated_by: user.username,
                api_key_owner: user.username,
                mute_all: false,
                muted_alert_ids: [],
                execution_status: response.body.execution_status,
                last_run: {
                  alerts_count: {
                    active: 0,
                    ignored: 0,
                    new: 0,
                    recovered: 0,
                  },
                  outcome: 'succeeded',
                  outcome_msg: null,
                  outcome_order: 0,
                  warning: null,
                },
                next_run: response.body.next_run,
              });
              expect(typeof response.body.scheduled_task_id).to.be('string');
              expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);

              const taskRecord = await getScheduledTask(response.body.scheduled_task_id);
              expect(taskRecord.type).to.eql('task');
              expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
              expect(JSON.parse(taskRecord.task.params)).to.eql({
                alertId: response.body.id,
                spaceId: space.id,
                consumer: 'alertsFixture',
              });
              expect(taskRecord.task.enabled).to.eql(true);
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: 'alert',
                id: response.body.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    it('should throw an error when trying to duplicate a rule who belongs to security solution', async () => {
      const ruleCreated = await supertest
        .post(`${getUrlPrefix(space1)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.unrestricted-noop',
            consumer: 'siem',
          })
        );
      objectRemover.add(space1, ruleCreated.body.id, 'rule', 'alerting');

      const cloneRuleResponse = await supertest
        .post(`${getUrlPrefix(space1)}/internal/alerting/rule/${ruleCreated.body.id}/_clone`)
        .set('kbn-xsrf', 'foo')
        .send();

      expect(cloneRuleResponse.body).to.eql({
        error: 'Bad Request',
        message: 'The clone functionality is not enable for rule who belongs to security solution',
        statusCode: 400,
      });
    });

    it('should set  scheduled_task_id to null when the rule cloned is disable', async () => {
      const disableRuleCreated = await supertest
        .post(`${getUrlPrefix(space1)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            enabled: false,
          })
        );
      objectRemover.add(space1, disableRuleCreated.body.id, 'rule', 'alerting');

      const cloneRuleResponse = await supertest
        .post(`${getUrlPrefix(space1)}/internal/alerting/rule/${disableRuleCreated.body.id}/_clone`)
        .set('kbn-xsrf', 'foo')
        .send();
      objectRemover.add(space1, cloneRuleResponse.body.id, 'rule', 'alerting');

      expect(cloneRuleResponse.body.scheduled_task_id).to.eql(undefined);
    });
  });
}
