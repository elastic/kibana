/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getService }) {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('Roles', () => {
    describe('Create Role', () => {
      it('should allow us to create an empty role', async () => {
        await supertest.post('/api/security/roles/empty_role')
          .set('kbn-xsrf', 'xxx')
          .send({})
          .expect(200);
      });

      it('should create a role with all privileges', async () => {
        await supertest.post('/api/security/roles/created_role')
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
                    except: [ 'geo.*' ]
                  },
                  names: ['logstash-*'],
                  privileges: ['read', 'view_index_metadata'],
                  query: `{ "match": { "geo.src": "CN" } }`,
                },
              ],
              run_as: ['watcher_user'],
            },
            kibana: [
              {
                privileges: ['all'],
              },
              {
                privileges: ['read'],
              },
            ],
          })
          .expect(200);

        const role = await es.shield.getRole({ name: 'created_role' });
        expect(role).to.eql({
          created_role: {
            cluster: ['manage'],
            indices: [
              {
                names: ['logstash-*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: {
                  grant: ['*'],
                  except: [ 'geo.*' ]
                },
                query: `{ "match": { "geo.src": "CN" } }`,
              },
            ],
            applications: [
              {
                application: 'kibana-.kibana',
                privileges: ['all'],
                resources: ['*'],
              },
              {
                application: 'kibana-.kibana',
                privileges: ['read'],
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
  });
}
