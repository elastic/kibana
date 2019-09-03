/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('`space` saved object type', () => {
    describe('GET /api/saved_objects/space/default', () => {
      it('should not return the default space', async () => {
        await supertest
          .get('/api/saved_objects/space/default')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(404)
          .then((response: Record<string, any>) => {
            expect(response.body).to.eql({
              message: `Saved object [space/default] not found`,
              statusCode: 404,
              error: 'Not Found',
            });
          });
      });
    });

    describe('GET /api/saved_objects/_find?type=space', () => {
      it('should not locate any spaces', async () => {
        await supertest
          .get('/api/saved_objects/_find?type=space')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200)
          .then((response: Record<string, any>) => {
            expect(response.body).to.eql({
              page: 1,
              per_page: 20,
              total: 0,
              saved_objects: [],
            });
          });
      });
    });

    describe('POST /api/saved_objects/space/my-space', () => {
      it('should not allow a space to be created', async () => {
        await supertest
          .post('/api/saved_objects/space/my-space')
          .set('kbn-xsrf', 'xxx')
          .send({ attributes: {} })
          .expect(400)
          .then((response: Record<string, any>) => {
            expect(response.body).to.eql({
              message: "Unsupported saved object type: 'space': Bad Request",
              statusCode: 400,
              error: 'Bad Request',
            });
          });
      });
    });

    describe('PUT /api/saved_objects/space/default', () => {
      it('should not allow a space to be updated', async () => {
        await supertest
          .post('/api/saved_objects/space/default')
          .set('kbn-xsrf', 'xxx')
          .send({ attributes: {} })
          .expect(400)
          .then((response: Record<string, any>) => {
            expect(response.body).to.eql({
              message: "Unsupported saved object type: 'space': Bad Request",
              statusCode: 400,
              error: 'Bad Request',
            });
          });
      });
    });

    describe('DELETE /api/saved_objects/space/default', () => {
      it('should not allow a space to be deleted', async () => {
        await supertest
          .delete('/api/saved_objects/space/default')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(404)
          .then((response: Record<string, any>) => {
            expect(response.body).to.eql({
              message: 'Not Found',
              statusCode: 404,
              error: 'Not Found',
            });
          });
      });
    });
  });
}
