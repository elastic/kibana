/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

const application = 'has_privileges_test';

export default function ({ getService }) {

  describe('has_privileges', () => {
    before(async () => {
      const es = getService('es');

      await es.shield.postPrivileges({
        body: {
          [application]: {
            read: {
              application,
              name: 'read',
              actions: ['action:readAction1', 'action:readAction2'],
              metadata: {},
            }
          }
        }
      });

      await es.shield.putRole({
        name: 'hp_read_user',
        body: {
          cluster: [],
          index: [],
          applications: [{
            application,
            privileges: ['read'],
            resources: ['*']
          }]
        }
      });

      await es.shield.putUser({
        username: 'testuser',
        body: {
          password: 'testpassword',
          roles: ['hp_read_user'],
          full_name: 'a kibana user',
          email: 'a_kibana_rbac_user@elastic.co',
        }
      });
    });

    function createHasPrivilegesRequest(privileges) {
      const supertest = getService('esSupertestWithoutAuth');
      return supertest
        .post(`/_security/user/_has_privileges`)
        .auth('testuser', 'testpassword')
        .send({
          applications: [{
            application,
            privileges,
            resources: ['*']
          }]
        })
        .expect(200);
    }

    it('should return true when user has the requested privilege', async () => {
      await createHasPrivilegesRequest(['read'])
        .then(response => {
          expect(response.body).to.eql({
            username: 'testuser',
            has_all_requested: true,
            cluster: {},
            index: {},
            application: {
              has_privileges_test: {
                ['*']: {
                  read: true
                }
              },
            }
          });
        });
    });

    it('should return true when user has a newly created privilege', async () => {
      // verify user does not have privilege yet
      await createHasPrivilegesRequest(['action:a_new_privilege'])
        .then(response => {
          expect(response.body).to.eql({
            username: 'testuser',
            has_all_requested: false,
            cluster: {},
            index: {},
            application: {
              has_privileges_test: {
                ['*']: {
                  'action:a_new_privilege': false
                }
              },
            }
          });
        });

      // Create privilege
      const es = getService('es');
      await es.shield.postPrivileges({
        body: {
          [application]: {
            read: {
              application,
              name: 'read',
              actions: ['action:readAction1', 'action:readAction2', 'action:a_new_privilege'],
              metadata: {},
            }
          }
        }
      });

      // verify user has new privilege
      await createHasPrivilegesRequest(['action:a_new_privilege'])
        .then(response => {
          expect(response.body).to.eql({
            username: 'testuser',
            has_all_requested: true,
            cluster: {},
            index: {},
            application: {
              has_privileges_test: {
                ['*']: {
                  'action:a_new_privilege': true
                }
              },
            }
          });
        });
    });
  });
}
