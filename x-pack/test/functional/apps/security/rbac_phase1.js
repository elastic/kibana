/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { indexBy } from 'lodash';
export default function ({ getService, getPageObjects }) {

  const PageObjects = getPageObjects(['security', 'settings', 'monitoring', 'discover', 'common', 'reporting', 'header']);
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const remote = getService('remote');
  const kibanaServer = getService('kibanaServer');



  describe('rbac', function () {
    before(async () => {
      await remote.setWindowSize(1600, 1000);
      log.debug('users');
      await esArchiver.loadIfNeeded('logstash_functional');
      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');
      await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'UTC', 'defaultIndex': 'logstash-*' });
      await PageObjects.settings.navigateTo();
    });

    it('should add new role with all role', async function () {
      await PageObjects.security.clickElasticsearchRoles();
      await PageObjects.security.addRole('rbac_all', {
        "applications": [
          {
            "application": "kibana",
            "resources": ["default"],
            "privileges": ["all"]
          }
        ],
        "indices": [{
          "names": [ "logstash-*" ],
          "privileges": [ "all" ]
        }]
      });
    });

    it('should add new role with read role', async function () {
      await PageObjects.security.clickElasticsearchRoles();
      await PageObjects.security.addRole('rbac_read', {
        "applications": [
          {
            "application": "kibana",
            "resources": ["default"],
            "privileges": ["read"]
          }
        ],
        "indices": [{
          "names": [ "logstash-*" ],
          "privileges": [ "read" ]
        }]
      });
    });

    it('should add new user with kibana privilege all role', async function () {
      await PageObjects.security.clickElasticsearchUsers();
      log.debug('After Add user new: , userObj.userName');
      await PageObjects.security.addUser({ username: 'Rashmi', password: 'changeme',
        confirmPassword: 'changeme', fullname: 'RashmiFirst RashmiLast',
        email: 'rashmi@myEmail.com', save: true,
        roles: ['rbac_all'] });
      log.debug('After Add user: , userObj.userName');
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      log.debug('roles: ', users.Rashmi.roles);
      expect(users.Rashmi.roles).to.eql(['rbac_all']);
      expect(users.Rashmi.fullname).to.eql('RashmiFirst RashmiLast');
      expect(users.Rashmi.reserved).to.be(false);
      await PageObjects.security.logout();
      await PageObjects.security.login('Rashmi', 'changeme');
    });

    // it('should add new user with kibana privilege read role', async function () {
    //   await PageObjects.security.clickElasticsearchUsers();
    //   log.debug('After Add user new: , userObj.userName');
    //   await PageObjects.security.addUser({ username: 'Rashmiread', password: 'changeme',
    //     confirmPassword: 'changeme', fullname: 'RashmireadFirst RashmireadLast',
    //     email: 'rashmi@myEmail.com', save: true,
    //     roles: ['rbac_read'] });
    //   log.debug('After Add user: , userObj.userName');
    //   const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
    //   log.debug('actualUsers = %j', users);
    //   log.debug('roles: ', users.Rashmiread.roles);
    //   expect(users.Rashmi.readroles).to.eql(['rbac_all']);
    //   expect(users.Rashmiread.fullname).to.eql('RashmireadFirst RashmireadLast');
    //   expect(users.Rashmiread.reserved).to.be(false);
    //   await PageObjects.security.logout();
    //   await PageObjects.security.login('Rashmiread', 'changeme');
    // });





    after(async function () {
      await PageObjects.security.logout();
    });

  });
}
