/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { flatten } from 'lodash';
import { Spaces } from '../../scenarios';
import {
  getUrlPrefix,
  ObjectRemover,
  getTestAlertData,
  getEventLog,
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { IValidatedEvent } from '../../../../../plugins/event_log/server';
import { DEFAULT_MAX_EPHEMERAL_TASKS_PER_CYCLE } from '../../../../../plugins/task_manager/server/config';

// eslint-disable-next-line import/no-default-export
export default function createNotifyWhenTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('legacyEs');

  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('ephemeral', () => {
    const objectRemover = new ObjectRemover(supertest);

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });
    afterEach(async () => await esTestIndexTool.destroy());
    after(async () => {
      await objectRemover.removeAll();
    });

    it('should execute all requests, when some will be ephemeral and some not', async () => {
      const nonEphemeralTasks = 3;
      const actionPromises = [];
      for (let i = 0; i < DEFAULT_MAX_EPHEMERAL_TASKS_PER_CYCLE + nonEphemeralTasks; i++) {
        actionPromises.push(
          supertest
            .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: `My action${i}`,
              connector_type_id: 'test.index-record',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            })
            .expect(200)
        );
      }
      const createdActions = await Promise.all(actionPromises);
      createdActions.forEach((createdAction) =>
        objectRemover.add(Spaces.space1.id, createdAction.body.id, 'action', 'actions')
      );

      const pattern = {
        instance: [true, true, true, false, true, true],
      };
      const alertData = getTestAlertData({
        rule_type_id: 'test.patternFiring',
        params: { pattern },
        schedule: { interval: '1m' },
        throttle: null,
        notify_when: 'onActiveAlert',
        actions: createdActions.map((createdAction) => {
          return {
            id: createdAction.body.id,
            group: 'default',
            params: {
              index: ES_TEST_INDEX_NAME,
              reference: '',
              message: 'test message',
            },
          };
        }),
      });
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(alertData)
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const events = flatten(
        await Promise.all(
          createdActions.map(async (createdAction) => {
            return await retry.try(async () => {
              return await getEventLog({
                getService,
                spaceId: Spaces.space1.id,
                type: 'action',
                id: createdAction.body.id,
                provider: 'actions',
                actions: new Map([['execute', { gte: 1 }]]),
              });
            });
          })
        )
      );

      const executeActionsEvents = getEventsByAction(events, 'execute');
      expect(executeActionsEvents.length).equal(
        nonEphemeralTasks + DEFAULT_MAX_EPHEMERAL_TASKS_PER_CYCLE
      );

      const searchResult = await esTestIndexTool.search('action:test.index-record');
      expect(searchResult.hits.total.value).equal(
        nonEphemeralTasks + DEFAULT_MAX_EPHEMERAL_TASKS_PER_CYCLE
      );
    });

    it('should ensure ephemeral actions do not block future tasks from running', async () => {
      const action = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: `My action`,
          connector_type_id: 'test.delayed',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, action.body.id, 'action', 'actions');

      const reference = 'ephemeralRef';
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            rule_type_id: 'test.always-firing',
            params: { index: ES_TEST_INDEX_NAME, reference },
            schedule: { interval: '1s' },
            throttle: null,
            notify_when: 'onActiveAlert',
            actions: [
              {
                id: action.body.id,
                group: 'default',
                params: {
                  delayInMs: 1000,
                },
              },
              {
                id: action.body.id,
                group: 'default',
                params: {
                  delayInMs: 1000,
                },
              },
            ],
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      // We want to verify that while the alert is processing all ephemeral tasks, task manager
      // will pick up the alert (since it's set to a small interval) concurrently (so action execution does not block task manager)

      // By the time we see two actions finish (at least 2s after the alert fired), we should see
      // at the very least 2 total executions of the alert too.
      const actionEvents = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'action',
          id: action.body.id,
          provider: 'actions',
          actions: new Map([['execute', { gte: 2 }]]),
        });
      });
      // Purposely do not do this in a `retry.try` because the logs should already exist
      const alertEvents = await getEventLog({
        getService,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdAlert.id,
        provider: 'alerting',
        actions: new Map([['execute', { gte: 2 }]]),
      });
      const executeActionsEvents = getEventsByAction(actionEvents, 'execute');
      expect(executeActionsEvents.length).equal(2);

      const executeAlertEvents = getEventsByAction(alertEvents, 'execute');
      expect(executeAlertEvents.length).equal(2);

      // Disable the rule
      await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${createdAlert.id}/_disable`)
        .set('kbn-xsrf', 'foo')
        .expect(204);

      // Wait for the delayed actions to fire before finishing so the objectRemover does not crash the test server
      const waitForInMs = 2500;
      await new Promise((resolve) =>
        setTimeout(() => {
          resolve(true);
        }, waitForInMs)
      );
    });

    // it.only('should ensure ephemeral actions are not lost if TM is at capacity', async () => {
    //   const action = await supertest
    //     .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
    //     .set('kbn-xsrf', 'foo')
    //     .send({
    //       name: `My action`,
    //       connector_type_id: 'test.delayed',
    //       config: {
    //         unencrypted: `This value shouldn't get encrypted`,
    //       },
    //       secrets: {
    //         encrypted: 'This value should be encrypted',
    //       },
    //     })
    //     .expect(200);

    //   const actionCount = 5;
    //   const alertCount = 50;
    //   const reference = 'ephemeralRef';
    //   await Promise.all(
    //     range(0, 10).map(async (index) => {
    //       await supertest
    //         .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
    //         .set('kbn-xsrf', 'foo')
    //         .send(
    //           getTestAlertData({
    //             rule_type_id: 'test.always-firing',
    //             params: { index: ES_TEST_INDEX_NAME, reference },
    //             schedule: { interval: '1m' },
    //             throttle: null,
    //             notify_when: 'onActiveAlert',
    //             actions: range(0, actionCount).map((idx) => {
    //               return {
    //                 id: action.body.id,
    //                 group: 'default',
    //                 params: {
    //                   delayInMs: 1000,
    //                 },
    //               };
    //             }),
    //           })
    //         )
    //         .expect(200);
    //     })
    //   );

    //   const actionEvents = await retry.try(async () => {
    //     return await getEventLog({
    //       getService,
    //       spaceId: Spaces.space1.id,
    //       type: 'action',
    //       id: action.body.id,
    //       provider: 'actions',
    //       actions: new Map([['execute', { gte: actionCount * alertCount }]]),
    //     });
    //   });
    //   const executeActionsEvents = getEventsByAction(actionEvents, 'execute');
    //   expect(executeActionsEvents.length).equal(actionCount * alertCount);
    // });
  });
}

function getEventsByAction(events: IValidatedEvent[], action: string) {
  return events.filter((event) => event?.event?.action === action);
}
