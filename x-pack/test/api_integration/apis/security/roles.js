/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getService }) {
  const es = getService('es');
  const supertest = getService('supertest');
  const config = getService('config');
  const basic = config.get('esTestCluster.license') === 'basic';

  describe('Roles', () => {
    describe('Create Role', () => {
      it('should allow us to create an empty role', async () => {
        await supertest.put('/api/security/role/empty_role')
          .set('kbn-xsrf', 'xxx')
          .send({})
          .expect(204);
      });

      it('should create a role with kibana and elasticsearch privileges', async () => {
        await supertest.put('/api/security/role/role_with_privileges')
          .set('kbn-xsrf', 'xxx')
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
              run_as: ['watcher_user'],
            },
            kibana: {
              global: ['all', 'read'],
              space: {}
            }
          })
          .expect(204);

        const role = await es.shield.getRole({ name: 'role_with_privileges' });
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
                privileges: ['all', 'read'],
                resources: ['*'],
              }
            ],
            run_as: ['watcher_user'],
            metadata: {
              foo: 'test-metadata',
            },
            transient_metadata: {
              enabled: true,
            },
          }
        });
      });

      it(`should ${basic ? 'not' : ''} create a role with kibana and FLS/DLS elasticsearch
      privileges on ${basic ? 'basic' : 'trial'} licenses`, async () => {
        await supertest.put('/api/security/role/role_with_privileges_dls_fls')
          .set('kbn-xsrf', 'xxx')
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
                    except: ['geo.*']
                  },
                  names: ['logstash-*'],
                  privileges: ['read', 'view_index_metadata'],
                  query: `{ "match": { "geo.src": "CN" } }`,
                },
              ],
              run_as: ['watcher_user'],
            },
          })
          .expect(basic ? 403 : 204);
      });
    });

    describe('Update Role', () => {
      it('should update a role with elasticsearch, kibana and other applications privileges', async () => {
        await es.shield.putRole({
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
                application: 'logstash-default',
                privileges: ['logstash-privilege'],
                resources: ['*'],
              },
            ],
            run_as: ['reporting_user'],
            metadata: {
              bar: 'old-metadata',
            },
          }
        });

        await supertest.put('/api/security/role/role_to_update')
          .set('kbn-xsrf', 'xxx')
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
                  allow_restricted_indices: true,
                },
              ],
              run_as: ['watcher_user'],
            },
            kibana: {
              global: ['all', 'read'],
              space: {}
            }
          })
          .expect(204);

        const role = await es.shield.getRole({ name: 'role_to_update' });
        expect(role).to.eql({
          role_to_update: {
            cluster: ['manage'],
            indices: [
              {
                names: ['logstash-*'],
                privileges: ['read', 'view_index_metadata'],
                allow_restricted_indices: true,
              },
            ],
            applications: [
              {
                application: 'kibana-.kibana',
                privileges: ['all', 'read'],
                resources: ['*'],
              },
              {
                application: 'logstash-default',
                privileges: ['logstash-privilege'],
                resources: ['*'],
              },
            ],
            run_as: ['watcher_user'],
            metadata: {
              foo: 'test-metadata',
            },
            transient_metadata: {
              enabled: true,
            },
          }
        });
      });

      it(`should ${basic ? 'not' : ''} update a role adding DLS and TLS priviledges
      when using ${basic ? 'basic' : 'trial'} license`, async () => {

        await es.shield.putRole({
          name: 'role_to_update_with_dls_fls',
          body: {
            cluster: ['monitor'],
            indices: [
              {
                names: ['beats-*'],
                privileges: ['write'],
              },
            ],
            run_as: ['reporting_user'],
          }
        });

        await supertest.put('/api/security/role/role_to_update_with_dls_fls')
          .set('kbn-xsrf', 'xxx')
          .send({
            elasticsearch: {
              cluster: ['manage'],
              indices: [
                {
                  field_security: {
                    grant: ['*'],
                    except: ['geo.*']
                  },
                  names: ['logstash-*'],
                  privileges: ['read'],
                  query: `{ "match": { "geo.src": "CN" } }`,
                },
              ],
              run_as: ['watcher_user'],
            },
          })
          .expect(basic ? 403 : 204);

        const role = await es.shield.getRole({ name: 'role_to_update_with_dls_fls' });

        expect(role.role_to_update_with_dls_fls.cluster).to.eql(basic ? ['monitor'] : ['manage']);
        expect(role.role_to_update_with_dls_fls.run_as).to.eql(basic ? ['reporting_user'] : ['watcher_user']);
        expect(role.role_to_update_with_dls_fls.indices[0].names).to.eql(basic ? ['beats-*'] : ['logstash-*']);
        expect(role.role_to_update_with_dls_fls.indices[0].query).to.eql(basic ? undefined : `{ "match": { "geo.src": "CN" } }`);

      });
    });

    describe('Delete Role', () => {
      it('should delete the roles we created', async () => {

        await supertest.delete('/api/security/role/empty_role').set('kbn-xsrf', 'xxx').expect(204);
        await supertest.delete('/api/security/role/role_with_privileges').set('kbn-xsrf', 'xxx').expect(204);
        await supertest.delete('/api/security/role/role_with_privileges_dls_fls').set('kbn-xsrf', 'xxx').expect(basic ? 404 : 204);
        await supertest.delete('/api/security/role/role_to_update').set('kbn-xsrf', 'xxx').expect(204);
        await supertest.delete('/api/security/role/role_to_update_with_dls_fls').set('kbn-xsrf', 'xxx').expect(204);

        const emptyRole = await es.shield.getRole({ name: 'empty_role', ignore: [404] });
        expect(emptyRole).to.eql({});
        const roleWithPrivileges = await es.shield.getRole({ name: 'role_with_privileges', ignore: [404] });
        expect(roleWithPrivileges).to.eql({});
        const roleWithPriviledgesDlsFls = await es.shield.getRole({ name: 'role_with_privileges_dls_fls', ignore: [404] });
        expect(roleWithPriviledgesDlsFls).to.eql({});
        const roleToUpdate = await es.shield.getRole({ name: 'role_to_update', ignore: [404] });
        expect(roleToUpdate).to.eql({});
        const roleToUpdateWithDlsFls = await es.shield.getRole({ name: 'role_to_update_with_dls_fls', ignore: [404] });
        expect(roleToUpdateWithDlsFls).to.eql({});

      });
    });
  });
}
