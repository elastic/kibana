/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { loginAsInteractiveUser } from '../helpers';
import { TEST_CASES } from '../../common/suites/create';
import { AUTHENTICATION } from '../../common/lib/authentication';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('update', function () {
    before(async () => {
      await esArchiver.load(
        'x-pack/test/saved_object_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test/saved_object_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
      );
    });

    it('updates updated_by with profile_id, created_by is untouched', async () => {
      const { type, id } = TEST_CASES.SINGLE_NAMESPACE_DEFAULT_SPACE;

      // update with interactive user 1
      const sessionHeaders1 = await loginAsInteractiveUser({
        getService,
        ...AUTHENTICATION.KIBANA_RBAC_USER,
      });
      const updateResponse1 = await supertest
        .put(`/api/saved_objects/${type}/${id}`)
        .set(sessionHeaders1)
        .send({ attributes: { title: 'test' } });

      expect(updateResponse1.status).to.be(200);
      expect(typeof updateResponse1.body.updated_by).to.be('string');
      expect(updateResponse1.body.created_by).not.to.be.ok();

      const getResponse1 = await supertest
        .get(`/api/saved_objects/${type}/${id}`)
        .set(sessionHeaders1);

      expect(typeof getResponse1.body.updated_by).to.be('string');
      expect(getResponse1.body.created_by).not.to.be.ok();

      // update with interactive user 2
      const sessionHeaders2 = await loginAsInteractiveUser({
        getService,
        ...AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
      });

      const updateResponse2 = await supertest
        .put(`/api/saved_objects/${type}/${id}`)
        .set(sessionHeaders2)
        .send({ attributes: { title: 'test 2' } });

      expect(updateResponse2.status).to.be(200);
      expect(typeof updateResponse2.body.updated_by).to.be('string');
      expect(updateResponse2.body.created_by).not.to.be.ok();

      const getResponse2 = await supertest
        .get(`/api/saved_objects/${type}/${id}`)
        .set(sessionHeaders2);

      expect(typeof getResponse2.body.updated_by).to.be('string');
      expect(getResponse2.body.created_by).not.to.be.ok();

      expect(getResponse2.body.updated_by).to.not.be.eql(getResponse1.body.updated_by);

      // update with "non-interactive" user, updated_by should become empty
      const updateResponse3 = await supertest
        .put(`/api/saved_objects/${type}/${id}`)
        .auth(AUTHENTICATION.KIBANA_RBAC_USER.username, AUTHENTICATION.KIBANA_RBAC_USER.password)
        .send({ attributes: { title: 'test 3' } });

      expect(updateResponse3.status).to.be(200);
      expect(updateResponse3.body.updated_by).not.to.be.ok();
      expect(updateResponse3.body.created_by).not.to.be.ok();

      const getResponse3 = await supertest
        .get(`/api/saved_objects/${type}/${id}`)
        .set(sessionHeaders2);

      expect(getResponse3.body.updated_by).not.to.be.ok();
      expect(getResponse3.body.created_by).not.to.be.ok();
    });

    it('upsert sets created_by and updated_by', async () => {
      const { type } = TEST_CASES.SINGLE_NAMESPACE_DEFAULT_SPACE;
      const id = `some-new-id-${Date.now()}`;

      // upsert with interactive user 1
      const sessionHeaders1 = await loginAsInteractiveUser({
        getService,
        ...AUTHENTICATION.KIBANA_RBAC_USER,
      });
      const upsertResponse = await supertest
        .put(`/api/saved_objects/${type}/${id}`)
        .set(sessionHeaders1)
        .send({ attributes: { title: 'updated' }, upsert: { title: 'upserted' } });

      expect(upsertResponse.status).to.be(200);
      expect(upsertResponse.body.attributes.title).to.be('upserted');
      expect(typeof upsertResponse.body.updated_by).to.be('string');
      expect(typeof upsertResponse.body.created_by).to.be('string');

      // update with interactive user 2
      const sessionHeaders2 = await loginAsInteractiveUser({
        getService,
        ...AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
      });

      const updateResponse = await supertest
        .put(`/api/saved_objects/${type}/${id}`)
        .set(sessionHeaders2)
        .send({ attributes: { title: 'updated' }, upsert: { title: 'upserted' } });

      expect(updateResponse.status).to.be(200);
      expect(updateResponse.body.attributes.title).to.be('updated');
      expect(typeof updateResponse.body.updated_by).to.be('string');
      expect(updateResponse.body.created_by).not.to.be.ok();

      const getResponse = await supertest
        .get(`/api/saved_objects/${type}/${id}`)
        .set(sessionHeaders2);
      expect(typeof getResponse.body.updated_by).to.be('string');
      expect(typeof getResponse.body.created_by).to.be('string');

      expect(getResponse.body.updated_by).not.to.be(upsertResponse.body.updated_by);
      expect(getResponse.body.created_by).to.be(upsertResponse.body.created_by);
    });
  });
}
