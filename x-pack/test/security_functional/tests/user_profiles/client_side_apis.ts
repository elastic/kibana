/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse as parseCookie } from 'tough-cookie';
import { adminTestUser } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['security', 'common']);
  const testSubjects = getService('testSubjects');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');
  const retry = getService('retry');

  describe('User Profiles client side APIs', function () {
    const userProfileUids: string[] = [];
    before(async () => {
      // 1. Create test users
      await Promise.all(
        ['one', 'two', 'three'].map((userPrefix) =>
          security.user.create(`user_${userPrefix}`, {
            password: 'changeme',
            roles: [`role_${userPrefix}`],
          })
        )
      );

      // 2. Activate user profiles and update data.
      for (const userPrefix of ['one', 'two', 'three']) {
        const response = await supertestWithoutAuth
          .post('/internal/security/login')
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'basic',
            providerName: 'basic',
            currentURL: '/',
            params: { username: `user_${userPrefix}`, password: 'changeme' },
          })
          .expect(200);

        const cookie = parseCookie(response.headers['set-cookie'][0])!.cookieString();
        await supertestWithoutAuth
          .post('/internal/security/user_profile/_data')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', cookie)
          .send({ some: `data-${userPrefix}` })
          .expect(200);

        const { body: profile } = await supertestWithoutAuth
          .get('/internal/security/user_profile')
          .set('Cookie', cookie)
          .expect(200);

        userProfileUids.push(profile.uid);
      }
    });

    after(async () => {
      await Promise.all(
        ['one', 'two', 'three'].map((userPrefix) => security.user.delete(`user_${userPrefix}`))
      );
    });

    beforeEach(async () => {
      await PageObjects.security.loginPage.login(undefined, undefined, { expectSuccess: true });
    });

    afterEach(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();
    });

    it('can retrieve own user profile and user profiles for other users', async () => {
      await PageObjects.common.navigateToUrlWithBrowserHistory(
        'user_profiles_app',
        '',
        `?${userProfileUids.map((uid) => `uid=${uid}`).join('&')}`,
        { ensureCurrentUrl: true, shouldLoginIfPrompted: false }
      );

      await retry.try(async () => {
        const currentUserProfileText = await testSubjects.getVisibleText(
          'testEndpointsUserProfilesAppCurrentUserProfile'
        );
        expect(currentUserProfileText).to.equal(`${adminTestUser.username}:{}`);

        for (const userPrefix of ['one', 'two', 'three']) {
          const userProfileText = await testSubjects.getVisibleText(
            `testEndpointsUserProfilesAppUserProfile_user_${userPrefix}`
          );
          expect(userProfileText).to.equal(`user_${userPrefix}:{"some":"data-${userPrefix}"}`);
        }
      });
    });
  });
}
