/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const es = getService('es');
  const supertest = getService('supertest');

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
                field_security: {
                  grant: ['*'],
                  except: ['geo.*']
                },
                query: `{ "match": { "geo.src": "CN" } }`,
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
                field_security: {
                  grant: ['request.*'],
                  except: ['response.*']
                },
                query: `{ "match": { "host.name": "localhost" } }`,
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
                  field_security: {
                    grant: ['*'],
                    except: ['geo.*']
                  },
                  names: ['logstash-*'],
                  privileges: ['read', 'view_index_metadata'],
                  query: `{ "match": { "geo.src": "CN" } }`,
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
                field_security: {
                  grant: ['*'],
                  except: ['geo.*']
                },
                query: `{ "match": { "geo.src": "CN" } }`,
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
    });

    describe('Delete Role', () => {
      it('should delete the three roles we created', async () => {
        await supertest.delete('/api/security/role/empty_role').set('kbn-xsrf', 'xxx').expect(204);
        await supertest.delete('/api/security/role/role_with_privileges').set('kbn-xsrf', 'xxx').expect(204);
        await supertest.delete('/api/security/role/role_to_update').set('kbn-xsrf', 'xxx').expect(204);

        const emptyRole = await es.shield.getRole({ name: 'empty_role', ignore: [404] });
        expect(emptyRole).to.eql({});
        const roleWithPrivileges = await es.shield.getRole({ name: 'role_with_privileges', ignore: [404] });
        expect(roleWithPrivileges).to.eql({});
        const roleToUpdate = await es.shield.getRole({ name: 'role_to_update', ignore: [404] });
        expect(roleToUpdate).to.eql({});
      });
    });
  });
}
