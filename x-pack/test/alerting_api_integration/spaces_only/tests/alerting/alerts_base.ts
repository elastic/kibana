/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { omit } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Response as SupertestResponse } from 'supertest';
import { RecoveredActionGroup } from '@kbn/alerting-plugin/common';
import { TaskRunning, TaskRunningStage } from '@kbn/task-manager-plugin/server/task_running';
import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { Space } from '../../../common/types';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  AlertUtils,
  ensureDatetimeIsWithinRange,
  TaskManagerUtils,
} from '../../../common/lib';

export function alertTests({ getService }: FtrProviderContext, space: Space) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const taskManagerUtils = new TaskManagerUtils(es, retry);

  function getAlertingTaskById(taskId: string) {
    return supertestWithoutAuth
      .get(`/api/alerting_tasks/${taskId}`)
      .expect(200)
      .then((response: SupertestResponse) => response.body);
  }

  describe('alerts', () => {
    let alertUtils: AlertUtils;
    let indexRecordActionId: string;
    const authorizationIndex = '.kibana-test-authorization';
    const objectRemover = new ObjectRemover(supertestWithoutAuth);

    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
      await es.indices.create({ index: authorizationIndex });
      const { body: createdAction } = await supertestWithoutAuth
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
      indexRecordActionId = createdAction.id;
      alertUtils = new AlertUtils({
        space,
        supertestWithoutAuth,
        indexRecordActionId,
        objectRemover,
      });
    });
    afterEach(() => objectRemover.removeAll());
    after(async () => {
      await esTestIndexTool.destroy();
      await es.indices.delete({ index: authorizationIndex });
      objectRemover.add(space.id, indexRecordActionId, 'connector', 'actions');
      await objectRemover.removeAll();
    });

    it('should schedule task, run alert and schedule actions', async () => {
      const testStart = new Date();
      const reference = alertUtils.generateReference();
      const response = await alertUtils.createAlwaysFiringAction({ reference });
      const alertId = response.body.id;

      expect(response.statusCode).to.eql(200);
      const alertTestRecord = (
        await esTestIndexTool.waitForDocs('alert:test.always-firing', reference)
      )[0];
      const expected = {
        source: 'alert:test.always-firing',
        reference,
        state: {},
        params: {
          index: ES_TEST_INDEX_NAME,
          reference,
        },
        alertInfo: {
          alertId,
          consumer: 'alertsFixture',
          spaceId: space.id,
          namespace: space.namespace,
          name: 'abc',
          enabled: true,
          notifyWhen: 'onActiveAlert',
          schedule: {
            interval: '1m',
          },
          tags: ['tag-A', 'tag-B'],
          throttle: '1m',
          createdBy: null,
          updatedBy: null,
          actions: response.body.actions.map((action: any) => {
            /* eslint-disable @typescript-eslint/naming-convention */
            const { connector_type_id, group, id, params } = action;
            return {
              actionTypeId: connector_type_id,
              group,
              id,
              params,
            };
          }),
          producer: 'alertsFixture',
          ruleTypeId: 'test.always-firing',
          ruleTypeName: 'Test: Always Firing',
        },
      };
      if (expected.alertInfo.namespace === undefined) {
        delete expected.alertInfo.namespace;
      }
      const alertTestRecordWithoutDates = omit(alertTestRecord._source, [
        'alertInfo.createdAt',
        'alertInfo.updatedAt',
      ]);
      expect(alertTestRecordWithoutDates).to.eql(expected);
      expect(alertTestRecord._source.alertInfo.createdAt).to.match(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/
      );
      expect(alertTestRecord._source.alertInfo.updatedAt).to.match(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/
      );
      const actionTestRecord = (
        await esTestIndexTool.waitForDocs('action:test.index-record', reference)
      )[0];
      expect(actionTestRecord._source).to.eql({
        config: {
          unencrypted: `This value shouldn't get encrypted`,
        },
        secrets: {
          encrypted: 'This value should be encrypted',
        },
        params: {
          index: ES_TEST_INDEX_NAME,
          reference,
          message: `
alertId: ${alertId},
alertName: abc,
spaceId: ${space.id},
tags: tag-A,tag-B,
alertInstanceId: 1,
alertActionGroup: default,
instanceContextValue: true,
instanceStateValue: true
`.trim(),
        },
        reference,
        source: 'action:test.index-record',
      });

      await taskManagerUtils.waitForActionTaskParamsToBeCleanedUp(testStart);
    });

    it('should fire actions when an alert instance is recovered', async () => {
      const reference = alertUtils.generateReference();

      const { body: createdAction } = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      // pattern of when the alert should fire.
      const pattern = {
        instance: [true, true],
      };

      const createdAlert = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiring',
            schedule: { interval: '1s' },
            throttle: null,
            params: {
              pattern,
            },
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {},
              },
              {
                group: RecoveredActionGroup.id,
                id: indexRecordActionId,
                params: {
                  index: ES_TEST_INDEX_NAME,
                  reference,
                  message: 'Recovered message',
                },
              },
            ],
          })
        );

      expect(createdAlert.status).to.eql(200);
      const alertId = createdAlert.body.id;
      objectRemover.add(space.id, alertId, 'rule', 'alerting');

      const actionTestRecord = (
        await esTestIndexTool.waitForDocs('action:test.index-record', reference)
      )[0];

      expect(actionTestRecord._source.params.message).to.eql('Recovered message');
    });

    it('should not fire actions when an alert instance is recovered, but alert is muted', async () => {
      const testStart = new Date();
      const reference = alertUtils.generateReference();

      const { body: createdAction } = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      // pattern of when the alert should fire.
      const pattern = {
        instance: [true, true],
      };
      // created disabled alert
      const createdAlert = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiring',
            schedule: { interval: '1s' },
            enabled: false,
            throttle: null,
            params: {
              pattern,
              reference,
            },
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {},
              },
              {
                group: RecoveredActionGroup.id,
                id: indexRecordActionId,
                params: {
                  index: ES_TEST_INDEX_NAME,
                  reference,
                  message: 'Recovered message',
                },
              },
            ],
          })
        );
      expect(createdAlert.status).to.eql(200);
      const alertId = createdAlert.body.id;

      await alertUtils.muteAll(alertId);

      await alertUtils.enable(alertId);

      await esTestIndexTool.search('alert:test.patternFiring', reference);

      await taskManagerUtils.waitForActionTaskParamsToBeCleanedUp(testStart);

      const actionTestRecord = await esTestIndexTool.search('action:test.index-record', reference);
      // @ts-expect-error doesnt handle total: number
      expect(actionTestRecord.body.hits.total.value).to.eql(0);
      objectRemover.add(space.id, alertId, 'rule', 'alerting');
    });

    it('should reschedule failing alerts using the Task Manager retry logic with alert schedule interval', async () => {
      /*
        Alerts should set the Task Manager schedule interval with initial value.
      */
      const alertIntervalInSeconds = 10;
      const reference = alertUtils.generateReference();
      const response = await alertUtils.createAlwaysFailingAction({
        reference,
        overwrites: { schedule: { interval: `${alertIntervalInSeconds}s` } },
      });

      expect(response.statusCode).to.eql(200);

      // wait for executor Alert Executor to be run, which means the underlying task is running
      await esTestIndexTool.waitForDocs('alert:test.failing', reference);

      await retry.try(async () => {
        const alertTask = (await getAlertingTaskById(response.body.scheduled_task_id)).docs[0];
        expect(alertTask.status).to.eql('idle');
        expect(alertTask.schedule.interval).to.eql('10s');
        // ensure the alert is rescheduled correctly
        ensureDatetimeIsWithinRange(
          Date.parse(alertTask.runAt),
          alertIntervalInSeconds * 1000,
          5000
        );
      });
    });

    it('should handle custom retry logic', async () => {
      // We'll use this start time to query tasks created after this point
      const testStart = new Date().toISOString();
      // We have to provide the test.rate-limit the next runAt, for testing purposes
      const retryDate = new Date(Date.now() + 60000);

      const { body: createdAction } = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'Test rate limit',
          connector_type_id: 'test.rate-limit',
          config: {},
        })
        .expect(200);
      objectRemover.add(space.id, createdAction.id, 'connector', 'actions');

      const reference = alertUtils.generateReference();
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            schedule: { interval: '1m' },
            rule_type_id: 'test.always-firing',
            params: {
              index: ES_TEST_INDEX_NAME,
              reference: 'create-test-2',
            },
            actions: [
              {
                group: 'default',
                id: createdAction.id,
                params: {
                  reference,
                  index: ES_TEST_INDEX_NAME,
                  retryAt: retryDate.getTime(),
                },
              },
            ],
          })
        );

      expect(response.statusCode).to.eql(200);
      objectRemover.add(space.id, response.body.id, 'rule', 'alerting');
      const scheduledActionTask: estypes.SearchHit<
        TaskRunning<TaskRunningStage.RAN, ConcreteTaskInstance>
      > = await retry.try(async () => {
        const searchResult = await es.search<
          TaskRunning<TaskRunningStage.RAN, ConcreteTaskInstance>
        >({
          index: '.kibana_task_manager',
          body: {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      'task.status': 'idle',
                    },
                  },
                  {
                    term: {
                      'task.attempts': 1,
                    },
                  },
                  {
                    term: {
                      'task.taskType': 'actions:test.rate-limit',
                    },
                  },
                  {
                    range: {
                      'task.scheduledAt': {
                        gte: testStart,
                      },
                    },
                  },
                ],
              },
            },
          },
        });
        expect((searchResult.hits.total as estypes.SearchTotalHits).value).to.eql(1);
        return searchResult.hits.hits[0];
      });
      expect(scheduledActionTask._source!.task.runAt).to.eql(retryDate.toISOString());
    });

    it('should have proper callCluster and savedObjectsClient authorization for alert type executor', async () => {
      const reference = alertUtils.generateReference();
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.authorization',
            params: {
              callClusterAuthorizationIndex: authorizationIndex,
              savedObjectsClientType: 'dashboard',
              savedObjectsClientId: '1',
              index: ES_TEST_INDEX_NAME,
              reference,
            },
          })
        );

      expect(response.statusCode).to.eql(200);
      objectRemover.add(space.id, response.body.id, 'rule', 'alerting');
      const alertTestRecord = (
        await esTestIndexTool.waitForDocs('alert:test.authorization', reference)
      )[0];
      expect(alertTestRecord._source.state).to.eql({
        callClusterSuccess: true,
        callScopedClusterSuccess: true,
        savedObjectsClientSuccess: false,
        savedObjectsClientError: {
          ...alertTestRecord._source.state.savedObjectsClientError,
          output: {
            ...alertTestRecord._source.state.savedObjectsClientError.output,
            statusCode: 404,
          },
        },
      });
    });

    it('should have proper callCluster and savedObjectsClient authorization for action type executor', async () => {
      const reference = alertUtils.generateReference();
      const { body: createdAction } = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
          connector_type_id: 'test.authorization',
        })
        .expect(200);
      objectRemover.add(space.id, createdAction.id, 'connector', 'actions');
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.always-firing',
            params: {
              index: ES_TEST_INDEX_NAME,
              reference,
            },
            actions: [
              {
                group: 'default',
                id: createdAction.id,
                params: {
                  callClusterAuthorizationIndex: authorizationIndex,
                  savedObjectsClientType: 'dashboard',
                  savedObjectsClientId: '1',
                  index: ES_TEST_INDEX_NAME,
                  reference,
                },
              },
            ],
          })
        );

      expect(response.statusCode).to.eql(200);
      objectRemover.add(space.id, response.body.id, 'rule', 'alerting');
      const actionTestRecord = (
        await esTestIndexTool.waitForDocs('action:test.authorization', reference)
      )[0];
      expect(actionTestRecord._source.state).to.eql({
        callClusterSuccess: true,
        callScopedClusterSuccess: true,
        savedObjectsClientSuccess: false,
        savedObjectsClientError: {
          ...actionTestRecord._source.state.savedObjectsClientError,
          output: {
            ...actionTestRecord._source.state.savedObjectsClientError.output,
            statusCode: 404,
          },
        },
      });
    });

    it('should notify feature usage when using a gold action type', async () => {
      const testStart = new Date();
      const reference = alertUtils.generateReference();
      const response = await alertUtils.createAlwaysFiringAction({ reference });
      expect(response.statusCode).to.eql(200);

      // Wait for alert to run
      await esTestIndexTool.waitForDocs('action:test.index-record', reference);

      const {
        body: { features },
      } = await supertestWithoutAuth.get(`${getUrlPrefix(space.id)}/api/licensing/feature_usage`);
      expect(features).to.be.an(Array);
      const indexRecordFeature = features.find(
        (feature: { name: string }) => feature.name === 'Connector: Test: Index Record'
      );
      expect(indexRecordFeature).to.be.ok();
      expect(indexRecordFeature.last_used).to.be.a('string');
      expect(new Date(indexRecordFeature.last_used).getTime()).to.be.greaterThan(
        testStart.getTime()
      );

      await taskManagerUtils.waitForActionTaskParamsToBeCleanedUp(testStart);
    });
  });
}
