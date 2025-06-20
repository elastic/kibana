/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esSupertest = getService('esSupertest');
  const es = getService('es');

  describe('read only saved objects', () => {
    describe('create and access read only objects', () => {
      it('should create a read only object', async () => {
        await supertest
          .post('/read_only_objects/create')
          .expect(200)
          .then((response) => {
            expect(response.body).to.eql('test');
          });
      });

      it('should get read only objects', async () => {
        await supertest
          .get('/read_only_objects/get')
          .expect(200)
          .then((response) => {
            expect(response.body).to.have.property('saved_objects');
            expect(response.body.saved_objects[0]).to.have.property('type', 'read_only_type');
            expect(response.body.saved_objects[0]).to.have.property('attributes');
            expect(response.body.saved_objects[0].attributes).to.have.property(
              'description',
              'test'
            );
          });
      });

      it('should fail to update read only objects', async () => {
        // First get the ID of the created object
        const getResponse = await supertest.get('/read_only_objects/get');
        const objectId = getResponse.body.saved_objects[0].id;

        // Now try to update using the real ID
        await supertest
          .put('/read_only_objects/update')
          .send({ id: objectId })
          .expect(400)
          .then((response) => {
            expect(response.body).to.contain('read_only');
          });
      });
    });
  });
}
