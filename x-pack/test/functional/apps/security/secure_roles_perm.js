/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { indexBy } from 'lodash';
export default function ({ getService, getPageObjects }) {

  const PageObjects = getPageObjects(['security', 'settings', 'monitoring', 'discover', 'common', 'reporting', 'header']);
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');



  describe('secure roles and permissions', function () {
    before(async () => {
      await browser.setWindowSize(1600, 1000);
      log.debug('users');
      await esArchiver.loadIfNeeded('logstash_functional');
      log.debug('load kibana index with default index pattern');
      await esArchiver.load('security/discover');
      await kibanaServer.uiSettings.replace({ 'defaultIndex': 'logstash-*' });
      await PageObjects.settings.navigateTo();
    });

    it('should add new role logstash_reader', async function () {
      await PageObjects.security.clickElasticsearchRoles();
      await PageObjects.security.addRole('logstash_reader', {
        elasticsearch: {
          'indices': [{
            'names': ['logstash-*'],
            'privileges': ['read', 'view_index_metadata']
          }]
        },
        kibana: {
          global: ['all']
        }
      });
    });

    it('should add new user', async function () {
      await PageObjects.security.clickElasticsearchUsers();
      log.debug('After Add user new: , userObj.userName');
      await PageObjects.security.addUser({
        username: 'Rashmi', password: 'changeme',
        confirmPassword: 'changeme', fullname: 'RashmiFirst RashmiLast',
        email: 'rashmi@myEmail.com', save: true,
        roles: ['logstash_reader', 'kibana_user']
      });
      log.debug('After Add user: , userObj.userName');
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      log.debug('roles: ', users.Rashmi.roles);
      expect(users.Rashmi.roles).to.eql(['logstash_reader', 'kibana_user']);
      expect(users.Rashmi.fullname).to.eql('RashmiFirst RashmiLast');
      expect(users.Rashmi.reserved).to.be(false);
      await PageObjects.security.forceLogout();
      await PageObjects.security.login('Rashmi', 'changeme');
    });

    it('Kibana User navigating to Management gets permission denied', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchUsers();
      await retry.tryForTime(2000, async () => {
        await testSubjects.find('permissionDeniedMessage');
      });
    });

    it('Kibana User navigating to Discover and trying to generate CSV gets - Authorization Error ', async function () {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.loadSavedSearch('A Saved Search');
      log.debug('click Reporting button');
      await PageObjects.reporting.openCsvReportingPanel();
      await PageObjects.reporting.clickGenerateReportButton();
      const queueReportError = await PageObjects.reporting.getQueueReportError();
      expect(queueReportError).to.be(true);
    });

    after(async function () {
      await PageObjects.security.forceLogout();
    });

  });
}
