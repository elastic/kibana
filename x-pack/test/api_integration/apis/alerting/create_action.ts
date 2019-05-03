/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function createActionTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');

  async function deleteObject(type: string, id: string) {
    await supertest
      .delete(`/api/saved_objects/${type}/${id}`)
      .set('kbn-xsrf', 'foo')
      .expect(200);
  }

  describe('create_action', () => {
    after(async () => {
      await Promise.all([
        deleteObject('action', 'my-action'),
        deleteObject('action', 'my-action-to-duplicate'),
        deleteObject('action', 'my-action-to-overwrite'),
      ]);
    });

    it('should return 200 when creating an action with provided id', async () => {
      await supertest
        .post('/api/alerting/action/my-action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action',
            connectorId: 'log',
            connectorOptions: {
              username: 'username',
            },
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            type: 'action',
            id: 'my-action',
            attributes: {
              description: 'My action',
              connectorId: 'log',
              connectorOptions: { username: 'username' },
            },
            references: [],
            updated_at: resp.body.updated_at,
            version: resp.body.version,
          });
        });
    });

    it('should return 200 when creating an action without id provided', async () => {
      await supertest
        .post('/api/alerting/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action',
            connectorId: 'log',
            connectorOptions: {
              username: 'username',
            },
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            type: 'action',
            id: resp.body.id,
            attributes: {
              description: 'My action',
              connectorId: 'log',
              connectorOptions: { username: 'username' },
            },
            references: [],
            updated_at: resp.body.updated_at,
            version: resp.body.version,
          });
          expect(typeof resp.body.id).to.be('string');
        });
    });

    it('should return 409 when action already exists', async () => {
      await supertest
        .post('/api/alerting/action/my-action-to-duplicate')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action to duplicate',
            connectorId: 'log',
            connectorOptions: {
              username: 'username',
            },
          },
        })
        .expect(200);
      await supertest
        .post('/api/alerting/action/my-action-to-duplicate')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action to duplicate',
            connectorId: 'log',
            connectorOptions: {
              username: 'username',
            },
          },
        })
        .expect(409);
    });

    it('should return 200 when overwriting an action', async () => {
      await supertest
        .post('/api/alerting/action/my-action-to-overwrite')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action to duplicate',
            connectorId: 'log',
            connectorOptions: {
              username: 'username',
            },
          },
        })
        .expect(200);
      await supertest
        .post('/api/alerting/action/my-action-to-overwrite?overwrite=true')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action to overwrite',
            connectorId: 'log',
            connectorOptions: {
              username: 'username',
            },
          },
        })
        .expect(200);
    });

    it(`should return 400 when connector isn't registered`, async () => {
      await supertest
        .post('/api/alerting/action/my-action-without-connector')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action',
            connectorId: 'unregistered-connector',
            connectorOptions: {
              username: 'username',
            },
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Connector "unregistered-connector" is not registered.',
          });
        });
    });
  });
}
