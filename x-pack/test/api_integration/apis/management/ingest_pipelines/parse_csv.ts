/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');
  const url = `/api/ingest_pipelines/parse_csv`;

  const username = 'ingest_user';
  const roleName = 'ingest_role';
  const password = `${username}-password`;

  const username2 = 'ingest_user_no_access';
  const roleName2 = 'ingest_role_no_access';
  const password2 = `${username}-password`;

  describe('parse csv', function () {
    before(async () => {
      await security.role.create(roleName, {
        kibana: [],
        elasticsearch: {
          elasticsearch: { cluster: ['manage_pipeline', 'cluster:monitor/nodes/info'] },
        },
      });

      await security.user.create(username, {
        password,
        roles: [roleName],
        full_name: 'a kibana user',
      });

      await security.role.create(roleName2, {
        kibana: [],
        elasticsearch: {
          elasticsearch: { cluster: ['monitor'] },
        },
      });

      await security.user.create(username2, {
        password2,
        roles: [roleName],
        full_name: 'a kibana user',
      });
    });

    after(async () => {
      await security.role.delete('ingest_role');
      await security.user.delete('ingest_user');
      await security.role.delete('ingest_role_no_access');
      await security.user.delete('ingest_user_no_access');
    });

    describe('privs', () => {
      it('has access', async () => {
        await supertestWithoutAuth
          .post(url)
          .set('kbn-xsrf', 'xxx')
          .auth(username, password)
          .send({
            file: '',
            copyAction: 'copy',
          })
          .expect(200);
      });

      it('no access', async () => {
        await supertestWithoutAuth
          .post(url)
          .set('kbn-xsrf', 'xxx')
          .auth(username2, password2)
          .send({
            file: '',
            copyAction: 'copy',
          })
          .expect(401);
      });
    });
  });
}
