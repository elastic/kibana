/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { indexBy } from 'lodash';
export default function ({ getService, getPageObjects }) {

  const PageObjects = getPageObjects(['security', 'settings', 'common', 'accountSetting']);
  const config = getService('config');
  const log = getService('log');
  const esArchiver = getService('esArchiver');

  describe('useremail', function () {
    before(async () => {
      //await esArchiver.unload('logstash_functional');
      await esArchiver.load('discover');
      //await esArchiver.loadIfNeeded('makelogs');
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchUsers();
    });

    after(async () => {
      //await esArchiver.unload('makelogs');
    });


    it('should show the default elastic and kibana users', async function () {
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.info('actualUsers = %j', users);
      log.info('config = %j', config.get('servers.elasticsearch.hostname'));
      if (config.get('servers.elasticsearch.hostname') === 'localhost') {
        expect(users.elastic.roles).to.eql(['superuser']);
        expect(users.elastic.reserved).to.be(true);
        expect(users.kibana.roles).to.eql(['kibana_system']);
        expect(users.kibana.reserved).to.be(true);
      } else {
        expect(users.anonymous.roles).to.eql(['anonymous']);
        expect(users.anonymous.reserved).to.be(true);
      }
    });

    it('should add new user', async function () {
      await PageObjects.security.addUser({ username: 'newuser', password: 'changeme',
        confirmPassword: 'changeme', fullname: 'newuserFirst newuserLast', email: 'newuser@myEmail.com',
        save: true, roles: ['kibana_user','superuser'] });
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users.newuser.roles).to.eql(['kibana_user', 'superuser']);
      expect(users.newuser.fullname).to.eql('newuserFirst newuserLast');
      expect(users.newuser.email).to.eql('newuser@myEmail.com');
      expect(users.newuser.reserved).to.be(false);
      await PageObjects.security.logout();
    });

    it('login as new user and verify email', async function () {
      await PageObjects.security.login('newuser', 'changeme');
      await PageObjects.common.navigateToUrl('account', '');
      await PageObjects.accountSetting.verifyAccountSettings({ email: "newuser@myEmail.com", username: "newuser" });
      //add assertion
    });

    it('click changepassword link, change the password and re-login', async function () {
      await PageObjects.accountSetting.userNamelink('newuserFirst newuserLast');
      await PageObjects.accountSetting.changePasswordLink({ currentPassword: "changeme", newPassword: "mechange" });
      await PageObjects.security.logout();
    });


    it('login as new user with changed password', async function () {
      await PageObjects.common.sleep(6000);
      await PageObjects.security.login('newuser', 'mechange');
      await PageObjects.accountSetting.verifyAccountSettings({ email: "newuser@myEmail.com", username: "newuser" });
    });
  });
}
