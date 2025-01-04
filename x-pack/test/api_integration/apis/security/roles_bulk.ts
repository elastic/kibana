/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const config = getService('config');
  const basic = config.get('esTestCluster.license') === 'basic';

  describe('Roles Bulk', () => {
    after(async () => {
      await supertest.delete('/api/security/role/bulk_role_1').set('kbn-xsrf', 'xxx').expect(204);
      await supertest.delete('/api/security/role/bulk_role_2').set('kbn-xsrf', 'xxx').expect(204);
      await supertest
        .delete('/api/security/role/bulk_role_valid')
        .set('kbn-xsrf', 'xxx')
        .expect(204);
      await supertest
        .delete('/api/security/role/bulk_role_with_privilege_1')
        .set('kbn-xsrf', 'xxx')
        .expect(204);
      await supertest
        .delete('/api/security/role/bulk_role_with_privilege_2')
        .set('kbn-xsrf', 'xxx')
        .expect(204);
      await supertest
        .delete('/api/security/role/bulk_role_to_update_1')
        .set('kbn-xsrf', 'xxx')
        .expect(204);
      await supertest
        .delete('/api/security/role/bulk_role_to_update_2')
        .set('kbn-xsrf', 'xxx')
        .expect(204);

      const emptyRoles = await es.security.getRole(
        { name: 'bulk_role_1,bulk_role_2' },
        { ignore: [404] }
      );
      expect(emptyRoles).to.eql({});
      const rolesWithPrivileges = await es.security.getRole(
        { name: 'bulk_role_with_privilege_1,bulk_role_with_privilege_2,bulk_role_valid' },
        { ignore: [404] }
      );
      expect(rolesWithPrivileges).to.eql({});

      const rolesToUpdate = await es.security.getRole(
        { name: 'bulk_role_to_update_1,bulk_role_to_update_2' },
        { ignore: [404] }
      );
      expect(rolesToUpdate).to.eql({});
    });

    describe('Create Roles', () => {
      it('should allow us to create empty roles', async () => {
        await supertest
          .post('/api/security/roles')
          .set('kbn-xsrf', 'xxx')
          .send({
            roles: {
              bulk_role_1: {},
              bulk_role_2: {},
            },
          })
          .expect(200)
          .then((response) => {
            expect(response.body).to.eql({ created: ['bulk_role_1', 'bulk_role_2'] });
          });
      });

      it('should create roles with kibana and elasticsearch privileges', async () => {
        await supertest
          .post('/api/security/roles')
          .set('kbn-xsrf', 'xxx')
          .send({
            roles: {
              bulk_role_with_privilege_1: {
                elasticsearch: {
                  cluster: ['manage'],
                  indices: [
                    {
                      names: ['logstash-*'],
                      privileges: ['read', 'view_index_metadata'],
                    },
                  ],
                  run_as: ['watcher_user'],
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
              },
              bulk_role_with_privilege_2: {
                elasticsearch: {
                  cluster: ['manage'],
                  indices: [
                    {
                      names: ['logstash-*'],
                      privileges: ['read', 'view_index_metadata'],
                    },
                  ],
                  run_as: ['watcher_user'],
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
              },
            },
          })
          .expect(200);

        const role = await es.security.getRole({ name: 'bulk_role_with_privilege_1' });
        expect(role).to.eql({
          bulk_role_with_privilege_1: {
            metadata: {},
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
            run_as: ['watcher_user'],
            transient_metadata: {
              enabled: true,
            },
          },
        });
      });

      it(`should ${basic ? 'not' : ''} create a role with kibana and FLS/DLS elasticsearch
        privileges on ${basic ? 'basic' : 'trial'} licenses`, async () => {
        await supertest
          .post('/api/security/roles')
          .set('kbn-xsrf', 'xxx')
          .send({
            roles: {
              role_with_privileges_dls_fls: {
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
                  run_as: ['watcher_user'],
                },
              },
            },
          })
          .expect(200)
          .then((response) => {
            const { errors, created } = response.body;
            if (basic) {
              expect(created).to.be(undefined);
              expect(errors).to.have.property('role_with_privileges_dls_fls');
              expect(errors.role_with_privileges_dls_fls.type).to.be('security_exception');
              expect(errors.role_with_privileges_dls_fls.reason).to.contain(
                `current license is non-compliant for [field and document level security]`
              );
            } else {
              expect(created).to.eql(['role_with_privileges_dls_fls']);
              expect(errors).to.be(undefined);
            }
          });
      });

      it('should return noop if roles exist and did not change', async () => {
        await supertest
          .post('/api/security/roles')
          .set('kbn-xsrf', 'xxx')
          .send({
            roles: {
              bulk_role_1: {},
              bulk_role_2: {},
            },
          })
          .expect(200)
          .then((response) => {
            expect(response.body).to.eql({ noop: ['bulk_role_1', 'bulk_role_2'] });
          });
      });

      it('should return validation errors for roles that failed', async () => {
        await supertest
          .post('/api/security/roles')
          .set('kbn-xsrf', 'xxx')
          .send({
            roles: {
              bulk_role_es_invalid: {
                elasticsearch: {
                  cluster: ['bla'],
                },
              },
              bulk_role_kibana_invalid: {
                kibana: [
                  {
                    spaces: ['bar-space'],
                    base: [],
                    feature: {
                      fleetv2: ['all', 'read'],
                    },
                  },
                ],
              },
              bulk_role_valid: {
                elasticsearch: {
                  cluster: ['all'],
                },
              },
            },
          })
          .expect(200)
          .then((response) => {
            const { created, errors } = response.body;
            expect(created).to.eql(['bulk_role_valid']);
            expect(errors).to.have.property('bulk_role_es_invalid');
            expect(errors).to.have.property('bulk_role_kibana_invalid');
          });
      });
    });

    describe('Update Roles', () => {
      it('should update roles with elasticsearch, kibana and other applications privileges', async () => {
        await es.security.putRole({
          name: 'bulk_role_to_update_1',
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
                application: 'logstash-default',
                privileges: ['logstash-privilege'],
                resources: ['*'],
              },
            ],
            run_as: ['reporting_user'],
            metadata: {
              bar: 'old-metadata',
            },
          },
        });
        await es.security.putRole({ name: 'bulk_role_to_update_2', body: {} });

        await supertest
          .post('/api/security/roles')
          .set('kbn-xsrf', 'xxx')
          .send({
            roles: {
              bulk_role_to_update_1: {
                metadata: {
                  foo: 'test-metadata',
                },
                elasticsearch: {
                  cluster: ['manage'],
                  indices: [
                    {
                      names: ['logstash-*'],
                      privileges: ['read', 'view_index_metadata'],
                      allow_restricted_indices: true,
                    },
                  ],
                  run_as: ['watcher_user'],
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
              },
              bulk_role_to_update_2: {
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
                    spaces: ['observability', 'sales'],
                  },
                ],
              },
            },
          })
          .expect(200)
          .then((response) => {
            expect(response.body).to.eql({
              updated: ['bulk_role_to_update_1', 'bulk_role_to_update_2'],
            });
          });

        const role = await es.security.getRole({
          name: 'bulk_role_to_update_1,bulk_role_to_update_2',
        });

        expect(role).to.eql({
          bulk_role_to_update_1: {
            cluster: ['manage'],
            indices: [
              {
                names: ['logstash-*'],
                privileges: ['read', 'view_index_metadata'],
                allow_restricted_indices: true,
              },
            ],
            metadata: {
              bar: 'old-metadata',
              foo: 'test-metadata',
            },
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
                application: 'logstash-default',
                privileges: ['logstash-privilege'],
                resources: ['*'],
              },
            ],
            run_as: ['watcher_user'],
            transient_metadata: {
              enabled: true,
            },
          },
          bulk_role_to_update_2: {
            cluster: [],
            indices: [],
            applications: [
              {
                application: 'kibana-.kibana',
                privileges: ['feature_dashboard_v2.read', 'feature_dev_tools.all'],
                resources: ['*'],
              },
              {
                application: 'kibana-.kibana',
                privileges: ['space_all'],
                resources: ['space:observability', 'space:sales'],
              },
            ],
            run_as: [],
            metadata: {},
            transient_metadata: {
              enabled: true,
            },
          },
        });
      });
    });
  });
}
