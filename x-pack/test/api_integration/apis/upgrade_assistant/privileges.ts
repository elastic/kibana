/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { DEPRECATION_LOGS_INDEX } from '../../../../plugins/upgrade_assistant/common/constants';

export default function ({ getService }: FtrProviderContext) {
  const security = getService('security');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('Privileges', function () {
    this.onlyEsVersion('<=7');

    describe('GET /api/upgrade_assistant/privileges', () => {
      it('User with with index privileges', async () => {
        const { body } = await supertest
          .get('/api/upgrade_assistant/privileges')
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(body.hasAllPrivileges).to.be(true);
        expect(body.missingPrivileges.index.length).to.be(0);
      });

      it('User without index privileges', async () => {
        const ROLE_NAME = 'test_role';
        const USER_NAME = 'test_user';
        const USER_PASSWORD = 'test_user';

        try {
          await security.role.create(ROLE_NAME, {});
          await security.user.create(USER_NAME, {
            password: USER_PASSWORD,
            roles: [ROLE_NAME],
          });

          const { body } = await supertestWithoutAuth
            .get('/api/upgrade_assistant/privileges')
            .auth(USER_NAME, USER_PASSWORD)
            .set('kbn-xsrf', 'kibana')
            .send()
            .expect(200);

          expect(body.hasAllPrivileges).to.be(false);
          expect(body.missingPrivileges.index[0]).to.be(DEPRECATION_LOGS_INDEX);
        } finally {
          await security.role.delete(ROLE_NAME);
          await security.user.delete(USER_NAME);
        }
      });
    });
  });
}
