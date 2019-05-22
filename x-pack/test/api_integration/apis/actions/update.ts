/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function updateActionTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('update', () => {
    beforeEach(() => esArchiver.load('alerting/basic'));
    afterEach(() => esArchiver.unload('alerting/basic'));

    it('should return 200 when updating a document', async () => {
      await supertest
        .put('/api/action/1')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            actionTypeId: 'test',
            description: 'My description updated',
            actionTypeConfig: {},
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            id: '1',
            type: 'action',
            references: [],
            version: resp.body.version,
            updated_at: resp.body.updated_at,
            attributes: {
              actionTypeId: 'test',
              description: 'My description updated',
              actionTypeConfig: {},
            },
          });
        });
    });

    it('should support partial updates', async () => {
      await supertest
        .put('/api/action/1')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            actionTypeId: 'test',
            description: 'My description updated again',
          },
        })
        .expect(200);
      await supertest
        .get('/api/action/1')
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            id: '1',
            type: 'action',
            references: [],
            version: resp.body.version,
            updated_at: resp.body.updated_at,
            attributes: {
              actionTypeId: 'test',
              description: 'My description updated again',
              actionTypeConfig: {
                unencrypted: 'unencrypted text',
              },
            },
          });
        });
    });

    it('should not be able to pass null to actionTypeConfig', async () => {
      await supertest
        .put('/api/action/1')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            actionTypeId: 'test',
            description: 'My description updated',
            actionTypeConfig: null,
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'child "attributes" fails because [child "actionTypeConfig" fails because ["actionTypeConfig" must be an object]]',
            validation: {
              source: 'payload',
              keys: ['attributes.actionTypeConfig'],
            },
          });
        });
    });

    it('should not return encrypted attributes', async () => {
      await supertest
        .put('/api/action/1')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            actionTypeId: 'test',
            description: 'My description updated',
            actionTypeConfig: {
              unencrypted: 'unencrypted text',
              encrypted: 'something encrypted',
            },
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            id: '1',
            type: 'action',
            references: [],
            version: resp.body.version,
            updated_at: resp.body.updated_at,
            attributes: {
              actionTypeId: 'test',
              description: 'My description updated',
              actionTypeConfig: {
                unencrypted: 'unencrypted text',
              },
            },
          });
        });
    });

    it('should return 404 when updating a non existing document', async () => {
      await supertest
        .put('/api/action/2')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            actionTypeId: 'test',
            description: 'My description updated',
            actionTypeConfig: {},
          },
        })
        .expect(404)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message: 'Saved object [action/2] not found',
          });
        });
    });

    it('should return 400 when payload is empty and invalid', async () => {
      await supertest
        .put('/api/action/1')
        .set('kbn-xsrf', 'foo')
        .send({})
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message: 'child "attributes" fails because ["attributes" is required]',
            validation: { source: 'payload', keys: ['attributes'] },
          });
        });
    });

    it('should return 400 when payload attributes are empty and invalid', async () => {
      await supertest
        .put('/api/action/1')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {},
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'child "attributes" fails because [child "description" fails because ["description" is required], child "actionTypeId" fails because ["actionTypeId" is required]]',
            validation: {
              source: 'payload',
              keys: ['attributes.description', 'attributes.actionTypeId'],
            },
          });
        });
    });
  });
}
