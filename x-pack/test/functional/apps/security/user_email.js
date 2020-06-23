/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { keyBy } from 'lodash';
export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['security', 'settings', 'common', 'accountSetting']);
  const log = getService('log');
  const esArchiver = getService('esArchiver');

  describe('useremail', function () {
    before(async () => {
      await esArchiver.load('security/discover');
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchUsers();
    });

    it('should add new user', async function () {
      await PageObjects.security.addUser({
        username: 'newuser',
        password: 'changeme',
        confirmPassword: 'changeme',
        fullname: 'newuserFirst newuserLast',
        email: 'newuser@myEmail.com',
        save: true,
        roles: ['kibana_admin', 'superuser'],
      });
      const users = keyBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users.newuser.roles).to.eql(['kibana_admin', 'superuser']);
      expect(users.newuser.fullname).to.eql('newuserFirst newuserLast');
      expect(users.newuser.email).to.eql('newuser@myEmail.com');
      expect(users.newuser.reserved).to.be(false);
      await PageObjects.security.forceLogout();
    });

    it('login as new user and verify email', async function () {
      await PageObjects.security.login('newuser', 'changeme');
      await PageObjects.accountSetting.verifyAccountSettings('newuser@myEmail.com', 'newuser');
    });

    it('click changepassword link, change the password and re-login', async function () {
      await PageObjects.accountSetting.verifyAccountSettings('newuser@myEmail.com', 'newuser');
      await PageObjects.accountSetting.changePassword('changeme', 'mechange');
      await PageObjects.security.forceLogout();
    });

    it('login as new user with changed password', async function () {
      await PageObjects.security.login('newuser', 'mechange');
      await PageObjects.accountSetting.verifyAccountSettings('newuser@myEmail.com', 'newuser');
    });

    after(async function () {
      await PageObjects.security.forceLogout();
    });
  });
}
