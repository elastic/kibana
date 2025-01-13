/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { UnencryptedTelemetryPayload } from '@kbn/telemetry-plugin/common/types';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';

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

      it('fails to favorite type is invalid', async () => {
        await supertest
          .post(`/internal/content_management/favorites/invalid/fav1/favorite`)
          .set(interactiveUser.headers)
          .set('kbn-xsrf', 'true')
          .expect(400);
      });

      describe('dashboard', () => {
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
          list: ({
            user,
            space,
          }: {
            user: LoginAsInteractiveUserResponse;
            space?: string;
            favoriteType?: string;
          }) => {
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

        it("fails to favorite if metadata is provided for type that doesn't support it", async () => {
          await supertest
            .post(`/internal/content_management/favorites/dashboard/fav1/favorite`)
            .set(interactiveUser.headers)
            .set('kbn-xsrf', 'true')
            .send({ metadata: { foo: 'bar' } })
            .expect(400);

          await supertest
            .post(`/internal/content_management/favorites/dashboard/fav1/favorite`)
            .set(interactiveUser.headers)
            .set('kbn-xsrf', 'true')
            .send({ metadata: {} })
            .expect(400);
        });

        // depends on the state from previous test
        it('reports favorites stats', async () => {
          const { body }: { body: UnencryptedTelemetryPayload } = await getService('supertest')
            .post('/internal/telemetry/clusters/_stats')
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, '2')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send({ unencrypted: true, refreshCache: true })
            .expect(200);

          // @ts-ignore
          const favoritesStats = body[0].stats.stack_stats.kibana.plugins.favorites;
          expect(favoritesStats).to.eql({
            dashboard: {
              total: 3,
              total_users_spaces: 3,
              avg_per_user_per_space: 1,
              max_per_user_per_space: 1,
            },
          });
        });
      });

      describe('esql_query', () => {
        const type = 'esql_query';
        const metadata1 = {
          queryString: 'SELECT * FROM test1',
          createdAt: '2021-09-01T00:00:00Z',
          status: 'success',
        };

        const metadata2 = {
          queryString: 'SELECT * FROM test2',
          createdAt: '2023-09-01T00:00:00Z',
          status: 'success',
        };

        const api = {
          favorite: ({
            queryId,
            metadata,
            user,
          }: {
            queryId: string;
            metadata: object;
            user: LoginAsInteractiveUserResponse;
          }) => {
            return supertest
              .post(`/internal/content_management/favorites/${type}/${queryId}/favorite`)
              .set(user.headers)
              .set('kbn-xsrf', 'true')
              .send({ metadata });
          },
          unfavorite: ({
            queryId,
            user,
          }: {
            queryId: string;
            user: LoginAsInteractiveUserResponse;
          }) => {
            return supertest
              .post(`/internal/content_management/favorites/${type}/${queryId}/unfavorite`)
              .set(user.headers)
              .set('kbn-xsrf', 'true')
              .expect(200);
          },
          list: ({
            user,
            space,
          }: {
            user: LoginAsInteractiveUserResponse;
            space?: string;
            favoriteType?: string;
          }) => {
            return supertest
              .get(`${space ? `/s/${space}` : ''}/internal/content_management/favorites/${type}`)
              .set(user.headers)
              .set('kbn-xsrf', 'true')
              .expect(200);
          },
        };

        it('fails to favorite if metadata is not valid', async () => {
          await api
            .favorite({
              queryId: 'fav1',
              metadata: { foo: 'bar' },
              user: interactiveUser,
            })
            .expect(400);

          await api
            .favorite({
              queryId: 'fav1',
              metadata: {},
              user: interactiveUser,
            })
            .expect(400);
        });

        it('can favorite a query', async () => {
          let response = await api.list({ user: interactiveUser });
          expect(response.body.favoriteIds).to.eql([]);

          response = await api.favorite({
            queryId: 'fav1',
            user: interactiveUser,
            metadata: metadata1,
          });

          expect(response.body.favoriteIds).to.eql(['fav1']);

          response = await api.list({ user: interactiveUser });
          expect(response.body.favoriteIds).to.eql(['fav1']);
          expect(response.body.favoriteMetadata).to.eql({ fav1: metadata1 });

          response = await api.favorite({
            queryId: 'fav2',
            user: interactiveUser,
            metadata: metadata2,
          });
          expect(response.body.favoriteIds).to.eql(['fav1', 'fav2']);

          response = await api.list({ user: interactiveUser });
          expect(response.body.favoriteIds).to.eql(['fav1', 'fav2']);
          expect(response.body.favoriteMetadata).to.eql({
            fav1: metadata1,
            fav2: metadata2,
          });

          response = await api.unfavorite({ queryId: 'fav1', user: interactiveUser });
          expect(response.body.favoriteIds).to.eql(['fav2']);

          response = await api.list({ user: interactiveUser });
          expect(response.body.favoriteIds).to.eql(['fav2']);
          expect(response.body.favoriteMetadata).to.eql({
            fav2: metadata2,
          });

          response = await api.unfavorite({ queryId: 'fav2', user: interactiveUser });
          expect(response.body.favoriteIds).to.eql([]);

          response = await api.list({ user: interactiveUser });
          expect(response.body.favoriteIds).to.eql([]);
          expect(response.body.favoriteMetadata).to.eql({});
        });
      });
    });
  });
}
