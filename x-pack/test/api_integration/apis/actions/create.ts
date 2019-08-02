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
          description: 'My action',
          actionTypeId: 'test.index-record',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
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

    it('should return 200 when creating an action inside a space and to not be accessible from another space', async () => {
      const { body: createdAction } = await supertest
        .post('/s/space_1/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          description: 'My action',
          actionTypeId: 'test.index-record',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(200);
      expect(createdAction).to.eql({
        id: createdAction.id,
      });
      expect(typeof createdAction.id).to.be('string');
      await supertest.get(`/s/space_1/api/action/${createdAction.id}`).expect(200);
      await supertest.get(`/api/action/${createdAction.id}`).expect(404);
    });

    it(`should return 400 when action type isn't registered`, async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          description: 'My action',
          actionTypeId: 'test.unregistered-action-type',
          config: {},
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
            message:
              'child "description" fails because ["description" is required]. child "actionTypeId" fails because ["actionTypeId" is required]',
            validation: {
              source: 'payload',
              keys: ['description', 'actionTypeId'],
            },
          });
        });
    });

    it(`should return 400 when config isn't valid`, async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          description: 'my description',
          actionTypeId: 'test.index-record',
          config: {
            unencrypted: 'my unencrypted text',
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type secrets: [encrypted]: expected value of type [string] but got [undefined]',
          });
        });
    });
  });
}
