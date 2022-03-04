/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { keyBy } from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';

import type { UserFormValues } from '../../../../plugins/security/public/management/users/edit_user/user_form';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['security', 'settings']);
  const config = getService('config');
  const log = getService('log');
  const retry = getService('retry');
  const toasts = getService('toasts');
  const browser = getService('browser');

  function isCloudEnvironment() {
    return config.get('servers.elasticsearch.hostname') !== 'localhost';
  }

  describe('users', function () {
    const optionalUser: UserFormValues = {
      username: 'OptionalUser',
      password: 'OptionalUserPwd',
      confirm_password: 'OptionalUserPwd',
      roles: ['superuser'],
    };

    before(async () => {
      log.debug('users');
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchUsers();
    });

    it('should show the default elastic and kibana_system users', async function () {
      const users = keyBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.info('actualUsers = %j', users);
      log.info('config = %j', config.get('servers.elasticsearch.hostname'));

      // In Cloud default users are defined in file realm, such users aren't exposed through the Users API.
      if (isCloudEnvironment()) {
        expect(users).to.not.have.property('elastic');
        expect(users).to.not.have.property('kibana_system');
        expect(users).to.not.have.property('kibana');
      } else {
        expect(users.elastic.roles).to.eql(['superuser']);
        expect(users.elastic.reserved).to.be(true);
        expect(users.elastic.deprecated).to.be(false);

        expect(users.kibana_system.roles).to.eql(['kibana_system']);
        expect(users.kibana_system.reserved).to.be(true);
        expect(users.kibana_system.deprecated).to.be(false);

        expect(users.kibana.roles).to.eql(['kibana_system']);
        expect(users.kibana.reserved).to.be(true);
        expect(users.kibana.deprecated).to.be(true);
      }
    });

    it('should add new user', async function () {
      const userLee: UserFormValues = {
        username: 'Lee',
        password: 'LeePwd',
        confirm_password: 'LeePwd',
        full_name: 'LeeFirst LeeLast',
        email: 'lee@myEmail.com',
        roles: ['kibana_admin'],
      };
      await PageObjects.security.createUser(userLee);
      const users = keyBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users.Lee.roles).to.eql(userLee.roles);
      expect(users.Lee.fullname).to.eql(userLee.full_name);
      expect(users.Lee.email).to.eql(userLee.email);
      expect(users.Lee.reserved).to.be(false);
    });

    it('should add new user with optional fields left empty', async function () {
      await PageObjects.security.createUser(optionalUser);
      const users = keyBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users.OptionalUser.roles).to.eql(optionalUser.roles);
      expect(users.OptionalUser.fullname).to.eql('');
      expect(users.OptionalUser.email).to.eql('');
      expect(users.OptionalUser.reserved).to.be(false);
    });

    it('should delete user', async function () {
      const alertMsg = await PageObjects.security.deleteUser('Lee');
      log.debug('alertMsg = %s', alertMsg);
      const users = keyBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users).to.not.have.key('Lee');
    });

    it('should show the default roles', async function () {
      await PageObjects.security.clickElasticsearchRoles();
      const roles = keyBy(await PageObjects.security.getElasticsearchRoles(), 'rolename');
      log.debug('actualRoles = %j', roles);
      // This only contains the first page of alphabetically sorted results, so the assertions are only for the first handful of expected roles.
      expect(roles.apm_system.reserved).to.be(true);
      expect(roles.apm_system.deprecated).to.be(false);

      expect(roles.apm_user.reserved).to.be(true);
      expect(roles.apm_user.deprecated).to.be(true);

      expect(roles.beats_admin.reserved).to.be(true);
      expect(roles.beats_admin.deprecated).to.be(false);

      expect(roles.beats_system.reserved).to.be(true);
      expect(roles.beats_system.deprecated).to.be(false);

      expect(roles.kibana_admin.reserved).to.be(true);
      expect(roles.kibana_admin.deprecated).to.be(false);

      expect(roles.kibana_user.reserved).to.be(true);
      expect(roles.kibana_user.deprecated).to.be(true);

      expect(roles.kibana_system.reserved).to.be(true);
      expect(roles.kibana_system.deprecated).to.be(false);

      expect(roles.logstash_system.reserved).to.be(true);
      expect(roles.logstash_system.deprecated).to.be(false);

      expect(roles.monitoring_user.reserved).to.be(true);
      expect(roles.monitoring_user.deprecated).to.be(false);
    });

    describe('edit', function () {
      before(async () => {
        await PageObjects.security.clickElasticsearchUsers();
      });

      describe('update user profile', () => {
        it('when submitting form and redirects back', async () => {
          optionalUser.full_name = 'Optional User';
          optionalUser.email = 'optionalUser@elastic.co';

          await PageObjects.security.updateUserProfile(optionalUser);
          const users = keyBy(await PageObjects.security.getElasticsearchUsers(), 'username');

          expect(users.OptionalUser.roles).to.eql(optionalUser.roles);
          expect(users.OptionalUser.fullname).to.eql(optionalUser.full_name);
          expect(users.OptionalUser.email).to.eql(optionalUser.email);
          expect(users.OptionalUser.reserved).to.be(false);
          expect(await browser.getCurrentUrl()).to.contain('app/management/security/users');
        });
      });

      describe('change password', () => {
        before(async () => {
          await toasts.dismissAllToasts();
        });
        afterEach(async () => {
          await PageObjects.security.submitUpdateUserForm();
          await toasts.dismissAllToasts();
        });
        after(async () => {
          await PageObjects.security.forceLogout();
          await PageObjects.security.login();
          await PageObjects.settings.navigateTo();
          await PageObjects.security.clickElasticsearchUsers();
        });
        it('of other user when submitting form', async () => {
          optionalUser.password = 'NewOptionalUserPwd';
          optionalUser.confirm_password = 'NewOptionalUserPwd';

          await PageObjects.security.updateUserPassword(optionalUser);
          await retry.waitFor('', async () => {
            const toastCount = await toasts.getToastCount();
            return toastCount >= 1;
          });
          const successToast = await toasts.getToastElement(1);
          expect(await successToast.getVisibleText()).to.be(
            `Password changed for '${optionalUser.username}'.`
          );
        });

        it('of current user when submitting form', async () => {
          optionalUser.current_password = 'NewOptionalUserPwd';
          optionalUser.password = 'NewOptionalUserPwd_2';
          optionalUser.confirm_password = 'NewOptionalUserPwd_2';

          await PageObjects.security.forceLogout();
          await PageObjects.security.login(optionalUser.username, optionalUser.current_password);
          await PageObjects.settings.navigateTo();
          await PageObjects.security.clickElasticsearchUsers();

          await PageObjects.security.updateUserPassword(optionalUser, true);
          await retry.waitFor('', async () => {
            const toastCount = await toasts.getToastCount();
            return toastCount >= 1;
          });
          const successToast = await toasts.getToastElement(1);
          expect(await successToast.getVisibleText()).to.be(
            `Password changed for '${optionalUser.username}'.`
          );
        });
      });

      // FLAKY: https://github.com/elastic/kibana/issues/118728
      describe.skip('Deactivate/Activate user', () => {
        it('deactivates user when confirming', async () => {
          await PageObjects.security.deactivatesUser(optionalUser);
          const users = keyBy(await PageObjects.security.getElasticsearchUsers(), 'username');
          expect(users.OptionalUser.enabled).to.be(false);
        });

        it('activates user when confirming', async () => {
          await PageObjects.security.activatesUser(optionalUser);
          const users = keyBy(await PageObjects.security.getElasticsearchUsers(), 'username');
          expect(users.OptionalUser.enabled).to.be(true);
        });
      });

      describe('Delete user', () => {
        it('when confirming and closes dialog', async () => {
          await PageObjects.security.deleteUser(optionalUser.username ?? '');
          const users = keyBy(await PageObjects.security.getElasticsearchUsers(), 'username');
          expect(users).to.not.have.key(optionalUser.username ?? '');
          expect(await browser.getCurrentUrl()).to.contain('app/management/security/users');
        });
      });
    });
  });
}
