/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTestAlertData } from './utils';
import { SpaceScenarios } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createUpdateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('update', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    for (const scenario of SpaceScenarios) {
      describe(scenario.id, () => {
        it('should handle update alert request appropriately', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData())
            .expect(200);
          objectRemover.add(scenario.id, createdAlert.id, 'alert');

          const updatedData = {
            alertTypeParams: {
              foo: true,
            },
            interval: '12s',
            actions: [],
          };
          await supertest
            .put(`${getUrlPrefix(scenario.id)}/api/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .send(updatedData)
            .expect(200, {
              ...updatedData,
              id: createdAlert.id,
              updatedBy: null,
            });
        });

        it('should handle update alert request appropriately when attempting to change alert type', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData())
            .expect(200);
          objectRemover.add(scenario.id, createdAlert.id, 'alert');

          await supertest
            .put(`${getUrlPrefix(scenario.id)}/api/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .send({
              alertTypeId: '1',
              alertTypeParams: {
                foo: true,
              },
              interval: '12s',
              actions: [],
            })
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message: '"alertTypeId" is not allowed',
              validation: {
                source: 'payload',
                keys: ['alertTypeId'],
              },
            });
        });

        it('should handle update alert request appropriately when payload is empty and invalid', async () => {
          await supertest
            .put(`${getUrlPrefix(scenario.id)}/api/alert/1`)
            .set('kbn-xsrf', 'foo')
            .send({})
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message:
                'child "interval" fails because ["interval" is required]. child "alertTypeParams" fails because ["alertTypeParams" is required]. child "actions" fails because ["actions" is required]',
              validation: {
                source: 'payload',
                keys: ['interval', 'alertTypeParams', 'actions'],
              },
            });
        });

        it(`should handle update alert request appropriately when alertTypeConfig isn't valid`, async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                alertTypeId: 'test.validation',
                alertTypeParams: {
                  param1: 'test',
                },
              })
            )
            .expect(200);
          objectRemover.add(scenario.id, createdAlert.id, 'alert');

          await supertest
            .put(`${getUrlPrefix(scenario.id)}/api/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .send({
              interval: '10s',
              alertTypeParams: {},
              actions: [],
            })
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message:
                'alertTypeParams invalid: [param1]: expected value of type [string] but got [undefined]',
            });
        });

        it('should handle update alert request appropriately when interval is wrong syntax', async () => {
          await supertest
            .put(`${getUrlPrefix(scenario.id)}/api/alert/1`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData({ interval: '10x', enabled: undefined }))
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message:
                'child "interval" fails because ["interval" with value "10x" fails to match the seconds pattern, "interval" with value "10x" fails to match the minutes pattern, "interval" with value "10x" fails to match the hours pattern, "interval" with value "10x" fails to match the days pattern]. "alertTypeId" is not allowed',
              validation: {
                source: 'payload',
                keys: ['interval', 'interval', 'interval', 'interval', 'alertTypeId'],
              },
            });
        });
      });
    }
  });
}
