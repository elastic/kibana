/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { indexBy } from 'lodash';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'discover', 'header']);
  const log = getService('log');
  const screenshot = getService('screenshots');
  const browser = getService('browser');
  const config = getService('config');

  describe('users app', function describeIndexTests() {

    before(async () => {
      await browser.setWindowSize(1400, 800);
    });
    before(async () => {
      log.debug('### users');
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchUsers();
    });

    describe('users', function () {

      it('should show the default elastic and kibana users', async function () {
        const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
        log.debug('### actualUsers = %j', users);

        if (config.servers.elasticsearch.hostname === 'localhost') {
          expect(users.elastic.roles).to.eql(['superuser']);
          expect(users.elastic.reserved).to.be(true);
          expect(users.kibana.roles).to.eql(['kibana_system']);
          expect(users.kibana.reserved).to.be(true);
        } else {
          expect(users.anonymous.roles).to.eql(['anonymous']);
          expect(users.anonymous.reserved).to.be(true);
        }
        await screenshot.take('Security_Users');
      });

      // it('should show disabled checkboxes for default elastic and kibana users', function () {
      // });

      // "cancel" type button went away, but coming back on another PR
      // it('should cancel adding new user', async function () {
      //   await PageObjects.security.addUser({username: 'Lee', password: 'LeePwd',
      //     confirmPassword: 'LeePwd', fullname: 'LeeFirst LeeLast', email: 'lee@myEmail.com', save: false});
      //   const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      //   log.debug('actualUsers = %j', users);
      //   expect(users.Lee).to.throw(Error);
      // });

      it('should add new user', async function () {
        await PageObjects.security.addUser({
          username: 'Lee',
          password: 'LeePwd',
          confirmPassword: 'LeePwd',
          fullname: 'LeeFirst LeeLast',
          email: 'lee@myEmail.com',
          save: true,
          roles: ['kibana_user'],
        });
        const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
        log.debug('### actualUsers = %j', users);
        expect(users.Lee.roles).to.eql(['kibana_user']);
        expect(users.Lee.fullname).to.eql('LeeFirst LeeLast');
        expect(users.Lee.reserved).to.be(false);
      });

      it('should delete user', async function () {
        const alertMsg = await PageObjects.security.deleteUser('Lee');
        log.debug('### alertMsg = %s', alertMsg);
        const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
        log.debug('### actualUsers = %j', users);
        expect(users).to.not.have.key('Lee');
      });

      it('should show the default roles', async function () {
        await PageObjects.security.clickElasticsearchRoles();
        const roles = indexBy(await PageObjects.security.getElasticsearchRoles(), 'rolename');
        log.debug('### actualRoles = %j', roles);
        expect(roles.ingest_admin.reserved).to.be(true);
        expect(roles.kibana_user.reserved).to.be(true);
        expect(roles.monitoring_user.reserved).to.be(true);
        expect(roles.remote_monitoring_agent.reserved).to.be(true);
        expect(roles.reporting_user.reserved).to.be(true);
        expect(roles.logstash_system.reserved).to.be(true);
        expect(roles.superuser.reserved).to.be(true);
        expect(roles.kibana_system.reserved).to.be(true);
        expect(roles.transport_client.reserved).to.be(true);
        await screenshot.take('Security_Roles');
      });

    });
  });

};
