/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { indexBy } from 'lodash';
export default function ({ getService, getPageObjects }) {

  const PageObjects = getPageObjects(['security', 'settings']);
  const config = getService('config');
  const log = getService('log');

  describe('users', function () {
    before(async () => {

      log.debug('users');
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchUsers();
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
      await PageObjects.security.addUser({ username: 'Lee', password: 'LeePwd',
        confirmPassword: 'LeePwd', fullname: 'LeeFirst LeeLast', email: 'lee@myEmail.com', save: true, roles: ['kibana_user'] });
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users.Lee.roles).to.eql(['kibana_user']);
      expect(users.Lee.fullname).to.eql('LeeFirst LeeLast');
      expect(users.Lee.reserved).to.be(false);
    });

    it('should delete user', async function () {
      const alertMsg = await PageObjects.security.deleteUser('Lee');
      log.debug('alertMsg = %s', alertMsg);
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users).to.not.have.key('Lee');
    });

    it('should show the default roles', async function () {
      await PageObjects.security.clickElasticsearchRoles();
      const roles = indexBy(await PageObjects.security.getElasticsearchRoles(), 'rolename');
      log.debug('actualRoles = %j', roles);
      expect(roles.ingest_admin.reserved).to.be(true);
      expect(roles.kibana_user.reserved).to.be(true);
      expect(roles.monitoring_user.reserved).to.be(true);
      expect(roles.remote_monitoring_agent.reserved).to.be(true);
      expect(roles.reporting_user.reserved).to.be(true);
      expect(roles.logstash_system.reserved).to.be(true);
      expect(roles.superuser.reserved).to.be(true);
      expect(roles.kibana_system.reserved).to.be(true);
      expect(roles.transport_client.reserved).to.be(true);
    });
  });
}
