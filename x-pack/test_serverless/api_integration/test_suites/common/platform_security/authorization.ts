/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { KibanaFeatureConfig, SubFeaturePrivilegeConfig } from '@kbn/features-plugin/common';
import { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import type { Role } from '@kbn/security-plugin-types-common';
import { FtrProviderContext } from '../../../ftr_provider_context';

/*
 * This file contains authorization tests that...
 *  - are applicable to all peroject types
 *  - are applicable to only search and security projects, where custom roles are enabled (role CRUD endpoints are enabled):
 *       - security/authorization/Roles
 *       - security/authorization/route access/custom roles
 *  - are applicable to only observability projects, where custom roles are not enabled (role CRUD endpoints are disabled):
 *       - security/authorization/route access/disabled/oblt only
 *
 * The test blocks use skip tags to run only the relevant tests per project type.
 */

function collectSubFeaturesPrivileges(feature: KibanaFeatureConfig) {
  return new Map(
    feature.subFeatures?.flatMap((subFeature) =>
      subFeature.privilegeGroups.flatMap(({ privileges }) =>
        privileges.map(
          (privilege) => [privilege.id, privilege] as [string, SubFeaturePrivilegeConfig]
        )
      )
    ) ?? []
  );
}

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const svlCommonApi = getService('svlCommonApi');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const platformSecurityUtils = getService('platformSecurityUtils');
  const es = getService('es');
  let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;
  let supertestAdminWithApiKey: SupertestWithRoleScopeType;

  describe('security/authorization', function () {
    this.tags(['failsOnMKI']);

    before(async function () {
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
        }
      );
      supertestAdminWithApiKey = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withCommonHeaders: true,
      });
    });
    after(async function () {
      await platformSecurityUtils.clearAllRoles();
      await supertestAdminWithApiKey.destroy();
    });

    describe('Roles', function () {
      // custom roles are not enabled for observability projects
      this.tags(['skipSvlOblt']);

      describe('Create Role', function () {
        it('should allow us to create an empty role', async function () {
          await supertestAdminWithApiKey.put('/api/security/role/empty_role').send({}).expect(204);
        });

        it('should create a role with kibana and elasticsearch privileges', async function () {
          await supertestAdminWithApiKey
            .put('/api/security/role/role_with_privileges')
            .send({
              metadata: {
                foo: 'test-metadata',
              },
              elasticsearch: {
                cluster: ['manage'],
                indices: [
                  {
                    names: ['logstash-*'],
                    privileges: ['read', 'view_index_metadata'],
                  },
                ],
              },
              kibana: [
                {
                  base: ['read'],
                },
                {
                  feature: {
                    dashboard_v2: ['read'],
                    discover_v2: ['all'],
                    ml: ['all'],
                  },
                  spaces: ['marketing', 'sales'],
                },
              ],
            })
            .expect(204);

          const role = await es.security.getRole({ name: 'role_with_privileges' });
          expect(role).toEqual({
            role_with_privileges: {
              cluster: ['manage'],
              indices: [
                {
                  names: ['logstash-*'],
                  privileges: ['read', 'view_index_metadata'],
                  allow_restricted_indices: false,
                },
              ],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: ['read'],
                  resources: ['*'],
                },
                {
                  application: 'kibana-.kibana',
                  privileges: [
                    'feature_dashboard_v2.read',
                    'feature_discover_v2.all',
                    'feature_ml.all',
                  ],
                  resources: ['space:marketing', 'space:sales'],
                },
              ],
              metadata: {
                foo: 'test-metadata',
              },
              run_as: [],
              transient_metadata: {
                enabled: true,
              },
            },
          });
        });

        it(`should create a role with kibana and FLS/DLS elasticsearch privileges`, async function () {
          await supertestAdminWithApiKey
            .put('/api/security/role/role_with_privileges_dls_fls')
            .send({
              metadata: {
                foo: 'test-metadata',
              },
              elasticsearch: {
                cluster: ['manage'],
                indices: [
                  {
                    field_security: {
                      grant: ['*'],
                      except: ['geo.*'],
                    },
                    names: ['logstash-*'],
                    privileges: ['read', 'view_index_metadata'],
                    query: `{ "match": { "geo.src": "CN" } }`,
                  },
                ],
              },
            })
            .expect(204);
        });

        // serverless only (stateful will allow)
        it(`should not create a role with 'run as' privileges`, async function () {
          await supertestAdminWithApiKey
            .put('/api/security/role/role_with_privileges')
            .send({
              metadata: {
                foo: 'test-metadata',
              },
              elasticsearch: {
                cluster: ['manage'],
                indices: [
                  {
                    names: ['logstash-*'],
                    privileges: ['read', 'view_index_metadata'],
                  },
                ],
                run_as: ['admin'],
              },
              kibana: [
                {
                  base: ['read'],
                },
                {
                  feature: {
                    dashboard_v2: ['read'],
                    discover_v2: ['all'],
                    ml: ['all'],
                  },
                  spaces: ['marketing', 'sales'],
                },
              ],
            })
            .expect(400);
        });

        // serverless only (stateful will allow)
        it(`should not create a role with remote cluster privileges`, async function () {
          await supertestAdminWithApiKey
            .put('/api/security/role/role_with_privileges')
            .send({
              metadata: {
                foo: 'test-metadata',
              },
              elasticsearch: {
                cluster: ['manage'],
                indices: [
                  {
                    names: ['logstash-*'],
                    privileges: ['read', 'view_index_metadata'],
                  },
                ],
                remote_cluster: [
                  {
                    clusters: ['remote_cluster1'],
                    privileges: ['monitor_enrich'],
                  },
                ],
              },
              kibana: [
                {
                  base: ['read'],
                },
                {
                  feature: {
                    dashboard_v2: ['read'],
                    discover_v2: ['all'],
                    ml: ['all'],
                  },
                  spaces: ['marketing', 'sales'],
                },
              ],
            })
            .expect(400);
        });

        // serverless only (stateful will allow)
        it(`should not create a role with remote index privileges`, async function () {
          await supertestAdminWithApiKey
            .put('/api/security/role/role_with_privileges')
            .send({
              metadata: {
                foo: 'test-metadata',
              },
              elasticsearch: {
                cluster: ['manage'],
                indices: [
                  {
                    names: ['logstash-*'],
                    privileges: ['read', 'view_index_metadata'],
                  },
                ],
                remote_indices: [
                  {
                    clusters: ['remote_cluster1'],
                    names: ['remote_index1', 'remote_index2'],
                    privileges: ['all'],
                  },
                ],
              },
              kibana: [
                {
                  base: ['read'],
                },
                {
                  feature: {
                    dashboard_v2: ['read'],
                    discover_v2: ['all'],
                    ml: ['all'],
                  },
                  spaces: ['marketing', 'sales'],
                },
              ],
            })
            .expect(400);
        });

        describe('with the createOnly option enabled', function () {
          it('should fail when role already exists', async function () {
            await es.security.putRole({
              name: 'test_role',
              body: {
                cluster: ['monitor'],
                indices: [
                  {
                    names: ['beats-*'],
                    privileges: ['write'],
                  },
                ],
              },
            });

            await supertestAdminWithApiKey
              .put('/api/security/role/test_role?createOnly=true')
              .send({})
              .expect(409);
          });

          it('should succeed when role does not exist', async function () {
            await supertestAdminWithApiKey
              .put('/api/security/role/new_role?createOnly=true')
              .send({})
              .expect(204);
          });
        });
      });

      describe('Read Role', function () {
        it('should get roles', async function () {
          await es.security.putRole({
            name: 'role_to_get',
            body: {
              cluster: ['manage'],
              indices: [
                {
                  names: ['logstash-*'],
                  privileges: ['read', 'view_index_metadata'],
                },
              ],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: ['read'],
                  resources: ['*'],
                },
                {
                  application: 'kibana-.kibana',
                  privileges: [
                    'feature_dashboard_v2.read',
                    'feature_discover_v2.all',
                    'feature_ml.all',
                  ],
                  resources: ['space:marketing', 'space:sales'],
                },
                {
                  application: 'apm',
                  privileges: ['apm-privilege'],
                  resources: ['*'],
                },
              ],
              metadata: {
                foo: 'test-metadata',
              },
              transient_metadata: {
                enabled: true,
              },
            },
          });

          await supertestAdminWithApiKey.get('/api/security/role/role_to_get').expect(200, {
            name: 'role_to_get',
            metadata: {
              foo: 'test-metadata',
            },
            transient_metadata: { enabled: true },
            elasticsearch: {
              cluster: ['manage'],
              indices: [
                {
                  names: ['logstash-*'],
                  privileges: ['read', 'view_index_metadata'],
                  allow_restricted_indices: false,
                },
              ],
              run_as: [],
            },
            kibana: [
              {
                base: ['read'],
                feature: {},
                spaces: ['*'],
              },
              {
                base: [],
                feature: {
                  dashboard_v2: ['read'],
                  discover_v2: ['all'],
                  ml: ['all'],
                },
                spaces: ['marketing', 'sales'],
              },
            ],

            _transform_error: [],
            _unrecognized_applications: ['apm'],
          });
        });

        it('should get roles by space id', async function () {
          await es.security.putRole({
            name: 'space_role_not_to_get',
            body: {
              cluster: ['manage'],
              indices: [
                {
                  names: ['logstash-*'],
                  privileges: ['read', 'view_index_metadata'],
                },
              ],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: [
                    'feature_dashboard_v2.read',
                    'feature_discover_v2.all',
                    'feature_ml.all',
                  ],
                  resources: ['space:marketing', 'space:sales'],
                },
              ],
              metadata: {
                foo: 'test-metadata',
              },
              transient_metadata: {
                enabled: true,
              },
            },
          });

          await es.security.putRole({
            name: 'space_role_to_get',
            body: {
              cluster: ['manage'],
              indices: [
                {
                  names: ['logstash-*'],
                  privileges: ['read', 'view_index_metadata'],
                },
              ],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: [
                    'feature_dashboard_v2.read',
                    'feature_discover_v2.all',
                    'feature_ml.all',
                  ],
                  resources: ['space:engineering', 'space:sales'],
                },
              ],
              metadata: {
                foo: 'test-metadata',
              },
              transient_metadata: {
                enabled: true,
              },
            },
          });

          await supertestAdminWithCookieCredentials
            .get('/internal/security/roles/engineering')
            .set(svlCommonApi.getInternalRequestHeader())
            .expect(200)
            .expect((res: { body: Role[] }) => {
              const roles = res.body;

              const success = roles.every((role) => {
                return (
                  role.name !== 'space_role_not_to_get' &&
                  role.kibana.some((privilege) => {
                    return (
                      privilege.spaces.includes('*') || privilege.spaces.includes('engineering')
                    );
                  })
                );
              });

              const expectedRole = roles.find((role) => role.name === 'space_role_to_get');

              expect(success).toBe(true);
              expect(expectedRole).toBeTruthy();
            });
        });
      });

      describe('Update Role', function () {
        it('should update a role with elasticsearch, kibana and other applications privileges', async function () {
          await es.security.putRole({
            name: 'role_to_update',
            body: {
              cluster: ['monitor'],
              indices: [
                {
                  names: ['beats-*'],
                  privileges: ['write'],
                },
              ],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: ['read'],
                  resources: ['*'],
                },
                {
                  application: 'apm',
                  privileges: ['apm-privilege'],
                  resources: ['*'],
                },
              ],
              metadata: {
                bar: 'old-metadata',
              },
            },
          });

          await supertestAdminWithApiKey
            .put('/api/security/role/role_to_update')
            .send({
              metadata: {
                foo: 'test-metadata',
              },
              elasticsearch: {
                cluster: ['manage'],
                indices: [
                  {
                    names: ['logstash-*'],
                    privileges: ['read', 'view_index_metadata'],
                  },
                ],
              },
              kibana: [
                {
                  feature: {
                    dashboard_v2: ['read'],
                    dev_tools: ['all'],
                  },
                  spaces: ['*'],
                },
                {
                  base: ['all'],
                  spaces: ['marketing', 'sales'],
                },
              ],
            })
            .expect(204);

          const role = await es.security.getRole({ name: 'role_to_update' });
          expect(role).toEqual({
            role_to_update: {
              cluster: ['manage'],
              indices: [
                {
                  names: ['logstash-*'],
                  privileges: ['read', 'view_index_metadata'],
                  allow_restricted_indices: false,
                },
              ],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: ['feature_dashboard_v2.read', 'feature_dev_tools.all'],
                  resources: ['*'],
                },
                {
                  application: 'kibana-.kibana',
                  privileges: ['space_all'],
                  resources: ['space:marketing', 'space:sales'],
                },
                {
                  application: 'apm',
                  privileges: ['apm-privilege'],
                  resources: ['*'],
                },
              ],
              metadata: {
                foo: 'test-metadata',
              },
              run_as: [],
              transient_metadata: {
                enabled: true,
              },
            },
          });
        });

        it(`should update a role adding DLS and FLS privileges`, async function () {
          await es.security.putRole({
            name: 'role_to_update_with_dls_fls',
            body: {
              cluster: ['monitor'],
              indices: [
                {
                  names: ['beats-*'],
                  privileges: ['write'],
                },
              ],
            },
          });

          await supertestAdminWithApiKey
            .put('/api/security/role/role_to_update_with_dls_fls')
            .send({
              elasticsearch: {
                cluster: ['manage'],
                indices: [
                  {
                    field_security: {
                      grant: ['*'],
                      except: ['geo.*'],
                    },
                    names: ['logstash-*'],
                    privileges: ['read'],
                    query: `{ "match": { "geo.src": "CN" } }`,
                  },
                ],
              },
            })
            .expect(204);

          const role = await es.security.getRole({ name: 'role_to_update_with_dls_fls' });

          expect(role.role_to_update_with_dls_fls.cluster).toEqual(['manage']);
          expect(role.role_to_update_with_dls_fls.indices[0].names).toEqual(['logstash-*']);
          expect(role.role_to_update_with_dls_fls.indices[0].query).toEqual(
            `{ "match": { "geo.src": "CN" } }`
          );
        });

        // serverless only (stateful will allow)
        it(`should not update a role with 'run as' privileges`, async function () {
          await es.security.putRole({
            name: 'role_to_update',
            body: {
              cluster: ['monitor'],
              indices: [
                {
                  names: ['beats-*'],
                  privileges: ['write'],
                },
              ],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: ['read'],
                  resources: ['*'],
                },
                {
                  application: 'apm',
                  privileges: ['apm-privilege'],
                  resources: ['*'],
                },
              ],
              metadata: {
                bar: 'old-metadata',
              },
            },
          });

          await supertestAdminWithApiKey
            .put('/api/security/role/role_to_update')
            .send({
              metadata: {
                foo: 'test-metadata',
              },
              elasticsearch: {
                cluster: ['manage'],
                indices: [
                  {
                    names: ['logstash-*'],
                    privileges: ['read', 'view_index_metadata'],
                  },
                ],
                run_as: ['admin'],
              },
              kibana: [
                {
                  feature: {
                    dashboard_v2: ['read'],
                    dev_tools: ['all'],
                  },
                  spaces: ['*'],
                },
                {
                  base: ['all'],
                  spaces: ['marketing', 'sales'],
                },
              ],
            })
            .expect(400);

          const role = await es.security.getRole({ name: 'role_to_update' });
          expect(role).toEqual({
            role_to_update: {
              cluster: ['monitor'],
              indices: [
                {
                  names: ['beats-*'],
                  privileges: ['write'],
                  allow_restricted_indices: false,
                },
              ],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: ['read'],
                  resources: ['*'],
                },
                {
                  application: 'apm',
                  privileges: ['apm-privilege'],
                  resources: ['*'],
                },
              ],
              metadata: {
                bar: 'old-metadata',
              },
              run_as: [],
              transient_metadata: {
                enabled: true,
              },
            },
          });
        });

        // serverless only (stateful will allow)
        it(`should not update a role with remote cluster privileges`, async function () {
          await es.security.putRole({
            name: 'role_to_update',
            body: {
              cluster: ['monitor'],
              indices: [
                {
                  names: ['beats-*'],
                  privileges: ['write'],
                },
              ],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: ['read'],
                  resources: ['*'],
                },
                {
                  application: 'apm',
                  privileges: ['apm-privilege'],
                  resources: ['*'],
                },
              ],
              metadata: {
                bar: 'old-metadata',
              },
            },
          });

          await supertestAdminWithApiKey
            .put('/api/security/role/role_to_update')
            .send({
              metadata: {
                foo: 'test-metadata',
              },
              elasticsearch: {
                cluster: ['manage'],
                indices: [
                  {
                    names: ['logstash-*'],
                    privileges: ['read', 'view_index_metadata'],
                  },
                ],
                remote_cluster: [
                  {
                    clusters: ['remote_cluster1'],
                    privileges: ['monitor_enrich'],
                  },
                ],
              },
              kibana: [
                {
                  feature: {
                    dashboard_v2: ['read'],
                    dev_tools: ['all'],
                  },
                  spaces: ['*'],
                },
                {
                  base: ['all'],
                  spaces: ['marketing', 'sales'],
                },
              ],
            })
            .expect(400);

          const role = await es.security.getRole({ name: 'role_to_update' });
          expect(role).toEqual({
            role_to_update: {
              cluster: ['monitor'],
              indices: [
                {
                  names: ['beats-*'],
                  privileges: ['write'],
                  allow_restricted_indices: false,
                },
              ],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: ['read'],
                  resources: ['*'],
                },
                {
                  application: 'apm',
                  privileges: ['apm-privilege'],
                  resources: ['*'],
                },
              ],
              metadata: {
                bar: 'old-metadata',
              },
              run_as: [],
              transient_metadata: {
                enabled: true,
              },
            },
          });
        });

        // serverless only (stateful will allow)
        it(`should not update a role with remote index privileges`, async function () {
          await es.security.putRole({
            name: 'role_to_update',
            body: {
              cluster: ['monitor'],
              indices: [
                {
                  names: ['beats-*'],
                  privileges: ['write'],
                },
              ],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: ['read'],
                  resources: ['*'],
                },
                {
                  application: 'apm',
                  privileges: ['apm-privilege'],
                  resources: ['*'],
                },
              ],
              metadata: {
                bar: 'old-metadata',
              },
            },
          });

          await supertestAdminWithApiKey
            .put('/api/security/role/role_to_update')
            .send({
              metadata: {
                foo: 'test-metadata',
              },
              elasticsearch: {
                cluster: ['manage'],
                indices: [
                  {
                    names: ['logstash-*'],
                    privileges: ['read', 'view_index_metadata'],
                  },
                ],
                remote_indices: [
                  {
                    clusters: ['remote_cluster1'],
                    names: ['remote_index1', 'remote_index2'],
                    privileges: ['all'],
                  },
                ],
              },
              kibana: [
                {
                  feature: {
                    dashboard_v2: ['read'],
                    dev_tools: ['all'],
                  },
                  spaces: ['*'],
                },
                {
                  base: ['all'],
                  spaces: ['marketing', 'sales'],
                },
              ],
            })
            .expect(400);

          const role = await es.security.getRole({ name: 'role_to_update' });
          expect(role).toEqual({
            role_to_update: {
              cluster: ['monitor'],
              indices: [
                {
                  names: ['beats-*'],
                  privileges: ['write'],
                  allow_restricted_indices: false,
                },
              ],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: ['read'],
                  resources: ['*'],
                },
                {
                  application: 'apm',
                  privileges: ['apm-privilege'],
                  resources: ['*'],
                },
              ],
              metadata: {
                bar: 'old-metadata',
              },
              run_as: [],
              transient_metadata: {
                enabled: true,
              },
            },
          });
        });
      });

      describe('Delete Role', function () {
        it('should delete an existing role', async function () {
          await es.security.putRole({
            name: 'role_to_delete',
            body: {
              cluster: ['monitor'],
              indices: [
                {
                  names: ['beats-*'],
                  privileges: ['write'],
                },
              ],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: ['read'],
                  resources: ['*'],
                },
                {
                  application: 'apm',
                  privileges: ['apm-privilege'],
                  resources: ['*'],
                },
              ],
              metadata: {
                bar: 'old-metadata',
              },
            },
          });
          await supertestAdminWithApiKey.delete('/api/security/role/role_to_delete').expect(204);

          const deletedRole = await es.security.getRole(
            { name: 'role_to_delete' },
            { ignore: [404] }
          );
          expect(deletedRole).toEqual({});
        });
      });
    });

    describe('route access', function () {
      describe('disabled', function () {
        it('get shared saved object permissions', async function () {
          const { body, status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/_share_saved_object_permissions'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });

        describe('oblt only', function () {
          // custom roles are not enabled for observability projects
          this.tags(['skipSvlSearch', 'skipSvlSec']);

          it('create/update role', async function () {
            const { body, status } = await supertestAdminWithApiKey.put('/api/security/role/test');
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('get role', async function () {
            const { body, status } = await supertestAdminWithApiKey.get(
              '/api/security/role/superuser'
            );
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('get all roles', async function () {
            const { body, status } = await supertestAdminWithApiKey.get('/api/security/role');
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('delete role', async function () {
            const { body, status } = await supertestAdminWithApiKey.delete(
              '/api/security/role/superuser'
            );
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('get all privileges', async function () {
            const { body, status } = await supertestAdminWithApiKey.get('/api/security/privileges');
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('get built-in elasticsearch privileges', async function () {
            const { body, status } = await supertestAdminWithCookieCredentials.get(
              '/internal/security/esPrivileges/builtin'
            );
            svlCommonApi.assertApiNotFound(body, status);
          });
        });
      });

      describe('public', function () {
        // Public but undocumented, hence 'internal' in path
        it('reset session page', async function () {
          const { status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/reset_session_page.js'
          );
          expect(status).toBe(200);
        });
      });

      describe('custom roles', function () {
        // custom roles are not enabled for observability projects
        this.tags(['skipSvlOblt']);

        describe('internal', function () {
          it('get built-in elasticsearch privileges', async function () {
            let body: any;
            let status: number;

            ({ body, status } = await supertestAdminWithCookieCredentials
              .get('/internal/security/esPrivileges/builtin')
              .set(svlCommonApi.getCommonRequestHeader()));
            // expect a rejection because we're not using the internal header
            expect(body).toEqual({
              statusCode: 400,
              error: 'Bad Request',
              message: expect.stringContaining(
                'method [get] exists but is not available with the current configuration'
              ),
            });
            expect(status).toBe(400);

            ({ status } = await supertestAdminWithCookieCredentials.get(
              '/internal/security/esPrivileges/builtin'
            ));
            expect(status).toBe(400);

            // expect success when using the internal header
            ({ body, status } = await supertestAdminWithCookieCredentials
              .get('/internal/security/esPrivileges/builtin')
              .set(svlCommonApi.getInternalRequestHeader()));
            expect(status).toBe(200);
          });
        });

        describe('public', function () {
          it('get all privileges', async function () {
            const { status } = await supertestAdminWithApiKey
              .get('/api/security/privileges')
              .set(svlCommonApi.getInternalRequestHeader());
            expect(status).toBe(200);
          });
        });
      });
    });

    describe('available features', function () {
      it('all Dashboard and Discover sub-feature privileges are disabled', async function () {
        const { body } = await supertestAdminWithCookieCredentials.get('/api/features').expect(200);

        // We should make sure that neither Discover nor Dashboard displays any sub-feature privileges in Serverless.
        // If any of these features adds a new sub-feature privilege we should make an explicit decision whether it
        // should be displayed in Serverless.
        const features = body as KibanaFeatureConfig[];
        for (const featureId of ['discover_v2', 'dashboard_v2']) {
          const feature = features.find((f) => f.id === featureId)!;
          const subFeaturesPrivileges = collectSubFeaturesPrivileges(feature);
          for (const privilege of subFeaturesPrivileges.values()) {
            log.debug(
              `Verifying that ${privilege.id} sub-feature privilege of ${featureId} feature is disabled.`
            );
            expect(privilege.disabled).toBe(true);
          }
        }
      });
    });
  });
}
