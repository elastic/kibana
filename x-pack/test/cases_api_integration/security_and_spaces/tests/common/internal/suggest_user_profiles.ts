/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { loginUsers, suggestUserProfiles } from '../../../../common/lib/utils';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { secOnly } from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe.only('suggest_user_profiles', () => {
    before(async () => {
      await loginUsers({
        supertest: supertestWithoutAuth,
        users: [secOnly],
      });
    });

    it('returns an empty array when the security plugin is disabled', async () => {
      const profiles = await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: 'only',
          owners: ['securitySolutionFixture'],
        },
      });

      expect(profiles).to.equal([]);
    });
  });
}
