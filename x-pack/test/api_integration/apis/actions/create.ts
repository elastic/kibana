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
  const esArchiver = getService('esArchiver');

  describe('create', () => {
    after(() => esArchiver.unload('empty_kibana'));

    it('should return 200 when creating an action and not return encrypted attributes', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action',
            actionTypeId: 'test.index-record',
            actionTypeConfig: {
              unencrypted: `This value shouldn't get encrypted`,
              encrypted: 'This value should be encrypted',
            },
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            id: resp.body.id,
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
            actionTypeId: 'test.unregistered-action-type',
            actionTypeConfig: {},
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Action type "test.unregistered-action-type" is not registered.',
          });
        });
    });

    it('should return 400 when payload is empty and invalid', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({})
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message: 'child "attributes" fails because ["attributes" is required]',
            validation: {
              source: 'payload',
              keys: ['attributes'],
            },
          });
        });
    });

    it('should return 400 when payload attributes are empty and invalid', async () => {
      await supertest
        .post('/api/action')
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
              'child "attributes" fails because [child "description" fails because ["description" is required], child "actionTypeId" fails because ["actionTypeId" is required], child "actionTypeConfig" fails because ["actionTypeConfig" is required]]',
            validation: {
              source: 'payload',
              keys: [
                'attributes.description',
                'attributes.actionTypeId',
                'attributes.actionTypeConfig',
              ],
            },
          });
        });
    });

    it(`should return 400 when actionTypeConfig isn't valid`, async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'my description',
            actionTypeId: 'test.index-record',
            actionTypeConfig: {
              unencrypted: 'my unencrypted text',
            },
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'The following actionTypeConfig attributes are invalid: encrypted [any.required]',
          });
        });
    });
  });
}
