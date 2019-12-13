/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { indexBy } from 'lodash';

export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const retry = getService('retry');
  const log = getService('log');
  const screenshot = getService('screenshots');
  const PageObjects = getPageObjects([
    'security',
    'common',
    'header',
    'discover',
    'settings']);

  describe('dls', function () {
    before('initialize tests', async () => {
      await esArchiver.load('empty_kibana');
      await esArchiver.loadIfNeeded('security/dlstest');
      await browser.setWindowSize(1600, 1000);

      await PageObjects.settings.createIndexPattern('dlstest', null);

      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchRoles();
    });

    it('should add new role myroleEast', async function () {
      await PageObjects.security.addRole('myroleEast', {
        elasticsearch: {
          'indices': [{
            'names': ['dlstest'],
            'privileges': ['read', 'view_index_metadata'],
            'query': '{"match": {"region": "EAST"}}'
          }]
        },
        kibana: {
          global: ['all']
        }
      });
      const roles = indexBy(await PageObjects.security.getElasticsearchRoles(), 'rolename');
      log.debug('actualRoles = %j', roles);
      expect(roles).to.have.key('myroleEast');
      expect(roles.myroleEast.reserved).to.be(false);
      screenshot.take('Security_Roles');
    });

    it('should add new user userEAST ', async function () {
      await PageObjects.security.clickElasticsearchUsers();
      await PageObjects.security.addUser({
        username: 'userEast', password: 'changeme',
        confirmPassword: 'changeme', fullname: 'dls EAST',
        email: 'dlstest@elastic.com', save: true, roles: ['kibana_user', 'myroleEast']
      });
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users.userEast.roles).to.eql(['kibana_user', 'myroleEast']);
      expect(users.userEast.reserved).to.be(false);
    });

    it('user East should only see EAST doc', async function () {
      await PageObjects.security.forceLogout();
      await PageObjects.security.login('userEast', 'changeme');
      await PageObjects.common.navigateToApp('discover');
      await retry.try(async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('1');
      });
      const rowData = await PageObjects.discover.getDocTableIndex(1);
      expect(rowData).to.be('name:ABC Company region:EAST _id:doc1 _type:_doc _index:dlstest _score:0');
    });
    after('logout', async () => {
      await PageObjects.security.forceLogout();
    });
  });
}
