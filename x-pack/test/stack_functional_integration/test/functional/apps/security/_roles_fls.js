/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Client } from '@elastic/elasticsearch';
import { indexBy } from 'lodash';
import { buildUrl } from '../reporting/util';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'discover', 'header']);
  const log = getService('log');
  const screenshot = getService('screenshots');
  const retry = getService('retry');
  const config = getService('config');
  const servers = config.get('servers');

  describe('field level security', function describeIndexTests() {
    let esClient;
    before(async function () {

      before(async () => {
        esClient = new Client({
          node: buildUrl(servers.elasticsearch).toString(),
        });
      });

      let response = await esClient.index('flstest', 'customer_type', '1', {
        'customer_name': 'ABC Company',
        'customer_region': 'EAST',
        'customer_ssn': '111.222.3333',

      });
      log.debug(response);
      expect(response._shards.successful).to.eql(1);

      response = await esClient.index('flstest', 'customer_type', '2', {
        'customer_name': 'ABC Company',
        'customer_region': 'WEST',
        'customer_ssn': '444.555.6666',

      });
      log.debug(response);
      expect(response._shards.successful).to.eql(1);

      await PageObjects.common.sleep(3000);
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndicies();
      await PageObjects.settings.clickOptionalAddNewButton();
      await PageObjects.settings.setIndexPatternField('flstest');
      await PageObjects.common.sleep(2000);
      await PageObjects.common.try(async () => {
        await PageObjects.settings.getCreateButton().click();
        await PageObjects.settings.clickDefaultIndexButton();
      });
    });

    it('should add new role viewssnrole', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchRoles();
      await PageObjects.security.addRole('viewssnrole', {
        'indices': [{
          'names': ['flstest'],
          'privileges': ['read', 'view_index_metadata'],
          'field_security': { 'grant': ['customer_ssn', 'customer_name', 'customer_region', 'customer_type'] },
        }],
      });
      await PageObjects.common.sleep(1000);
      const roles = indexBy(await PageObjects.security.getElasticsearchRoles(), 'rolename');
      log.debug('actualRoles = %j', roles);
      expect(roles).to.have.key('viewssnrole');
      expect(roles.viewssnrole.reserved).to.be(false);
      await screenshot.take('Security_Roles');
    });

    //Add viewnossnrole
    it('should add new role view_no_ssn_role', async function () {
      await PageObjects.security.addRole('view_no_ssn_role', {
        'indices': [{
          'names': ['flstest'],
          'privileges': ['read', 'view_index_metadata'],
          'field_security': { 'grant': ['customer_name', 'customer_region', 'customer_type'] },
        }],
      });
      await PageObjects.common.sleep(1000);
      const roles = indexBy(await PageObjects.security.getElasticsearchRoles(), 'rolename');
      log.debug('actualRoles = %j', roles);
      expect(roles).to.have.key('view_no_ssn_role');
      expect(roles.view_no_ssn_role.reserved).to.be(false);
      await screenshot.take('Security_Roles');
    });

    it('should add new user customer1 ', async function () {
      // await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchUsers();
      await PageObjects.security.addUser({
        username: 'customer1', password: 'changeme',
        confirmPassword: 'changeme', fullname: 'customer one', email: 'flstest@elastic.com', save: true,
        roles: ['kibana_user', 'viewssnrole'],
      });
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users.customer1.roles).to.eql(['kibana_user', 'viewssnrole']);
    });

    //Add customer2 who has view_no_ssn_role
    it('should add new user customer2 ', async function () {
      // await PageObjects.settings.navigateTo();
      // await PageObjects.security.clickElasticsearchUsers();
      await PageObjects.security.addUser({
        username: 'customer2', password: 'changeme',
        confirmPassword: 'changeme', fullname: 'customer two', email: 'flstest@elastic.com', save: true,
        roles: ['kibana_user', 'view_no_ssn_role'],
      });
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users.customer2.roles).to.eql(['kibana_user', 'view_no_ssn_role']);
    });

    //login as customer1
    it('user customer1 should see ssn', async function () {
      await PageObjects.shield.logoutLogin('customer1', 'changeme');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('flstest');
      await retry.tryForTime(10000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('2');
      });
      const rowData = await PageObjects.discover.getDocTableIndex(1);
      expect(rowData).to
        .be('customer_ssn:444.555.6666 customer_name:ABC Company customer_region:WEST _id:2 _type:customer_type _index:flstest _score:1');
    });

    //login as customer2 and he should see no ssn field
    it('user customer2 should not see ssn', async function () {
      await PageObjects.shield.logoutLogin('customer2', 'changeme');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('flstest');
      await retry.tryForTime(10000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('2');
      });
      const rowData = await PageObjects.discover.getDocTableIndex(1);
      expect(rowData).to.be('customer_name:ABC Company customer_region:WEST _id:2 _type:customer_type _index:flstest _score:1');
    });

    // this user can't search on anything in the _all field even if the value
    // is in a field they have access to
    it('user customer2 can search without the field name', async function () {
      await PageObjects.discover.query('east');
      await retry.tryForTime(10000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('1');

      });
    });

    it('user customer2 cannot search on customer_ssn field', async function () {
      await PageObjects.discover.query('customer_ssn:444.555.6666');
      await retry.tryForTime(10000, async () => {
        const hitCount = await PageObjects.discover.hasNoResults();
        expect(hitCount).to.be(true);
      });
    });

    it('user customer2 cannot search on ssn', async function () {
      await PageObjects.discover.query('444.555.6666');
      await retry.tryForTime(10000, async () => {
        const hitCount = await PageObjects.discover.hasNoResults();
        expect(hitCount).to.be(true);
      });
    });

    it('user customer2 can search on customer_region east', async function () {
      await PageObjects.discover.query('customer_region:east');
      await retry.tryForTime(10000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('1');
      });
    });

    after(async function () {
      await PageObjects.shield.logout();
    });

  });
};
