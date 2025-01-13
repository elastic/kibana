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

  describe('bulk_update', function () {
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
      const interactiveUser1 = await loginAsInteractiveUser({
        getService,
        ...AUTHENTICATION.KIBANA_RBAC_USER,
      });
      const updateResponse1 = await supertest
        .put(`/api/saved_objects/_bulk_update`)
        .set(interactiveUser1.headers)
        .send([{ id, type, attributes: { title: 'test' } }]);

      expect(updateResponse1.status).to.be(200);
      expect(updateResponse1.body.saved_objects[0].updated_by).to.be(interactiveUser1.uid);
      expect(updateResponse1.body.saved_objects[0].created_by).not.to.be.ok();

      const getResponse1 = await supertest
        .get(`/api/saved_objects/${type}/${id}`)
        .set(interactiveUser1.headers);

      expect(getResponse1.body.updated_by).to.be(interactiveUser1.uid);
      expect(getResponse1.body.created_by).not.to.be.ok();

      // update with interactive user 2
      const interactiveUser2 = await loginAsInteractiveUser({
        getService,
        ...AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
      });

      const updateResponse2 = await supertest
        .put(`/api/saved_objects/_bulk_update`)
        .set(interactiveUser2.headers)
        .send([{ type, id, attributes: { title: 'test 2' } }]);

      expect(updateResponse2.status).to.be(200);
      expect(updateResponse2.body.saved_objects[0].updated_by).to.be(interactiveUser2.uid);
      expect(updateResponse2.body.saved_objects[0].created_by).not.to.be.ok();

      const getResponse2 = await supertest
        .get(`/api/saved_objects/${type}/${id}`)
        .set(interactiveUser2.headers);

      expect(getResponse2.body.updated_by).to.be(interactiveUser2.uid);
      expect(getResponse2.body.created_by).not.to.be.ok();

      // update with "non-interactive" user, updated_by should become empty
      const updateResponse3 = await supertest
        .put(`/api/saved_objects/_bulk_update`)
        .auth(AUTHENTICATION.KIBANA_RBAC_USER.username, AUTHENTICATION.KIBANA_RBAC_USER.password)
        .send([{ type, id, attributes: { title: 'test 3' } }]);

      expect(updateResponse3.status).to.be(200);
      expect(updateResponse3.body.saved_objects[0].updated_by).not.to.be.ok();
      expect(updateResponse3.body.saved_objects[0].created_by).not.to.be.ok();

      const getResponse3 = await supertest
        .get(`/api/saved_objects/${type}/${id}`)
        .set(interactiveUser2.headers);

      expect(getResponse3.body.updated_by).not.to.be.ok();
      expect(getResponse3.body.created_by).not.to.be.ok();
    });
  });
}
