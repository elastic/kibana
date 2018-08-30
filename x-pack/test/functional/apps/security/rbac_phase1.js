/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

import expect from 'expect.js';
import { indexBy } from 'lodash';
export default function ({ getService, getPageObjects }) {

  const PageObjects = getPageObjects(['security', 'settings', 'common', 'visualize', 'header']);
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const remote = getService('remote');
  const kibanaServer = getService('kibanaServer');

  describe('rbac ', async function () {
    before(async () => {
      await remote.setWindowSize(1600, 1000);
      log.debug('users');
      await esArchiver.loadIfNeeded('logstash_functional');
      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');
      await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'UTC', 'defaultIndex': 'logstash-*' });
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchRoles();
      await PageObjects.security.addRole('rbac_all', {
        "kibana": ["all"],
        "indices": [{
          "names": [ "logstash-*" ],
          "privileges": [ "read", "view_index_metadata" ]
        }]
      });

      await PageObjects.security.clickElasticsearchRoles();
      await PageObjects.security.addRole('rbac_read', {
        "kibana": ["read"],
        "indices": [{
          "names": [ "logstash-*" ],
          "privileges": [ "read", "view_index_metadata" ]
        }]
      });
      await PageObjects.security.clickElasticsearchUsers();
      log.debug('After Add user new: , userObj.userName');
      await PageObjects.security.addUser({ username: 'kibanauser', password: 'changeme',
        confirmPassword: 'changeme', fullname: 'kibanafirst kibanalast',
        email: 'kibanauser@myEmail.com', save: true,
        roles: ['rbac_all'] });
      log.debug('After Add user: , userObj.userName');
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      log.debug('roles: ', users.kibanauser.roles);
      expect(users.kibanauser.roles).to.eql(['rbac_all']);
      expect(users.kibanauser.fullname).to.eql('kibanafirst kibanalast');
      expect(users.kibanauser.reserved).to.be(false);
      await PageObjects.security.clickElasticsearchUsers();
      log.debug('After Add user new: , userObj.userName');
      await PageObjects.security.addUser({ username: 'kibanareadonly', password: 'changeme',
        confirmPassword: 'changeme', fullname: 'kibanareadonlyFirst kibanareadonlyLast',
        email: 'kibanareadonly@myEmail.com', save: true,
        roles: ['rbac_read'] });
      log.debug('After Add user: , userObj.userName');
      const users1 = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      const user = users1.kibanareadonly;
      log.debug('actualUsers = %j', users1);
      log.debug('roles: ', user.roles);
      expect(user.roles).to.eql(['rbac_read']);
      expect(user.fullname).to.eql('kibanareadonlyFirst kibanareadonlyLast');
      expect(user.reserved).to.be(false);
      await PageObjects.security.logout();
    });


    //   this is to acertain that all role assigned to the user can perform actions like creating a Visualization
    it('rbac all role can save a visualization', async function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';
      const vizName1 = 'Visualization VerticalBarChart';

      log.debug('navigateToApp visualize');
      await PageObjects.security.login('kibanauser', 'changeme');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      log.debug('clickVerticalBarChart');
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.visualize.waitForVisualization();
      const success = await PageObjects.visualize.saveVisualization(vizName1);
      expect(success).to.be(true);
      await PageObjects.security.logout();

    });

    it('rbac read only role can not  save a visualization', async function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';
      const vizName1 = 'Viz VerticalBarChart';

      log.debug('navigateToApp visualize');
      await PageObjects.security.login('kibanareadonly', 'changeme');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      log.debug('clickVerticalBarChart');
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.visualize.waitForVisualization();
      const success = await PageObjects.visualize.saveVisualization(vizName1);
      expect(success).to.be(false);
      await PageObjects.security.logout();

    });

    after(async function () {
      await PageObjects.security.logout();
    });

  });
}
