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
  getTestRuleData,
  getEventLog,
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { IValidatedEvent } from '../../../../../plugins/event_log/server';
import { DEFAULT_MAX_EPHEMERAL_ACTIONS_PER_ALERT } from '../../../../../plugins/alerting/server/config';

// eslint-disable-next-line import/no-default-export
export default function createNotifyWhenTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');

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
      for (let i = 0; i < DEFAULT_MAX_EPHEMERAL_ACTIONS_PER_ALERT + nonEphemeralTasks; i++) {
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
      const alertData = getTestRuleData({
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
        nonEphemeralTasks + DEFAULT_MAX_EPHEMERAL_ACTIONS_PER_ALERT
      );

      const searchResult = await esTestIndexTool.search('action:test.index-record');
      // @ts-expect-error doesnt handle total: number
      expect(searchResult.body.hits.total.value).equal(
        nonEphemeralTasks + DEFAULT_MAX_EPHEMERAL_ACTIONS_PER_ALERT
      );
    });
  });
}

function getEventsByAction(events: IValidatedEvent[], action: string) {
  return events.filter((event) => event?.event?.action === action);
}
