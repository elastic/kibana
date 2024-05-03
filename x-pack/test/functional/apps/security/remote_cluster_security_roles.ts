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
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const log = getService('log');
  const security = getService('security');
  const PageObjects = getPageObjects(['security', 'common', 'header', 'discover', 'settings']);
  const kibanaServer = getService('kibanaServer');

  describe('Remote Cluster Privileges', function () {
    const customRole = 'customRoleRC';

    before('initialize tests', async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/security/dlstest');
      await browser.setWindowSize(1600, 1000);

      await PageObjects.common.navigateToApp('settings');
      await PageObjects.settings.createIndexPattern('dlstest', null);

      await security.testUser.setRoles(['cluster_security_manager', 'kibana_admin']);
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchRoles();
    });

    it(`should add new role ${customRole} with remote cluster privileges`, async function () {
      await PageObjects.security.addRole(customRole, {
        elasticsearch: {
          indices: [
            {
              names: ['dlstest'],
              privileges: ['read', 'view_index_metadata'],
            },
          ],
          remote_cluster: [
            {
              clusters: ['cluster1', 'cluster2'],
              privileges: ['monitor_enrich'],
            },
          ],
        },
      });
      const roles = keyBy(await PageObjects.security.getElasticsearchRoles(), 'rolename');
      log.debug('actualRoles = %j', roles);
      expect(roles).to.have.key(customRole);
      expect(roles[customRole].reserved).to.be(false);
    });

    it(`should display role ${customRole} with remote cluster privileges`, async function () {
      const url = await browser.getCurrentUrl();

      await browser.navigateTo(`${url}edit/${customRole}`);

      const { clusters, privileges } = await PageObjects.security.getRemoteClusterPrivilege(0);

      expect(clusters).to.eql(['cluster1', 'cluster2']);
      expect(privileges).to.eql(['monitor_enrich']);
    });

    after('logout', async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();
      await security.role.delete(customRole);
      await security.testUser.restoreDefaults();
    });
  });
}
