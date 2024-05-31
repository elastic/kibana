/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SavedObject } from '@kbn/core/server';
import { RawRule, RuleNotifyWhen } from '@kbn/alerting-plugin/server/types';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { omit } from 'lodash';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import { Spaces } from '../../../scenarios';
import {
  checkAAD,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getUnauthorizedErrorMessage,
  TaskManagerDoc,
} from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('create', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    async function getScheduledTask(id: string): Promise<TaskManagerDoc> {
      const scheduledTask = await es.get<TaskManagerDoc>({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
      return scheduledTask._source!;
    }

    it('should handle create alert request appropriately', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {},
              },
            ],
          })
        );

      expect(response.status).to.eql(200);
      objectRemover.add(Spaces.space1.id, response.body.id, 'rule', 'alerting');
      expect(response.body).to.eql({
        id: response.body.id,
        name: 'abc',
        tags: ['foo'],
        actions: [
          {
            id: createdAction.id,
            connector_type_id: createdAction.connector_type_id,
            group: 'default',
            params: {},
            uuid: response.body.actions[0].uuid,
          },
        ],
        enabled: true,
        rule_type_id: 'test.noop',
        revision: 0,
        running: false,
        consumer: 'alertsFixture',
        params: {},
        created_by: null,
        schedule: { interval: '1m' },
        scheduled_task_id: response.body.scheduled_task_id,
        updated_by: null,
        api_key_owner: null,
        api_key_created_by_user: null,
        throttle: '1m',
        notify_when: 'onThrottleInterval',
        mute_all: false,
        muted_alert_ids: [],
        created_at: response.body.created_at,
        updated_at: response.body.updated_at,
        execution_status: response.body.execution_status,
        ...(response.body.next_run ? { next_run: response.body.next_run } : {}),
        ...(response.body.last_run ? { last_run: response.body.last_run } : {}),
      });
      expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
      expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
      expect(Date.parse(response.body.updated_at)).to.eql(Date.parse(response.body.created_at));
      if (response.body.next_run) {
        expect(Date.parse(response.body.next_run)).to.be.greaterThan(0);
      }
      expect(typeof response.body.scheduled_task_id).to.be('string');
      const taskRecord = await getScheduledTask(response.body.scheduled_task_id);
      expect(taskRecord.type).to.eql('task');
      expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
      expect(JSON.parse(taskRecord.task.params)).to.eql({
        alertId: response.body.id,
        spaceId: Spaces.space1.id,
        consumer: 'alertsFixture',
      });
      expect(taskRecord.task.enabled).to.eql(true);
      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: RULE_SAVED_OBJECT_TYPE,
        id: response.body.id,
      });
    });

    it('should store references correctly for actions', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {},
              },
              {
                id: 'my-slack1',
                group: 'default',
                params: {
                  message: 'something important happened!',
                },
              },
            ],
          })
        );

      expect(response.status).to.eql(200);

      objectRemover.add(Spaces.space1.id, response.body.id, 'rule', 'alerting');

      expect(response.body).to.eql({
        id: response.body.id,
        name: 'abc',
        tags: ['foo'],
        actions: [
          {
            id: createdAction.id,
            connector_type_id: createdAction.connector_type_id,
            group: 'default',
            params: {},
            uuid: response.body.actions[0].uuid,
          },
          {
            id: 'my-slack1',
            group: 'default',
            connector_type_id: '.slack',
            params: {
              message: 'something important happened!',
            },
            uuid: response.body.actions[1].uuid,
          },
        ],
        enabled: true,
        rule_type_id: 'test.noop',
        revision: 0,
        running: false,
        consumer: 'alertsFixture',
        params: {},
        created_by: null,
        schedule: { interval: '1m' },
        scheduled_task_id: response.body.scheduled_task_id,
        updated_by: null,
        api_key_owner: null,
        api_key_created_by_user: null,
        throttle: '1m',
        notify_when: 'onThrottleInterval',
        mute_all: false,
        muted_alert_ids: [],
        created_at: response.body.created_at,
        updated_at: response.body.updated_at,
        execution_status: response.body.execution_status,
        ...(response.body.next_run ? { next_run: response.body.next_run } : {}),
        ...(response.body.last_run ? { last_run: response.body.last_run } : {}),
      });

      if (response.body.next_run) {
        expect(Date.parse(response.body.next_run)).to.be.greaterThan(0);
      }

      const esResponse = await es.get<SavedObject<RawRule>>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: `alert:${response.body.id}`,
        },
        { meta: true }
      );
      expect(esResponse.statusCode).to.eql(200);
      const rawActions = (esResponse.body._source as any)?.alert.actions ?? [];
      expect(rawActions).to.eql([
        {
          actionRef: 'action_0',
          actionTypeId: 'test.noop',
          group: 'default',
          params: {},
          uuid: rawActions[0].uuid,
        },
        {
          actionRef: 'preconfigured:my-slack1',
          actionTypeId: '.slack',
          group: 'default',
          params: {
            message: 'something important happened!',
          },
          uuid: rawActions[1].uuid,
        },
      ]);

      const references = esResponse.body._source?.references ?? [];

      expect(references.length).to.eql(1);
      expect(references[0]).to.eql({
        id: createdAction.id,
        name: 'action_0',
        type: 'action',
      });
    });

    // see: https://github.com/elastic/kibana/issues/100607
    // note this fails when the mappings for `params` does not have ignore_above
    it('should handle alerts with immense params', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      const lotsOfSpaces = ''.padEnd(100 * 1000); // 100K space chars
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            params: {
              ignoredButPersisted: lotsOfSpaces,
            },
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {},
              },
            ],
          })
        );

      expect(response.status).to.eql(200);
      objectRemover.add(Spaces.space1.id, response.body.id, 'rule', 'alerting');

      expect(response.body.params.ignoredButPersisted).to.eql(lotsOfSpaces);

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: RULE_SAVED_OBJECT_TYPE,
        id: response.body.id,
      });
    });

    it('should create rules with mapped parameters', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      const createResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            params: {
              risk_score: 40,
              severity: 'medium',
              another_param: 'another',
            },
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {},
              },
            ],
          })
        )
        .expect(200);

      const response = await supertest.get(
        `${getUrlPrefix(
          Spaces.space1.id
        )}/internal/alerting/rules/_find?filter=alert.attributes.params.risk_score:40`
      );

      expect(response.status).to.eql(200);
      objectRemover.add(Spaces.space1.id, createResponse.body.id, 'rule', 'alerting');
      expect(response.body.total).to.equal(1);
      expect(response.body.data[0].mapped_params).to.eql({
        risk_score: 40,
        severity: '40-medium',
      });
    });

    it('should allow providing custom saved object ids (uuid v1)', async () => {
      const customId = '09570bb0-6299-11eb-8fde-9fe5ce6ea450';
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${customId}`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData());

      expect(response.status).to.eql(200);
      objectRemover.add(Spaces.space1.id, response.body.id, 'rule', 'alerting');
      expect(response.body.id).to.eql(customId);
      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: RULE_SAVED_OBJECT_TYPE,
        id: customId,
      });
    });

    it('should allow providing custom saved object ids (uuid v4)', async () => {
      const customId = 'b3bc6d83-3192-4ffd-9702-ad4fb88617ba';
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${customId}`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData());

      expect(response.status).to.eql(200);
      objectRemover.add(Spaces.space1.id, response.body.id, 'rule', 'alerting');
      expect(response.body.id).to.eql(customId);
      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: RULE_SAVED_OBJECT_TYPE,
        id: customId,
      });
    });

    it('should not allow providing simple custom ids (non uuid)', async () => {
      const customId = '1';
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${customId}`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData());

      expect(response.status).to.eql(400);
      expect(response.body).to.eql({
        statusCode: 400,
        error: 'Bad Request',
        message:
          'Predefined IDs are not allowed for saved objects with encrypted attributes unless the ID is a UUID.: Bad Request',
      });
    });

    it('should return 409 when document with id already exists', async () => {
      const customId = '5031f8f0-629a-11eb-b500-d1931a8e5df7';
      const createdAlertResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${customId}`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlertResponse.body.id, 'rule', 'alerting');
      await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${customId}`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(409);
    });

    it('should handle create alert request appropriately when consumer is unknown', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ consumer: 'some consumer patrick invented' }));

      expect(response.status).to.eql(403);
      expect(response.body).to.eql({
        error: 'Forbidden',
        message: getUnauthorizedErrorMessage(
          'create',
          'test.noop',
          'some consumer patrick invented'
        ),
        statusCode: 403,
      });
    });

    it('should handle create alert request appropriately when an alert is disabled ', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ enabled: false }));

      expect(response.status).to.eql(200);
      objectRemover.add(Spaces.space1.id, response.body.id, 'rule', 'alerting');
      expect(response.body.scheduledTaskId).to.eql(undefined);
    });

    it('should not allow creating a default action without group', async () => {
      const customId = '1';
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${customId}`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            actions: [
              {
                // group is missing
                id: 'test-id',
                params: {},
              },
            ],
          })
        );

      expect(response.status).to.eql(400);
      expect(response.body).to.eql({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Group is not defined in action test-id',
      });
    });

    describe('system actions', () => {
      const systemAction = {
        id: 'system-connector-test.system-action',
        params: {},
      };

      it('should create a rule with a system action correctly', async () => {
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              actions: [systemAction],
            })
          );

        expect(response.status).to.eql(200);
        expect(response.body.actions.length).to.eql(1);

        objectRemover.add(Spaces.space1.id, response.body.id, 'rule', 'alerting');

        const action = response.body.actions[0];
        const { uuid, ...rest } = action;

        expect(rest).to.eql({
          id: 'system-connector-test.system-action',
          connector_type_id: 'test.system-action',
          params: {},
        });

        expect(uuid).to.not.be(undefined);

        const esResponse = await es.get<SavedObject<RawRule>>(
          {
            index: ALERTING_CASES_SAVED_OBJECT_INDEX,
            id: `alert:${response.body.id}`,
          },
          { meta: true }
        );

        expect(esResponse.statusCode).to.eql(200);
        expect((esResponse.body._source as any)?.alert.systemActions).to.be(undefined);

        const rawActions = (esResponse.body._source as any)?.alert.actions ?? [];
        const rawAction = rawActions[0];
        const { uuid: rawActionUuid, ...rawActionRest } = rawAction;

        expect(rawActionRest).to.eql({
          actionRef: 'system_action:system-connector-test.system-action',
          actionTypeId: 'test.system-action',
          params: {},
        });

        expect(uuid).to.not.be(undefined);

        const references = esResponse.body._source?.references ?? [];

        expect(references.length).to.eql(0);
      });

      it('should throw 400 if the system action is missing required properties', async () => {
        for (const propertyToOmit of ['id']) {
          const systemActionWithoutProperty = omit(systemAction, propertyToOmit);

          await supertest
            .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                actions: [systemActionWithoutProperty],
              })
            )
            .expect(400);
        }
      });

      it('should throw 400 if the system action is missing required params', async () => {
        const res = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              actions: [
                {
                  ...systemAction,
                  params: {},
                  id: 'system-connector-test.system-action-connector-adapter',
                },
              ],
            })
          )
          .expect(400);

        expect(res.body.message).to.eql(
          'Invalid system action params. System action type: test.system-action-connector-adapter - [myParam]: expected value of type [string] but got [undefined]'
        );
      });

      it('strips out properties from system actions that are part of the default actions', async () => {
        for (const propertyToAdd of [
          { group: 'default' },
          {
            frequency: {
              summary: false,
              throttle: '1s',
              notify_when: RuleNotifyWhen.THROTTLE,
            },
          },
          {
            alerts_filter: {
              query: { kql: 'kibana.alert.rule.name:abc', filters: [] },
            },
          },
        ]) {
          const systemActionWithProperty = { ...systemAction, ...propertyToAdd };

          const response = await supertest
            .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                actions: [systemActionWithProperty],
              })
            );

          expect(response.status).to.eql(200);
          expect(response.body.actions[0][Object.keys(propertyToAdd)[0]]).to.be(undefined);

          objectRemover.add(Spaces.space1.id, response.body.id, 'rule', 'alerting');

          const esResponse = await es.get<SavedObject<RawRule>>(
            {
              index: ALERTING_CASES_SAVED_OBJECT_INDEX,
              id: `alert:${response.body.id}`,
            },
            { meta: true }
          );

          expect(esResponse.statusCode).to.eql(200);
          expect((esResponse.body._source as any)?.alert.systemActions).to.be(undefined);

          const rawActions = (esResponse.body._source as any)?.alert.actions ?? [];
          expect(rawActions[0][Object.keys(propertyToAdd)[0]]).to.be(undefined);
        }
      });

      it('should throw 400 when using the same system action twice', async () => {
        await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              actions: [systemAction, systemAction],
            })
          )
          .expect(400);
      });
    });

    describe('legacy', () => {
      it('should handle create alert request appropriately', async () => {
        const { body: createdAction } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'MY action',
            connector_type_id: 'test.noop',
            config: {},
            secrets: {},
          })
          .expect(200);

        const {
          rule_type_id: alertTypeId,
          notify_when: notifyWhen,
          ...testAlert
        } = getTestRuleData({
          actions: [
            {
              id: createdAction.id,
              group: 'default',
              params: {},
            },
          ],
        });
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
          .set('kbn-xsrf', 'foo')
          .send({
            ...testAlert,
            alertTypeId,
            notifyWhen,
          });

        expect(response.status).to.eql(200);
        objectRemover.add(Spaces.space1.id, response.body.id, 'rule', 'alerting');
        expect(response.body).to.eql({
          id: response.body.id,
          name: 'abc',
          tags: ['foo'],
          actions: [
            {
              id: createdAction.id,
              actionTypeId: createdAction.connector_type_id,
              group: 'default',
              params: {},
              uuid: response.body.actions[0].uuid,
            },
          ],
          enabled: true,
          alertTypeId: 'test.noop',
          consumer: 'alertsFixture',
          params: {},
          createdBy: null,
          schedule: { interval: '1m' },
          scheduledTaskId: response.body.scheduledTaskId,
          updatedBy: null,
          apiKeyOwner: null,
          apiKeyCreatedByUser: null,
          throttle: '1m',
          notifyWhen: 'onThrottleInterval',
          muteAll: false,
          mutedInstanceIds: [],
          createdAt: response.body.createdAt,
          updatedAt: response.body.updatedAt,
          executionStatus: response.body.executionStatus,
          revision: 0,
          running: false,
          ...(response.body.next_run ? { next_run: response.body.next_run } : {}),
          ...(response.body.last_run ? { last_run: response.body.last_run } : {}),
        });
        expect(Date.parse(response.body.createdAt)).to.be.greaterThan(0);
        expect(Date.parse(response.body.updatedAt)).to.be.greaterThan(0);
        expect(Date.parse(response.body.updatedAt)).to.eql(Date.parse(response.body.createdAt));
        if (response.body.next_run) {
          expect(Date.parse(response.body.next_run)).to.be.greaterThan(0);
        }
        expect(typeof response.body.scheduledTaskId).to.be('string');
        const taskRecord = await getScheduledTask(response.body.scheduledTaskId);
        expect(taskRecord.type).to.eql('task');
        expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
        expect(JSON.parse(taskRecord.task.params)).to.eql({
          alertId: response.body.id,
          spaceId: Spaces.space1.id,
          consumer: 'alertsFixture',
        });
        expect(taskRecord.task.enabled).to.eql(true);
        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: Spaces.space1.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: response.body.id,
        });
      });
    });
  });
}
