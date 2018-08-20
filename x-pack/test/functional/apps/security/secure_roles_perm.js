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



  describe('security', function () {
    before(async () => {
      await remote.setWindowSize(1600, 1000);
      log.debug('users');
      await esArchiver.loadIfNeeded('logstash_functional');
      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');
      await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'UTC', 'defaultIndex': 'logstash-*' });
      await PageObjects.settings.navigateTo();
    });

    it('should add new role logstash_reader', async function () {
      await PageObjects.security.clickElasticsearchRoles();
      await PageObjects.security.addRole('logstash_reader', {
        "indices": [{
          "names": [ "logstash-*" ],
          "privileges": [ "read", "view_index_metadata" ]
        }]
      });
    });

    it('should add new user', async function () {
      await PageObjects.security.clickElasticsearchUsers();
      log.debug('After Add user new: , userObj.userName');
      await PageObjects.security.addUser({ username: 'Rashmi', password: 'changeme',
        confirmPassword: 'changeme', fullname: 'RashmiFirst RashmiLast',
        email: 'rashmi@myEmail.com', save: true,
        roles: ['logstash_reader', 'kibana_user'] });
      log.debug('After Add user: , userObj.userName');
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      log.debug('roles: ', users.Rashmi.roles);
      expect(users.Rashmi.roles).to.eql(['logstash_reader', 'kibana_user']);
      expect(users.Rashmi.fullname).to.eql('RashmiFirst RashmiLast');
      expect(users.Rashmi.reserved).to.be(false);
      await PageObjects.security.logout();
      await PageObjects.security.login('Rashmi', 'changeme');
    });

    //Verify the Access Denied message is displayed
    it('Kibana User navigating to Monitoring gets Access Denied', async function () {
      const expectedMessage = 'Access Denied';
      await PageObjects.monitoring.navigateTo();
      const actualMessage = await PageObjects.monitoring.getAccessDeniedMessage();
      expect(actualMessage).to.be(expectedMessage);
    });


    it('Kibana User navigating to Management gets - You do not have permission to manage users', async function () {
      const expectedMessage = 'You do not have permission to manage users.';
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchUsers();
      const actualMessage = await PageObjects.security.getPermissionDeniedMessage();
      expect(actualMessage).to.be(expectedMessage);
    });

    it('Kibana User navigating to Discover and trying to generate CSV gets - Authorization Error ', async function () {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.loadSavedSearch('A Saved Search');
      log.debug('click Reporting button');
      await PageObjects.reporting.openReportingPanel();
      await PageObjects.reporting.clickGenerateReportButton();
      const queueReportError = await PageObjects.reporting.getQueueReportError();
      expect(queueReportError).to.be(true);
    });

    after(async function () {
      await PageObjects.security.logout();
    });

  });
}
