/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { keyBy } from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['security', 'settings', 'common', 'accountSetting']);
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  describe('useremail', function () {
    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/security/discover'
      );
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchUsers();
    });

    it('should add new user', async function () {
      await PageObjects.security.createUser({
        username: 'newuser',
        password: 'changeme',
        confirm_password: 'changeme',
        full_name: 'newuserFirst newuserLast',
        email: 'newuser@myEmail.com',
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
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/security/discover'
      );
    });
  });
}
