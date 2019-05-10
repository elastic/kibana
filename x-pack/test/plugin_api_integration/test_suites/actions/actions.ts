/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');

  describe('encrypted attributes', () => {
    after(async () => {
      const { body: findResult } = await supertest.get('/api/action/_find').expect(200);
      await Promise.all(
        findResult.saved_objects.map(({ id }: { id: string }) => {
          return supertest
            .delete(`/api/action/${id}`)
            .set('kbn-xsrf', 'foo')
            .expect(200);
        })
      );
    });

    it('decrypts attributes and joins on actionTypeConfig when firing', async () => {
      // Create an action
      const { body: createdAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My description',
            actionTypeId: 'test',
            actionTypeConfig: {
              unencrypted: 'not encrypted value',
              encrypted: 'encrypted by default value',
            },
          },
        })
        .expect(200);

      await supertest
        .post(`/api/action/${createdAction.id}/fire`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            foo: true,
            bar: false,
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            success: true,
            actionTypeConfig: {
              unencrypted: 'not encrypted value',
              encrypted: 'encrypted by default value',
            },
            params: {
              foo: true,
              bar: false,
            },
          });
        });
    });

    it(`doesn't return encrypted attributes on create`, async () => {
      const { body: createdAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My description',
            actionTypeId: 'test',
            actionTypeConfig: {
              unencrypted: 'not encrypted value',
              encrypted: 'encrypted by default value',
            },
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        type: 'action',
        references: [],
        updated_at: createdAction.updated_at,
        version: createdAction.version,
        attributes: {
          description: 'My description',
          actionTypeId: 'test',
          actionTypeConfig: {
            unencrypted: 'not encrypted value',
          },
        },
      });
    });

    it(`doesn't return encrypted attributes on get`, async () => {
      const { body: createdAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My description',
            actionTypeId: 'test',
            actionTypeConfig: {
              unencrypted: 'not encrypted value',
              encrypted: 'encrypted by default value',
            },
          },
        })
        .expect(200);

      const { body: result } = await supertest.get(`/api/action/${createdAction.id}`).expect(200);
      expect(result).to.eql({
        id: createdAction.id,
        type: 'action',
        references: [],
        updated_at: createdAction.updated_at,
        version: createdAction.version,
        attributes: {
          description: 'My description',
          actionTypeId: 'test',
          actionTypeConfig: {
            unencrypted: 'not encrypted value',
          },
        },
      });
    });

    it(`doesn't return encrypted attributes on update`, async () => {
      const { body: createdAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My description',
            actionTypeId: 'test',
            actionTypeConfig: {
              unencrypted: 'not encrypted value',
              encrypted: 'encrypted by default value',
            },
          },
        })
        .expect(200);
      const { body: result } = await supertest
        .put(`/api/action/${createdAction.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My description 2',
            actionTypeId: 'test',
            actionTypeConfig: {
              unencrypted: 'not encrypted value',
              encrypted: 'encrypted by default value',
            },
          },
        })
        .expect(200);
      expect(result).to.eql({
        id: createdAction.id,
        type: 'action',
        references: [],
        updated_at: result.updated_at,
        version: result.version,
        attributes: {
          description: 'My description 2',
          actionTypeId: 'test',
          actionTypeConfig: {
            unencrypted: 'not encrypted value',
          },
        },
      });
    });

    it(`update without re-providing encrypted attributes erases them`, async () => {
      const { body: createdAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My description',
            actionTypeId: 'test',
            actionTypeConfig: {
              unencrypted: 'not encrypted value',
              encrypted: 'encrypted by default value',
            },
          },
        })
        .expect(200);
      await supertest
        .put(`/api/action/${createdAction.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My description 2',
            actionTypeId: 'test',
            actionTypeConfig: {
              unencrypted: 'not encrypted value',
            },
          },
        })
        .expect(200);
      await supertest
        .post(`/api/action/${createdAction.id}/fire`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            foo: true,
            bar: false,
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            success: true,
            actionTypeConfig: {
              unencrypted: 'not encrypted value',
            },
            params: {
              foo: true,
              bar: false,
            },
          });
        });
    });

    it(`doesn't return encrypted attributes on find`, async () => {
      const { body: createdAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'sometexttofind',
            actionTypeId: 'test',
            actionTypeConfig: {
              unencrypted: 'not encrypted value',
              encrypted: 'encrypted by default value',
            },
          },
        })
        .expect(200);

      const { body: result } = await supertest
        .get('/api/action/_find?search=sometexttofind')
        .expect(200);
      expect(result).to.eql({
        page: 1,
        per_page: 20,
        total: 1,
        saved_objects: [
          {
            id: createdAction.id,
            type: 'action',
            references: [],
            updated_at: createdAction.updated_at,
            version: createdAction.version,
            attributes: {
              description: 'sometexttofind',
              actionTypeId: 'test',
              actionTypeConfig: {
                unencrypted: 'not encrypted value',
              },
            },
          },
        ],
      });
    });
  });
}
