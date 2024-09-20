/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Role } from '@kbn/security-plugin-types-common';
import { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

// Notes:
// Test coverage comes from stateful test suite: x-pack/test/api_integration/apis/security/roles.ts
// It has been modified to work for serverless by removing invalid options (run_as, allow_restricted_indices, etc).
//
// Note: this suite is currently only called from the feature flags test configs, e.g.
// x-pack/test_serverless/api_integration/test_suites/search/config.feature_flags.ts
//
// This suite should be converted into a deployment agnostic suite when the native roles
// feature flags are enabled permanently in serverless. Additionally, the route access tests
// for the roles APIs in authorization.ts should also get updated at that time.
// kbnServerArgs: ['--xpack.security.roleManagementEnabled=true'],
// esServerArgs: ['xpack.security.authc.native_roles.enabled=true'],

export default function ({ getService }: FtrProviderContext) {
  const platformSecurityUtils = getService('platformSecurityUtils');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestAdminWithApiKey: SupertestWithRoleScopeType;
  let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;
  const es = getService('es');

  describe('security', function () {
    describe('Roles', () => {
      before(async () => {
        supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
          'admin',
          {
            useCookieHeader: true,
            withInternalHeaders: true,
          }
        );
        supertestAdminWithApiKey = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
          withInternalHeaders: true,
        });
      });
      after(async () => {
        await platformSecurityUtils.clearAllRoles();
      });

      describe('Create Role', () => {
        it('should allow us to create an empty role', async () => {
          await supertestAdminWithApiKey.put('/api/security/role/empty_role').send({}).expect(204);
        });

        it('should create a role with kibana and elasticsearch privileges', async () => {
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
                    dashboard: ['read'],
                    discover: ['all'],
                    ml: ['all'],
                  },
                  spaces: ['marketing', 'sales'],
                },
              ],
            })
            .expect(204);

          const role = await es.security.getRole({ name: 'role_with_privileges' });
          expect(role).to.eql({
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
                  privileges: ['feature_dashboard.read', 'feature_discover.all', 'feature_ml.all'],
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

        it(`should create a role with kibana and FLS/DLS elasticsearch privileges`, async () => {
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
        it(`should not create a role with 'run as' privileges`, async () => {
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
                    dashboard: ['read'],
                    discover: ['all'],
                    ml: ['all'],
                  },
                  spaces: ['marketing', 'sales'],
                },
              ],
            })
            .expect(400);
        });

        // serverless only (stateful will allow)
        it(`should not create a role with remote cluster privileges`, async () => {
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
                    dashboard: ['read'],
                    discover: ['all'],
                    ml: ['all'],
                  },
                  spaces: ['marketing', 'sales'],
                },
              ],
            })
            .expect(400);
        });

        // serverless only (stateful will allow)
        it(`should not create a role with remote index privileges`, async () => {
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
                    dashboard: ['read'],
                    discover: ['all'],
                    ml: ['all'],
                  },
                  spaces: ['marketing', 'sales'],
                },
              ],
            })
            .expect(400);
        });

        describe('with the createOnly option enabled', () => {
          it('should fail when role already exists', async () => {
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

          it('should succeed when role does not exist', async () => {
            await supertestAdminWithApiKey
              .put('/api/security/role/new_role?createOnly=true')
              .send({})
              .expect(204);
          });
        });
      });

      describe('Read Role', () => {
        it('should get roles', async () => {
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
                  privileges: ['feature_dashboard.read', 'feature_discover.all', 'feature_ml.all'],
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
                  dashboard: ['read'],
                  discover: ['all'],
                  ml: ['all'],
                },
                spaces: ['marketing', 'sales'],
              },
            ],

            _transform_error: [],
            _unrecognized_applications: ['apm'],
          });
        });

        it('should get roles by space id', async () => {
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
                  privileges: ['feature_dashboard.read', 'feature_discover.all', 'feature_ml.all'],
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
                  privileges: ['feature_dashboard.read', 'feature_discover.all', 'feature_ml.all'],
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
            .expect(200)
            .expect((res: { body: Role[] }) => {
              const roles = res.body;
              expect(roles).to.be.an('array');

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

              expect(success).to.be(true);
              expect(expectedRole).to.be.an('object');
            });
        });
      });

      describe('Update Role', () => {
        it('should update a role with elasticsearch, kibana and other applications privileges', async () => {
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
                    dashboard: ['read'],
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
          expect(role).to.eql({
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
                  privileges: ['feature_dashboard.read', 'feature_dev_tools.all'],
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

        it(`should update a role adding DLS and FLS privileges`, async () => {
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

          expect(role.role_to_update_with_dls_fls.cluster).to.eql(['manage']);
          expect(role.role_to_update_with_dls_fls.indices[0].names).to.eql(['logstash-*']);
          expect(role.role_to_update_with_dls_fls.indices[0].query).to.eql(
            `{ "match": { "geo.src": "CN" } }`
          );
        });

        // serverless only (stateful will allow)
        it(`should not update a role with 'run as' privileges`, async () => {
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
                    dashboard: ['read'],
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
          expect(role).to.eql({
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
        it(`should not update a role with remote cluster privileges`, async () => {
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
                    dashboard: ['read'],
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
          expect(role).to.eql({
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
        it(`should not update a role with remote index privileges`, async () => {
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
                    dashboard: ['read'],
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
          expect(role).to.eql({
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

      describe('Delete Role', () => {
        it('should delete an existing role', async () => {
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
          expect(deletedRole).to.eql({});
        });
      });
    });
  });
}
