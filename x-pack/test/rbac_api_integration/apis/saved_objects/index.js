/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile, getService }) {
  const es = getService('es');

  describe('saved_objects', () => {
    before(async () => {
      await es.shield.putUser({
        username: 'a_kibana_user',
        body: {
          password: 'password',
          roles: ['kibana_rbac_user'],
          full_name: 'a kibana user',
          email: 'a_kibana_user@elastic.co',
        }
      });

      await es.shield.putUser({
        username: 'a_kibana_dashboard_only_user',
        body: {
          password: 'password',
          roles: ["kibana_rbac_dashboard_only_user"],
          full_name: 'a kibana dashboard only user',
          email: 'a_kibana_dashboard_only_user@elastic.co',
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
