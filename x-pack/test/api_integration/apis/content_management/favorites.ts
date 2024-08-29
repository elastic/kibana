/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import {
  cleanupInteractiveUser,
  loginAsInteractiveUser,
  LoginAsInteractiveUserResponse,
  setupInteractiveUser,
} from './helpers';

export default function ({ getService }: FtrProviderContext) {
  describe('favorites', function () {
    describe('for not interactive user', function () {
      const supertest = getService('supertest');
      it('favorites require interactive user', async () => {
        const { status: status1 } = await supertest
          .get('/internal/content_management/favorites/dashboard')
          .set('kbn-xsrf', 'true');

        expect(status1).to.be(403);

        const { status: status2 } = await supertest
          .post('/internal/content_management/favorites/dashboard/fav1/favorite')
          .set('kbn-xsrf', 'true');

        expect(status2).to.be(403);

        const { status: status3 } = await supertest
          .post('/internal/content_management/favorites/dashboard/fav1/unfavorite')
          .set('kbn-xsrf', 'true');

        expect(status3).to.be(403);
      });
    });

    describe('for interactive user', function () {
      const supertest = getService('supertestWithoutAuth');
      let interactiveUser: LoginAsInteractiveUserResponse;

      before(async () => {
        await getService('esArchiver').emptyKibanaIndex();
        await setupInteractiveUser({ getService });
        interactiveUser = await loginAsInteractiveUser({ getService });
      });

      after(async () => {
        await cleanupInteractiveUser({ getService });
      });

      const api = {
        favorite: ({
          dashboardId,
          user,
          space,
        }: {
          dashboardId: string;
          user: LoginAsInteractiveUserResponse;
          space?: string;
        }) => {
          return supertest
            .post(
              `${
                space ? `/s/${space}` : ''
              }/internal/content_management/favorites/dashboard/${dashboardId}/favorite`
            )
            .set(user.headers)
            .set('kbn-xsrf', 'true')
            .expect(200);
        },
        unfavorite: ({
          dashboardId,
          user,
          space,
        }: {
          dashboardId: string;
          user: LoginAsInteractiveUserResponse;
          space?: string;
        }) => {
          return supertest
            .post(
              `${
                space ? `/s/${space}` : ''
              }/internal/content_management/favorites/dashboard/${dashboardId}/unfavorite`
            )
            .set(user.headers)
            .set('kbn-xsrf', 'true')
            .expect(200);
        },
        list: ({ user, space }: { user: LoginAsInteractiveUserResponse; space?: string }) => {
          return supertest
            .get(`${space ? `/s/${space}` : ''}/internal/content_management/favorites/dashboard`)
            .set(user.headers)
            .set('kbn-xsrf', 'true')
            .expect(200);
        },
      };

      it('can favorite a dashboard', async () => {
        let response = await api.list({ user: interactiveUser });
        expect(response.body.favoriteIds).to.eql([]);

        response = await api.favorite({ dashboardId: 'fav1', user: interactiveUser });
        expect(response.body.favoriteIds).to.eql(['fav1']);

        response = await api.favorite({ dashboardId: 'fav1', user: interactiveUser });
        expect(response.body.favoriteIds).to.eql(['fav1']);

        response = await api.favorite({ dashboardId: 'fav2', user: interactiveUser });
        expect(response.body.favoriteIds).to.eql(['fav1', 'fav2']);

        response = await api.unfavorite({ dashboardId: 'fav1', user: interactiveUser });
        expect(response.body.favoriteIds).to.eql(['fav2']);

        response = await api.unfavorite({ dashboardId: 'fav3', user: interactiveUser });
        expect(response.body.favoriteIds).to.eql(['fav2']);

        response = await api.list({ user: interactiveUser });
        expect(response.body.favoriteIds).to.eql(['fav2']);

        // check that the favorites aren't shared between users
        const interactiveUser2 = await loginAsInteractiveUser({
          getService,
          username: 'content_manager_dashboard_2',
        });

        response = await api.list({ user: interactiveUser2 });
        expect(response.body.favoriteIds).to.eql([]);

        // check that the favorites aren't shared between spaces
        response = await api.list({ user: interactiveUser, space: 'custom' });
        expect(response.body.favoriteIds).to.eql([]);

        response = await api.favorite({
          dashboardId: 'fav1',
          user: interactiveUser,
          space: 'custom',
        });

        expect(response.body.favoriteIds).to.eql(['fav1']);

        response = await api.list({ user: interactiveUser, space: 'custom' });
        expect(response.body.favoriteIds).to.eql(['fav1']);

        response = await api.list({ user: interactiveUser });
        expect(response.body.favoriteIds).to.eql(['fav2']);

        // check that reader user can favorite
        const interactiveUser3 = await loginAsInteractiveUser({
          getService,
          username: 'content_reader_dashboard_2',
        });

        response = await api.list({ user: interactiveUser3 });
        expect(response.body.favoriteIds).to.eql([]);

        response = await api.favorite({ dashboardId: 'fav1', user: interactiveUser3 });
        expect(response.body.favoriteIds).to.eql(['fav1']);
      });
    });
  });
}
