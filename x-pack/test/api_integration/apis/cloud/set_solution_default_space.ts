/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

import { FtrProviderContext } from '../../ftr_provider_context';
import { roleDiscoverAll, userDiscoverAll } from './common/users';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('GET /api/cloud/solution', () => {
    it('set solution for default space as a superuser', async () => {
      await supertest
        .put('/api/cloud/solution')
        .set('kbn-xsrf', 'kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .send({
          solution_type: 'observability',
        })
        .expect(200);

      const { body: defaultSpace } = await supertest
        .get('/api/spaces/space/default')
        .set('kbn-xsrf', 'xxx');

      expect(defaultSpace.solution).to.eql('oblt');
    });

    it('throw error if type not supported', async () => {
      const { body } = await supertest
        .put('/api/cloud/solution')
        .set('kbn-xsrf', 'kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .send({
          solution_type: 'miami',
        })
        .expect(400);

      expect(body.message).to.eql(
        `[request body.type]: types that failed validation:\n- [request body.type.0]: expected value to equal [security]\n- [request body.type.1]: expected value to equal [observability]\n- [request body.type.2]: expected value to equal [elasticsearch]`
      );
    });

    it('throw error if not a super user', async () => {
      await security.role.create(roleDiscoverAll.name, roleDiscoverAll.privileges);
      await security.user.create(userDiscoverAll.username, userDiscoverAll);
      const { body } = await supertestWithoutAuth
        .put('/api/cloud/solution')
        .set('kbn-xsrf', 'kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .auth(userDiscoverAll.username, userDiscoverAll.password)
        .send({
          solution_type: 'observability',
        })
        .expect(403);

      await security.user.delete(userDiscoverAll.username);
      await security.role.delete(roleDiscoverAll.name);
      expect(body.message).to.eql(`Forbidden`);
    });
  });
}
