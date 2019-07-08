/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getTestAlertData } from './utils';
import { ES_ARCHIVER_ACTION_ID } from './constants';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function createUpdateTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('update', () => {
    let createdAlert: any;

    before(async () => {
      await esArchiver.load('actions/basic');
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200)
        .then((resp: any) => {
          createdAlert = resp.body;
        });
    });
    after(async () => {
      await supertest
        .delete(`/api/alert/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(200);
      await esArchiver.unload('actions/basic');
    });

    it('should return 200 when updating an alert', async () => {
      await supertest
        .put(`/api/alert/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          enabled: true,
          alertTypeParams: {
            foo: true,
          },
          interval: 12000,
          actions: [
            {
              group: 'default',
              id: ES_ARCHIVER_ACTION_ID,
              params: {
                message:
                  'UPDATED: instanceContextValue: {{context.instanceContextValue}}, instanceStateValue: {{state.instanceStateValue}}',
              },
            },
          ],
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            id: createdAlert.id,
            alertTypeParams: {
              foo: true,
            },
            interval: 12000,
            enabled: true,
            scheduledTaskId: resp.body.scheduledTaskId,
            actions: [
              {
                group: 'default',
                id: ES_ARCHIVER_ACTION_ID,
                params: {
                  message:
                    'UPDATED: instanceContextValue: {{context.instanceContextValue}}, instanceStateValue: {{state.instanceStateValue}}',
                },
              },
            ],
          });
        });
    });

    it('should be able to disable an alert', async () => {
      await supertest
        .put(`/api/alert/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          enabled: false,
          alertTypeParams: {
            foo: true,
          },
          interval: 12000,
          actions: [
            {
              group: 'default',
              id: ES_ARCHIVER_ACTION_ID,
              params: {
                message:
                  'UPDATED: instanceContextValue: {{context.instanceContextValue}}, instanceStateValue: {{state.instanceStateValue}}',
              },
            },
          ],
        })
        .expect(200);
    });

    it('should return 400 when attempting to change alert type', async () => {
      await supertest
        .put(`/api/alert/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          enabled: true,
          alertTypeId: '1',
          alertTypeParams: {
            foo: true,
          },
          interval: 12000,
          actions: [
            {
              group: 'default',
              id: ES_ARCHIVER_ACTION_ID,
              params: {
                message:
                  'UPDATED: instanceContextValue: {{context.instanceContextValue}}, instanceStateValue: {{state.instanceStateValue}}',
              },
            },
          ],
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message: '"alertTypeId" is not allowed',
            validation: {
              source: 'payload',
              keys: ['alertTypeId'],
            },
          });
        });
    });

    it('should return 400 when payload is empty and invalid', async () => {
      await supertest
        .put(`/api/alert/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .send({})
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'child "enabled" fails because ["enabled" is required]. child "interval" fails because ["interval" is required]. child "alertTypeParams" fails because ["alertTypeParams" is required]. child "actions" fails because ["actions" is required]',
            validation: {
              source: 'payload',
              keys: ['enabled', 'interval', 'alertTypeParams', 'actions'],
            },
          });
        });
    });

    it(`should return 400 when alertTypeConfig isn't valid`, async () => {
      const { body: customAlert } = await supertest
        .post('/api/alert')
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
      await supertest
        .put(`/api/alert/${customAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          enabled: true,
          interval: 10000,
          alertTypeParams: {},
          actions: [],
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message: 'alertTypeParams invalid: child "param1" fails because ["param1" is required]',
          });
        });
    });
  });
}
