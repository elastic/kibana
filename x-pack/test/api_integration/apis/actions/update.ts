/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ES_ARCHIVER_ACTION_ID } from './constants';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function updateActionTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('update', () => {
    beforeEach(() => esArchiver.load('actions/basic'));
    afterEach(() => esArchiver.unload('actions/basic'));

    it('should return 200 when updating a document', async () => {
      await supertest
        .put(`/api/action/${ES_ARCHIVER_ACTION_ID}`)
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action updated',
            actionTypeConfig: {
              unencrypted: `This value shouldn't get encrypted`,
              encrypted: 'This value should be encrypted',
            },
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            id: ES_ARCHIVER_ACTION_ID,
          });
        });
    });

    it('should not be able to pass null to actionTypeConfig', async () => {
      await supertest
        .put(`/api/action/${ES_ARCHIVER_ACTION_ID}`)
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action updated',
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
      const { body: updatedAction } = await supertest
        .put(`/api/action/${ES_ARCHIVER_ACTION_ID}`)
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action updated',
            actionTypeConfig: {
              unencrypted: `This value shouldn't get encrypted`,
              encrypted: 'This value should be encrypted',
            },
          },
        })
        .expect(200);
      expect(updatedAction).to.eql({
        id: ES_ARCHIVER_ACTION_ID,
      });
      const { body: fetchedAction } = await supertest
        .get(`/api/action/${ES_ARCHIVER_ACTION_ID}`)
        .expect(200);
      expect(fetchedAction).to.eql({
        id: ES_ARCHIVER_ACTION_ID,
        type: 'action',
        references: [],
        version: fetchedAction.version,
        updated_at: fetchedAction.updated_at,
        attributes: {
          actionTypeId: 'test.index-record',
          description: 'My action updated',
          actionTypeConfig: {
            unencrypted: `This value shouldn't get encrypted`,
          },
        },
      });
    });

    it('should return 404 when updating a non existing document', async () => {
      await supertest
        .put('/api/action/2')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action updated',
            actionTypeConfig: {
              unencrypted: `This value shouldn't get encrypted`,
              encrypted: 'This value should be encrypted',
            },
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
        .put(`/api/action/${ES_ARCHIVER_ACTION_ID}`)
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
        .put(`/api/action/${ES_ARCHIVER_ACTION_ID}`)
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
              'child "attributes" fails because [child "description" fails because ["description" is required], child "actionTypeConfig" fails because ["actionTypeConfig" is required]]',
            validation: {
              source: 'payload',
              keys: ['attributes.description', 'attributes.actionTypeConfig'],
            },
          });
        });
    });

    it(`should return 400 when actionTypeConfig isn't valid`, async () => {
      await supertest
        .put(`/api/action/${ES_ARCHIVER_ACTION_ID}`)
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action updated',
            actionTypeConfig: {
              unencrypted: `This value shouldn't get encrypted`,
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
