/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { keyBy } from 'lodash';

export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const retry = getService('retry');
  const log = getService('log');
  const screenshot = getService('screenshots');
  const PageObjects = getPageObjects(['security', 'common', 'header', 'discover', 'settings']);

  describe('dls', function () {
    before('initialize tests', async () => {
      await esArchiver.load('empty_kibana');
      await esArchiver.loadIfNeeded('security/dlstest');
      await browser.setWindowSize(1600, 1000);

      await PageObjects.common.navigateToApp('settings');
      await PageObjects.settings.createIndexPattern('dlstest', null);

      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchRoles();
    });

    it('should add new role myroleEast', async function () {
      await PageObjects.security.addRole('myroleEast', {
        elasticsearch: {
          indices: [
            {
              names: ['dlstest'],
              privileges: ['read', 'view_index_metadata'],
              query: '{"match": {"region": "EAST"}}',
            },
          ],
        },
        kibana: {
          global: ['all'],
        },
      });
      const roles = keyBy(await PageObjects.security.getElasticsearchRoles(), 'rolename');
      log.debug('actualRoles = %j', roles);
      expect(roles).to.have.key('myroleEast');
      expect(roles.myroleEast.reserved).to.be(false);
      screenshot.take('Security_Roles');
    });

    it('should add new user userEAST ', async function () {
      await PageObjects.security.createUser({
        username: 'userEast',
        password: 'changeme',
        confirm_password: 'changeme',
        full_name: 'dls EAST',
        email: 'dlstest@elastic.com',
        roles: ['kibana_admin', 'myroleEast'],
      });
      const users = keyBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users.userEast.roles).to.eql(['kibana_admin', 'myroleEast']);
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
      expect(rowData).to.be(
        '_id:doc1 _type: - _index:dlstest _score:0 region.keyword:EAST name:ABC Company name.keyword:ABC Company region:EAST'
      );
    });
    after('logout', async () => {
      await PageObjects.security.forceLogout();
    });
  });
}
