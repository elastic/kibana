/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { API_BASE_PATH } from '../../../../plugins/upgrade_assistant/common/constants';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('Elasticsearch deprecations', function () {
    this.onlyEsVersion('<=7');

    describe('GET /api/upgrade_assistant/es_deprecations', () => {
      describe('error handling', () => {
        it('handles auth error', async () => {
          const ROLE_NAME = 'authErrorRole';
          const USER_NAME = 'authErrorUser';
          const USER_PASSWORD = 'password';

          try {
            await security.role.create(ROLE_NAME, {});
            await security.user.create(USER_NAME, {
              password: USER_PASSWORD,
              roles: [ROLE_NAME],
            });

            await supertestWithoutAuth
              .get(`${API_BASE_PATH}/es_deprecations`)
              .auth(USER_NAME, USER_PASSWORD)
              .set('kbn-xsrf', 'kibana')
              .send()
              .expect(403);
          } finally {
            await security.role.delete(ROLE_NAME);
            await security.user.delete(USER_NAME);
          }
        });
      });
    });
  });
}
