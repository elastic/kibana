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
  const PageObjects = getPageObjects([
    'security',
    'settings',
    'monitoring',
    'discover',
    'common',
    'share',
    'header',
  ]);
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');

  describe('secure roles and permissions', function () {
    before(async () => {
      await browser.setWindowSize(1600, 1000);
      log.debug('users');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      log.debug('load kibana index with default index pattern');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/security/discover'
      );
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await PageObjects.settings.navigateTo();
    });

    it('should add new role logstash_reader', async function () {
      await PageObjects.security.clickElasticsearchRoles();
      await PageObjects.security.addRole('logstash_reader', {
        elasticsearch: {
          indices: [
            {
              names: ['logstash-*'],
              privileges: ['read', 'view_index_metadata'],
            },
          ],
        },
      });
    });

    it('should add new user', async function () {
      log.debug('After Add user new: , userObj.userName');
      await PageObjects.security.createUser({
        username: 'Rashmi',
        password: 'changeme',
        confirm_password: 'changeme',
        full_name: 'RashmiFirst RashmiLast',
        email: 'rashmi@myEmail.com',
        roles: ['logstash_reader'],
      });
      log.debug('After Add user: , userObj.userName');
      const users = keyBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      log.debug('roles: ', users.Rashmi.roles);
      expect(users.Rashmi.roles).to.eql(['logstash_reader']);
      expect(users.Rashmi.fullname).to.eql('RashmiFirst RashmiLast');
      expect(users.Rashmi.reserved).to.be(false);
      await PageObjects.security.forceLogout();
      await PageObjects.security.login('Rashmi', 'changeme');
    });

    it('Kibana User does not have link to user management', async function () {
      await PageObjects.settings.navigateTo();
      await testSubjects.missingOrFail('users');
    });

    it('Kibana User navigating to Discover sees the generate CSV button', async function () {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.loadSavedSearch('A Saved Search');
      log.debug('click Top Nav Share button');
      await PageObjects.share.clickShareTopNavButton();
      await testSubjects.existOrFail('sharePanel-CSVReports');
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
