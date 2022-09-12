/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { suggestUserProfiles } from '../../../../common/lib/user_profiles';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('suggest_user_profiles', () => {
    it('returns an empty array when the security plugin is disabled', async () => {
      const profiles = await suggestUserProfiles({
        supertest,
        req: {
          name: 'jon',
          owners: ['securitySolutionFixture'],
        },
      });

      expect(profiles).to.be.empty();
    });
  });
}
