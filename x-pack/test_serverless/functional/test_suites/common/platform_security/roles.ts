/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

// Note: this suite is currently only called from the feature flags test config:
// x-pack/test_serverless/functional/test_suites/search/config.feature_flags.ts
// This can be moved into the common config groups once custom roles are enabled
// permanently in serverless.

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'svlCommonPage', 'svlManagementPage', 'security']);
  const browser = getService('browser');
  const platformSecurityUtils = getService('platformSecurityUtils');

  describe('Roles', function () {
    // custom roles are not enabled for observability projects
    this.tags(['skipSvlOblt']);

    describe('as Viewer', () => {
      before(async () => {
        await pageObjects.svlCommonPage.loginAsViewer();
        await pageObjects.common.navigateToApp('management');
      });

      it('should not display the roles management card', async () => {
        await pageObjects.svlManagementPage.assertRoleManagementCardDoesNotExist();
      });
    });

    describe('as Admin', () => {
      before(async () => {
        await pageObjects.svlCommonPage.loginAsAdmin();
        await pageObjects.common.navigateToApp('management');
        await pageObjects.svlManagementPage.assertRoleManagementCardExists();
        await pageObjects.svlManagementPage.clickRoleManagementCard();
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/management/security/roles');
      });

      after(async () => {
        await platformSecurityUtils.clearAllRoles();
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

        const rows = await testSubjects.findAll('roleRow');
        expect(rows.length).equal(1);
        const cells = await rows[0].findAllByClassName('euiTableRowCell');
        expect(cells.length).greaterThan(1);
        const cellContent = await cells[0].getVisibleText();
        expect(cellContent).to.contain(customRole);
      });
    });
  });
};
