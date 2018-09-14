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

  describe('useremail', function () {
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
      await PageObjects.security.addUser({ username: 'rashmi', password: 'changeme',
        confirmPassword: 'changeme', fullname: 'rashmiFirst rashmiLast', email: 'rashmi@myEmail.com', save: true, roles: ['kibana_user'] });
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users.rashmi.roles).to.eql(['kibana_user']);
      expect(users.rashmi.fullname).to.eql('rashmiFirst rashmiLast');
      expect(users.rashmi.email).to.eql('rashmi@myEmail.com');
      expect(users.rashmi.reserved).to.be(false);
      await PageObjects.security.logout();
    });

    it('login as new user and verify email', async function () {
      await PageObjects.security.login('rashmi', 'changeme');
      await PageObjects.security.logout();
    });
  });
}
