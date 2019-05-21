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

  describe('create', () => {
    it('should return 200 when creating an action', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action',
            actionTypeId: 'test',
            actionTypeConfig: {},
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            type: 'action',
            id: resp.body.id,
            attributes: {
              description: 'My action',
              actionTypeId: 'test',
              actionTypeConfig: {},
            },
            references: [],
            updated_at: resp.body.updated_at,
            version: resp.body.version,
          });
          expect(typeof resp.body.id).to.be('string');
        });
    });

    it('should not return encrypted attributes', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action',
            actionTypeId: 'test',
            actionTypeConfig: {
              unencrypted: 'unencrypted text',
              encrypted: 'something encrypted',
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
              actionTypeId: 'test',
              actionTypeConfig: {
                unencrypted: 'unencrypted text',
              },
            },
            references: [],
            updated_at: resp.body.updated_at,
            version: resp.body.version,
          });
          expect(typeof resp.body.id).to.be('string');
        });
    });

    it(`should return 400 when action type isn't registered`, async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action',
            actionTypeId: 'unregistered-action-type',
            actionTypeConfig: {},
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Action type "unregistered-action-type" is not registered.',
          });
        });
    });
  });
}
