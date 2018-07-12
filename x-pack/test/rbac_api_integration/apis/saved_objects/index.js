/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from "./lib/authentication";

export default function ({ loadTestFile, getService }) {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('saved_objects', () => {
    before(async () => {
      await supertest.post('/api/security/roles/kibana_legacy_user')
        .send({
          elasticsearch: {
            indices: [{
              names: ['.kibana'],
              privileges: ['manage', 'read', 'index', 'delete']
            }]
          }
        });

      await supertest.post('/api/security/roles/kibana_legacy_dashboard_only_user')
        .send({
          elasticsearch: {
            indices: [{
              names: ['.kibana'],
              privileges: ['read', 'view_index_metadata']
            }]
          }
        });

      await supertest.post('/api/security/roles/kibana_rbac_user')
        .send({
          kibana: [
            {
              privileges: ['all']
            }
          ]
        });

      await supertest.post('/api/security/roles/kibana_rbac_dashboard_only_user')
        .send({
          kibana: [
            {
              privileges: ['read']
            }
          ]
        });

      await es.shield.putUser({
        username: AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME,
        body: {
          password: AUTHENTICATION.NOT_A_KIBANA_USER.PASSWORD,
          roles: [],
          full_name: 'not a kibana user',
          email: 'not_a_kibana_user@elastic.co',
        }
      });

      await es.shield.putUser({
        username: AUTHENTICATION.KIBANA_LEGACY_USER.USERNAME,
        body: {
          password: AUTHENTICATION.KIBANA_LEGACY_USER.PASSWORD,
          roles: ['kibana_legacy_user'],
          full_name: 'a kibana legacy user',
          email: 'a_kibana_legacy_user@elastic.co',
        }
      });

      await es.shield.putUser({
        username: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME,
        body: {
          password: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.PASSWORD,
          roles: ["kibana_legacy_dashboard_only_user"],
          full_name: 'a kibana legacy dashboard only user',
          email: 'a_kibana_legacy_dashboard_only_user@elastic.co',
        }
      });

      await es.shield.putUser({
        username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
        body: {
          password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
          roles: ['kibana_rbac_user'],
          full_name: 'a kibana user',
          email: 'a_kibana_rbac_user@elastic.co',
        }
      });

      await es.shield.putUser({
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        body: {
          password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
          roles: ["kibana_rbac_dashboard_only_user"],
          full_name: 'a kibana dashboard only user',
          email: 'a_kibana_rbac_dashboard_only_user@elastic.co',
        }
      });
    });
    loadTestFile(require.resolve('./bulk_get'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./update'));
  });
}
