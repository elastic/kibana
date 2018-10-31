/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { indexBy } from 'lodash';

export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const remote = getService('remote');
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['security', 'settings', 'common', 'discover', 'header']);

  describe('field_level_security', () => {
    before('initialize tests', async () => {
      await esArchiver.loadIfNeeded('security/flstest');
      await esArchiver.load('empty_kibana');
      remote.setWindowSize(1600, 1000);
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.createIndexPattern('flstest', null);
    });

    it('should add new role viewssnrole', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchRoles();
      await PageObjects.security.addRole('viewssnrole', {
        elasticsearch: {
          "indices": [{
            "names": ["flstest"],
            "privileges": ["read", "view_index_metadata"],
            "field_security": { "grant": ["customer_ssn", "customer_name", "customer_region", "customer_type"] }
          }]
        },
        kibana: {
          global: ['all']
        }
      });

      await PageObjects.common.sleep(1000);
      const roles = indexBy(await PageObjects.security.getElasticsearchRoles(), 'rolename');
      log.debug('actualRoles = %j', roles);
      expect(roles).to.have.key('viewssnrole');
      expect(roles.viewssnrole.reserved).to.be(false);
    });

    it('should add new role view_no_ssn_role', async function () {
      await PageObjects.security.addRole('view_no_ssn_role', {
        elasticsearch: {
          "indices": [{
            "names": ["flstest"],
            "privileges": ["read", "view_index_metadata"],
            "field_security": { "grant": ["customer_name", "customer_region", "customer_type"] }
          }]
        },
        kibana: {
          global: ['all']
        }
      });
      await PageObjects.common.sleep(1000);
      const roles = indexBy(await PageObjects.security.getElasticsearchRoles(), 'rolename');
      log.debug('actualRoles = %j', roles);
      expect(roles).to.have.key('view_no_ssn_role');
      expect(roles.view_no_ssn_role.reserved).to.be(false);
    });

    it('should add new user customer1 ', async function () {
      await PageObjects.security.clickElasticsearchUsers();
      await PageObjects.security.addUser({
        username: 'customer1', password: 'changeme',
        confirmPassword: 'changeme', fullname: 'customer one', email: 'flstest@elastic.com', save: true,
        roles: ['kibana_user', 'viewssnrole']
      });
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users.customer1.roles).to.eql(['kibana_user', 'viewssnrole']);
    });

    it('should add new user customer2 ', async function () {
      await PageObjects.security.clickElasticsearchUsers();
      await PageObjects.security.addUser({
        username: 'customer2', password: 'changeme',
        confirmPassword: 'changeme', fullname: 'customer two', email: 'flstest@elastic.com', save: true,
        roles: ['kibana_user', 'view_no_ssn_role']
      });
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users.customer2.roles).to.eql(['kibana_user', 'view_no_ssn_role']);
    });

    it('user customer1 should see ssn', async function () {
      await PageObjects.security.logout();
      await PageObjects.security.login('customer1', 'changeme');
      await PageObjects.common.navigateToApp('discover');
      await retry.tryForTime(10000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('2');
      });
      const rowData = await PageObjects.discover.getDocTableIndex(1);
      expect(rowData).to
        .be('customer_ssn:444.555.6666 customer_name:ABC Company customer_region:WEST _id:2 _type:customer_type _index:flstest _score:1');
    });

    it('user customer2 should not see ssn', async function () {
      await PageObjects.security.logout();
      await PageObjects.security.login('customer2', 'changeme');
      await PageObjects.common.navigateToApp('discover');
      await retry.tryForTime(10000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('2');
      });
      const rowData = await PageObjects.discover.getDocTableIndex(1);
      expect(rowData).to.be('customer_name:ABC Company customer_region:WEST _id:2 _type:customer_type _index:flstest _score:1');
    });

    after(async function () {
      await PageObjects.security.logout();
    });

  });
}
