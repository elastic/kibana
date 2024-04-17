/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { loginAsInteractiveUser, sampleDashboard } from './helpers';

export default function ({ getService }: FtrProviderContext) {
  describe('suggest_users', function () {
    const supertest = getService('supertestWithoutAuth');
    const config = getService('config');
    let sessionHeaders: { [key: string]: string } = {};

    before(async () => {
      sessionHeaders = await loginAsInteractiveUser({ getService });
    });

    it('suggests users with dashboards', async () => {
      const createResponse = await supertest
        .post('/api/content_management/rpc/create')
        .set(sessionHeaders)
        .set('kbn-xsrf', 'true')
        .send(sampleDashboard)
        .expect(200);

      expect(createResponse.body.result.result.item).to.be.ok();
      expect(createResponse.body.result.result.item).to.have.key('createdBy');
      const createdBy = createResponse.body.result.result.item.createdBy;

      const suggestUsersResponse = await supertest
        .get('/internal/dashboard/suggest_users')
        .set('kbn-xsrf', 'true')
        .set(sessionHeaders)
        .expect(200);

      expect(suggestUsersResponse.body.users).to.be.ok();
      const users = suggestUsersResponse.body.users;

      // assume that there are other dashboards created by other users
      expect(users.length).to.be.greaterThan(0);
      const currentUser = users.find((user: { uid: string }) => user.uid === createdBy);

      expect(currentUser).to.be.ok();
      expect(currentUser.uid).to.be(createdBy);
      const username = config.get('servers.kibana.username');
      expect(currentUser.user.username).to.be(username);
    });
  });
}
