/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { API_URLS } from '@kbn/uptime-plugin/common/constants';
import { serviceApiKeyPrivileges } from '@kbn/uptime-plugin/server/lib/synthetics_service/get_api_key';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('/internal/uptime/service/enablement', () => {
    const supertestWithAuth = getService('supertest');
    const supertest = getService('supertestWithoutAuth');
    const security = getService('security');

    before(async () => {
      await supertestWithAuth.delete(API_URLS.SYNTHETICS_ENABLEMENT).set('kbn-xsrf', 'true');
    });

    describe('[GET] - /internal/uptime/service/enablement', () => {
      ['manage_security', 'manage_api_key', 'manage_own_api_key'].forEach((privilege) => {
        it(`returns response for an admin with priviledge ${privilege}`, async () => {
          const username = 'admin';
          const roleName = `synthetics_admin-${privilege}`;
          const password = `${username}-password`;
          try {
            await security.role.create(roleName, {
              kibana: [
                {
                  feature: {
                    uptime: ['all'],
                  },
                  spaces: ['*'],
                },
              ],
              elasticsearch: {
                cluster: [privilege, ...serviceApiKeyPrivileges.cluster],
                indices: serviceApiKeyPrivileges.index,
              },
            });

            await security.user.create(username, {
              password,
              roles: [roleName],
              full_name: 'a kibana user',
            });

            const apiResponse = await supertest
              .get(API_URLS.SYNTHETICS_ENABLEMENT)
              .auth(username, password)
              .set('kbn-xsrf', 'true')
              .expect(200);

            expect(apiResponse.body).eql({
              areApiKeysEnabled: true,
              canEnable: true,
              isEnabled: false,
            });
          } finally {
            await security.user.delete(username);
            await security.role.delete(roleName);
          }
        });
      });

      it('returns response for an uptime all user without admin privileges', async () => {
        const username = 'uptime';
        const roleName = 'uptime_user';
        const password = `${username}-password`;
        try {
          await security.role.create(roleName, {
            kibana: [
              {
                feature: {
                  uptime: ['all'],
                },
                spaces: ['*'],
              },
            ],
            elasticsearch: {},
          });

          await security.user.create(username, {
            password,
            roles: [roleName],
            full_name: 'a kibana user',
          });

          const apiResponse = await supertest
            .get(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(apiResponse.body).eql({
            areApiKeysEnabled: true,
            canEnable: false,
            isEnabled: false,
          });
        } finally {
          await security.role.delete(roleName);
          await security.user.delete(username);
        }
      });
    });

    describe('[POST] - /internal/uptime/service/enablement', () => {
      it('with an admin', async () => {
        const username = 'admin';
        const roleName = `synthetics_admin`;
        const password = `${username}-password`;
        try {
          await security.role.create(roleName, {
            kibana: [
              {
                feature: {
                  uptime: ['all'],
                },
                spaces: ['*'],
              },
            ],
            elasticsearch: {
              cluster: ['manage_security', ...serviceApiKeyPrivileges.cluster],
              indices: serviceApiKeyPrivileges.index,
            },
          });

          await security.user.create(username, {
            password,
            roles: [roleName],
            full_name: 'a kibana user',
          });

          await supertest
            .post(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);
          const apiResponse = await supertest
            .get(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(apiResponse.body).eql({
            areApiKeysEnabled: true,
            canEnable: true,
            isEnabled: true,
          });
        } finally {
          await supertest
            .delete(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);
          await security.user.delete(username);
          await security.role.delete(roleName);
        }
      });

      it('with an uptime user', async () => {
        const username = 'uptime';
        const roleName = `uptime_user`;
        const password = `${username}-password`;
        try {
          await security.role.create(roleName, {
            kibana: [
              {
                feature: {
                  uptime: ['all'],
                },
                spaces: ['*'],
              },
            ],
            elasticsearch: {},
          });

          await security.user.create(username, {
            password,
            roles: [roleName],
            full_name: 'a kibana user',
          });

          await supertest
            .post(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(403);
          const apiResponse = await supertest
            .get(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);
          expect(apiResponse.body).eql({
            areApiKeysEnabled: true,
            canEnable: false,
            isEnabled: false,
          });
        } finally {
          await security.user.delete(username);
          await security.role.delete(roleName);
        }
      });
    });

    describe('[DELETE] - /internal/uptime/service/enablement', () => {
      it('with an admin', async () => {
        const username = 'admin';
        const roleName = `synthetics_admin`;
        const password = `${username}-password`;
        try {
          await security.role.create(roleName, {
            kibana: [
              {
                feature: {
                  uptime: ['all'],
                },
                spaces: ['*'],
              },
            ],
            elasticsearch: {
              cluster: ['manage_security', ...serviceApiKeyPrivileges.cluster],
              indices: serviceApiKeyPrivileges.index,
            },
          });

          await security.user.create(username, {
            password,
            roles: [roleName],
            full_name: 'a kibana user',
          });

          await supertest
            .post(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);
          await supertest
            .delete(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);
          const apiResponse = await supertest
            .get(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(apiResponse.body).eql({
            areApiKeysEnabled: true,
            canEnable: true,
            isEnabled: false,
          });
        } finally {
          await security.user.delete(username);
          await security.role.delete(roleName);
        }
      });

      it('with an uptime user', async () => {
        const username = 'uptime';
        const roleName = `uptime_user`;
        const password = `${username}-password`;
        try {
          await security.role.create(roleName, {
            kibana: [
              {
                feature: {
                  uptime: ['all'],
                },
                spaces: ['*'],
              },
            ],
            elasticsearch: {},
          });

          await security.user.create(username, {
            password,
            roles: [roleName],
            full_name: 'a kibana user',
          });

          await supertestWithAuth
            .post(API_URLS.SYNTHETICS_ENABLEMENT)
            .set('kbn-xsrf', 'true')
            .expect(200);
          await supertest
            .delete(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(403);
          const apiResponse = await supertest
            .get(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);
          expect(apiResponse.body).eql({
            areApiKeysEnabled: true,
            canEnable: false,
            isEnabled: true,
          });
        } finally {
          await supertestWithAuth
            .delete(API_URLS.SYNTHETICS_ENABLEMENT)
            .set('kbn-xsrf', 'true')
            .expect(200);
          await security.user.delete(username);
          await security.role.delete(roleName);
        }
      });
    });
  });
}
