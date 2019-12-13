/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

import expect from '@kbn/expect';
import { indexBy } from 'lodash';
export default function ({ getService, getPageObjects }) {

  const PageObjects = getPageObjects(['security', 'settings', 'common', 'visualize', 'timePicker']);
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');

  describe('rbac ', function () {
    before(async () => {
      await browser.setWindowSize(1600, 1000);
      log.debug('users');
      await esArchiver.loadIfNeeded('logstash_functional');
      log.debug('load kibana index with default index pattern');
      await esArchiver.load('security/discover');
      await kibanaServer.uiSettings.replace({ 'defaultIndex': 'logstash-*' });
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchRoles();
      await PageObjects.security.addRole('rbac_all', {
        kibana: {
          global: ['all']
        },
        elasticsearch: {
          'indices': [{
            'names': ['logstash-*'],
            'privileges': ['read', 'view_index_metadata']
          }]
        }
      });

      await PageObjects.security.clickElasticsearchRoles();
      await PageObjects.security.addRole('rbac_read', {
        kibana: {
          global: ['read']
        },
        elasticsearch: {
          'indices': [{
            'names': ['logstash-*'],
            'privileges': ['read', 'view_index_metadata']
          }]
        }
      });
      await PageObjects.security.clickElasticsearchUsers();
      log.debug('After Add user new: , userObj.userName');
      await PageObjects.security.addUser({
        username: 'kibanauser', password: 'changeme',
        confirmPassword: 'changeme', fullname: 'kibanafirst kibanalast',
        email: 'kibanauser@myEmail.com', save: true,
        roles: ['rbac_all']
      });
      log.debug('After Add user: , userObj.userName');
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      log.debug('roles: ', users.kibanauser.roles);
      expect(users.kibanauser.roles).to.eql(['rbac_all']);
      expect(users.kibanauser.fullname).to.eql('kibanafirst kibanalast');
      expect(users.kibanauser.reserved).to.be(false);
      await PageObjects.security.clickElasticsearchUsers();
      log.debug('After Add user new: , userObj.userName');
      await PageObjects.security.addUser({
        username: 'kibanareadonly', password: 'changeme',
        confirmPassword: 'changeme', fullname: 'kibanareadonlyFirst kibanareadonlyLast',
        email: 'kibanareadonly@myEmail.com', save: true,
        roles: ['rbac_read']
      });
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
      const vizName1 = 'Visualization VerticalBarChart';

      log.debug('log in as kibanauser with rbac_all role');
      await PageObjects.security.login('kibanauser', 'changeme');
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickVerticalBarChart');
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' +
      PageObjects.timePicker.defaultStartTime + '\" to \"' +
      PageObjects.timePicker.defaultEndTime + '\"');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.visualize.waitForVisualization();
      await PageObjects.visualize.saveVisualizationExpectSuccess(vizName1);
      await PageObjects.security.logout();
    });

    after(async function () {
      await PageObjects.security.logout();
    });

  });
}
