/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getTestAlertData } from './utils';
import { SpaceScenarios } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('create', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    async function getScheduledTask(id: string) {
      return await es.get({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
    }

    for (const scenario of SpaceScenarios) {
      describe(scenario.id, () => {
        it('should handle create alert request appropriately', async () => {
          const response = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData());

          expect(response.statusCode).to.eql(200);
          objectRemover.add(scenario.id, response.body.id, 'alert');
          expect(response.body).to.eql({
            id: response.body.id,
            actions: [],
            enabled: true,
            alertTypeId: 'test.noop',
            alertTypeParams: {},
            createdBy: null,
            interval: '10s',
            scheduledTaskId: response.body.scheduledTaskId,
            updatedBy: null,
          });
          expect(typeof response.body.scheduledTaskId).to.be('string');
          const { _source: taskRecord } = await getScheduledTask(response.body.scheduledTaskId);
          expect(taskRecord.type).to.eql('task');
          expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
          expect(JSON.parse(taskRecord.task.params)).to.eql({
            alertId: response.body.id,
            spaceId: scenario.id,
          });
        });

        it('should handle create alert request appropriately when an alert is disabled ', async () => {
          const response = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData({ enabled: false }));

          expect(response.statusCode).to.eql(200);
          objectRemover.add(scenario.id, response.body.id, 'alert');
          expect(response.body.scheduledTaskId).to.eql(undefined);
        });

        it('should handle create alert request appropriately when alert type is unregistered', async () => {
          await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                alertTypeId: 'test.unregistered-alert-type',
              })
            )
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message: 'Alert type "test.unregistered-alert-type" is not registered.',
            });
        });

        it('should handle create alert request appropriately when payload is empty and invalid', async () => {
          await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send({})
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message:
                'child "alertTypeId" fails because ["alertTypeId" is required]. child "interval" fails because ["interval" is required]. child "alertTypeParams" fails because ["alertTypeParams" is required]. child "actions" fails because ["actions" is required]',
              validation: {
                source: 'payload',
                keys: ['alertTypeId', 'interval', 'alertTypeParams', 'actions'],
              },
            });
        });

        it(`should handle create alert request appropriately when alertTypeParams isn't valid`, async () => {
          await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                alertTypeId: 'test.validation',
              })
            )
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message:
                'alertTypeParams invalid: [param1]: expected value of type [string] but got [undefined]',
            });
        });

        it('should handle create alert request appropriately when interval is wrong syntax', async () => {
          await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData(getTestAlertData({ interval: '10x' })))
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message:
                'child "interval" fails because ["interval" with value "10x" fails to match the seconds (5s) pattern, "interval" with value "10x" fails to match the minutes (5m) pattern, "interval" with value "10x" fails to match the hours (5h) pattern, "interval" with value "10x" fails to match the days (5d) pattern]',
              validation: {
                source: 'payload',
                keys: ['interval', 'interval', 'interval', 'interval'],
              },
            });
        });

        it('should handle create alert request appropriately when interval is 0', async () => {
          await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData(getTestAlertData({ interval: '0s' })))
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message:
                'child "interval" fails because ["interval" with value "0s" fails to match the seconds (5s) pattern, "interval" with value "0s" fails to match the minutes (5m) pattern, "interval" with value "0s" fails to match the hours (5h) pattern, "interval" with value "0s" fails to match the days (5d) pattern]',
              validation: {
                source: 'payload',
                keys: ['interval', 'interval', 'interval', 'interval'],
              },
            });
        });
      });
    }
  });
}
