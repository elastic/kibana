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
      ]);
    });

    it('should return 200 when creating an action', async () => {
      await supertest
        .post('/api/alerting/action')
        .set('kbn-xsrf', 'foo')
        .send({
          id: 'my-action',
          description: 'My action',
          connectorId: 'console',
          connectorOptions: {
            username: 'username',
          },
          connectorOptionsSecrets: {
            password: 'password',
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            type: 'action',
            id: 'my-action',
            attributes: {
              description: 'My action',
              connectorId: 'console',
              connectorOptions: { username: 'username' },
              connectorOptionsSecrets: { password: 'password' },
            },
            references: [],
            updated_at: resp.body.updated_at,
            version: resp.body.version,
          });
        });
    });

    it('should return 409 when action already exists', async () => {
      await supertest
        .post('/api/alerting/action')
        .set('kbn-xsrf', 'foo')
        .send({
          id: 'my-action-to-duplicate',
          description: 'My action to duplicate',
          connectorId: 'console',
          connectorOptions: {
            username: 'username',
          },
          connectorOptionsSecrets: {
            password: 'password',
          },
        })
        .expect(200);
      await supertest
        .post('/api/alerting/action')
        .set('kbn-xsrf', 'foo')
        .send({
          id: 'my-action-to-duplicate',
          description: 'My action to duplicate',
          connectorId: 'console',
          connectorOptions: {
            username: 'username',
          },
          connectorOptionsSecrets: {
            password: 'password',
          },
        })
        .expect(409);
    });

    it(`should return 400 when connector isn't registered`, async () => {
      await supertest
        .post('/api/alerting/action')
        .set('kbn-xsrf', 'foo')
        .send({
          id: 'my-action-without-connector',
          description: 'My action',
          connectorId: 'unregistered-connector',
          connectorOptions: {
            username: 'username',
          },
          connectorOptionsSecrets: {
            password: 'password',
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
