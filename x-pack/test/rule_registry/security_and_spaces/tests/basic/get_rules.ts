/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  secOnly,
  secOnlyRead,
  globalRead,
  obsOnly,
  obsOnlyRead,
  obsSec,
  obsSecRead,
  superUser,
  noKibanaPrivileges,
} from '../../../common/lib/authentication/users';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../common/lib/authentication/spaces';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const TEST_URL = '/api/rac/alerts';
  const SPACE1 = 'space1';
  const SPACE2 = 'space2';

  describe('rbac', () => {
    before(async () => {
      await esArchiver.load('rule_registry/alerts');
    });
    describe('Users:', () => {
      for (const scenario of [
        { user: superUser },
        { user: globalRead },
        { user: secOnly },
        { user: secOnlyRead },
        { user: obsSec },
        { user: obsSecRead },
      ]) {
        it(`${scenario.user.username} should be able to access the fake path in ${SPACE1}`, async () => {
          await supertestWithoutAuth
            .get(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}/?id=NoxgpHkBqbdrfX07MqXV`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'true')
            .expect(200);
        });
      }

      for (const scenario of [
        {
          user: noKibanaPrivileges,
        },
        {
          user: obsOnly,
        },
        {
          user: obsOnlyRead,
        },
      ]) {
        it(`${scenario.user.username} should not be able to access the fake path in ${SPACE1}`, async () => {
          await supertestWithoutAuth
            .get(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'true')
            .expect(401);
        });
      }
    });

    describe('Space:', () => {
      for (const scenario of [
        { user: superUser, space: SPACE1 },
        { user: globalRead, space: SPACE1 },
      ]) {
        it(`${scenario.user.username} should be able to access the fake path in ${SPACE2}`, async () => {
          await supertestWithoutAuth
            .get(`${getSpaceUrlPrefix(SPACE2)}${TEST_URL}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'true')
            .expect(200);
        });
      }

      for (const scenario of [
        { user: secOnly },
        { user: secOnlyRead },
        { user: obsSec },
        { user: obsSecRead },
        {
          user: noKibanaPrivileges,
        },
        {
          user: obsOnly,
        },
        {
          user: obsOnlyRead,
        },
      ]) {
        it(`${scenario.user.username} with right to access space1 only, should not be able to access the fake path in ${SPACE2}`, async () => {
          await supertestWithoutAuth
            .get(`${getSpaceUrlPrefix(SPACE2)}${TEST_URL}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'true')
            .expect(401);
        });
      }
    });

    describe('extra params', () => {
      it('should NOT allow to pass a filter query parameter', async () => {
        await supertest
          .get(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}?sortOrder=asc&namespaces[0]=*`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);
      });

      it('should NOT allow to pass a non supported query parameter', async () => {
        await supertest
          .get(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}?notExists=something`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);
      });
    });
  });
};
