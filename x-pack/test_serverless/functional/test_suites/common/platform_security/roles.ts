/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { FtrProviderContext } from '../../../ftr_provider_context';

async function clearAllRoles(esClient: Client, logger: ToolingLog) {
  const existingRoles = await esClient.security.getRole();
  const esRolesNames = Object.entries(existingRoles)
    .filter(([roleName, esRole]) => {
      return !esRole.metadata?._reserved;
    })
    .map(([roleName]) => roleName);

  if (esRolesNames.length > 0) {
    await Promise.all(
      esRolesNames.map(async (roleName) => {
        await esClient.security.deleteRole({ name: roleName });
      })
    );
  } else {
    logger.debug('No Roles to delete.');
  }
}

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'svlCommonPage', 'svlManagementPage', 'security']);
  const browser = getService('browser');
  const es = getService('es');
  const log = getService('log');

  describe('Roles', function () {
    before(async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
      await pageObjects.common.navigateToApp('management');
      await pageObjects.svlManagementPage.assertRoleManagementCardExists();
      await pageObjects.svlManagementPage.clickRoleManagementCard();
      const url = await browser.getCurrentUrl();
      expect(url).to.contain('/management/security/roles');
    });

    after(async () => {
      await clearAllRoles(es, log);
    });

    it('should not display reserved roles', async () => {
      const table = await testSubjects.find('rolesTable');
      const tableContent = await table.getVisibleText();
      expect(tableContent).to.contain('No custom roles to show');
    });

    it('should create and only display custom roles', async () => {
      const customRole = 'serverless-custom-role';
      await pageObjects.security.addRole(customRole, {
        elasticsearch: {
          indices: [
            {
              names: ['dlstest'],
              privileges: ['read', 'view_index_metadata'],
            },
          ],
        },
      });

      const table = await testSubjects.find('rolesTable');
      const tableContent = await table.getVisibleText();
      expect(tableContent).to.contain(customRole);
    });
  });
};
