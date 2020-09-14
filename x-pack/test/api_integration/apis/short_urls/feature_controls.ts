/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function featureControlsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('feature controls', () => {
    const kibanaUsername = 'kibana_admin';
    const kibanaUserRoleName = 'kibana_admin';

    const kibanaUserPassword = `${kibanaUsername}-password`;

    let urlId: string;

    // a sampling of features to test against
    const features = [
      {
        featureId: 'discover',
        canAccess: true,
        canCreate: true,
      },
      {
        featureId: 'dashboard',
        canAccess: true,
        canCreate: true,
      },
      {
        featureId: 'visualize',
        canAccess: true,
        canCreate: true,
      },
      {
        featureId: 'infrastructure',
        canAccess: true,
        canCreate: false,
      },
      {
        featureId: 'canvas',
        canAccess: true,
        canCreate: false,
      },
      {
        featureId: 'maps',
        canAccess: true,
        canCreate: false,
      },
      {
        featureId: 'unknown-feature',
        canAccess: false,
        canCreate: false,
      },
    ];

    before(async () => {
      for (const feature of features) {
        await security.role.create(`${feature.featureId}-role`, {
          kibana: [
            {
              base: [],
              feature: {
                [feature.featureId]: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });
        await security.role.create(`${feature.featureId}-minimal-role`, {
          kibana: [
            {
              base: [],
              feature: {
                [feature.featureId]: ['minimal_all'],
              },
              spaces: ['*'],
            },
          ],
        });
        await security.role.create(`${feature.featureId}-minimal-shorten-role`, {
          kibana: [
            {
              base: [],
              feature: {
                [feature.featureId]: ['minimal_read', 'url_create'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create(`${feature.featureId}-user`, {
          password: kibanaUserPassword,
          roles: [`${feature.featureId}-role`],
          full_name: 'a kibana user',
        });

        await security.user.create(`${feature.featureId}-minimal-user`, {
          password: kibanaUserPassword,
          roles: [`${feature.featureId}-minimal-role`],
          full_name: 'a kibana user',
        });

        await security.user.create(`${feature.featureId}-minimal-shorten-user`, {
          password: kibanaUserPassword,
          roles: [`${feature.featureId}-minimal-shorten-role`],
          full_name: 'a kibana user',
        });
      }

      await security.user.create(kibanaUsername, {
        password: kibanaUserPassword,
        roles: [kibanaUserRoleName],
        full_name: 'a kibana user',
      });

      await supertest
        .post(`/api/shorten_url`)
        .auth(kibanaUsername, kibanaUserPassword)
        .set('kbn-xsrf', 'foo')
        .send({ url: '/app/kibana#foo/bar/baz' })
        .then((resp: Record<string, any>) => {
          urlId = resp.body.urlId;
        });
    });

    after(async () => {
      const users = features.flatMap((feature) => [
        security.user.delete(`${feature.featureId}-user`),
        security.user.delete(`${feature.featureId}-minimal-user`),
        security.user.delete(`${feature.featureId}-minimal-shorten-user`),
      ]);
      const roles = features.flatMap((feature) => [
        security.role.delete(`${feature.featureId}-role`),
        security.role.delete(`${feature.featureId}-minimal-role`),
        security.role.delete(`${feature.featureId}-minimal-shorten-role`),
      ]);
      await Promise.all([...users, ...roles]);
      await security.user.delete(kibanaUsername);
    });

    features.forEach((feature) => {
      it(`users with "read" access to ${feature.featureId} ${
        feature.canAccess ? 'should' : 'should not'
      } be able to access short-urls`, async () => {
        await supertest
          .get(`/goto/${urlId}`)
          .auth(`${feature.featureId}-user`, kibanaUserPassword)
          .then((resp: Record<string, any>) => {
            if (feature.canAccess) {
              expect(resp.status).to.eql(302);
              expect(resp.headers.location).to.eql('/app/kibana#foo/bar/baz');
            } else {
              expect(resp.status).to.eql(403);
              expect(resp.headers.location).to.eql(undefined);
            }
          });
      });

      it(`users with "minimal_all" access to ${feature.featureId} should not be able to create short-urls`, async () => {
        await supertest
          .post(`/api/shorten_url`)
          .auth(`${feature.featureId}-minimal-user`, kibanaUserPassword)
          .set('kbn-xsrf', 'foo')
          .send({ url: '/app/dashboard' })
          .then((resp: Record<string, any>) => {
            expect(resp.status).to.eql(403);
            expect(resp.body.message).to.eql('Unable to create url');
          });
      });

      it(`users with "url_create" access to ${feature.featureId} ${
        feature.canCreate ? 'should' : 'should not'
      } be able to create short-urls`, async () => {
        await supertest
          .post(`/api/shorten_url`)
          .auth(`${feature.featureId}-minimal-shorten-user`, kibanaUserPassword)
          .set('kbn-xsrf', 'foo')
          .send({ url: '/app/dashboard' })
          .then((resp: Record<string, any>) => {
            if (feature.canCreate) {
              expect(resp.status).to.eql(200);
            } else {
              expect(resp.status).to.eql(403);
              expect(resp.body.message).to.eql('Unable to create url');
            }
          });
      });
    });
  });
}
