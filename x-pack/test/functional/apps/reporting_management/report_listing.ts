/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { REPORT_TABLE_ID } from '@kbn/reporting-common';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'reporting', 'settings', 'console']);
  const log = getService('log');
  const retry = getService('retry');
  const security = getService('security');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const find = getService('find');
  const browser = getService('browser');

  describe('Listing of Reports', function () {
    const kbnArchive =
      'x-pack/test/functional/fixtures/kbn_archiver/reporting/view_in_console_index_pattern.json';

    before(async () => {
      await security.testUser.setRoles([
        'kibana_admin', // to access stack management
      ]);
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(kbnArchive);
    });

    after(async () => {
      await kibanaServer.importExport.unload(kbnArchive);
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.restoreDefaults();
    });

    beforeEach(async () => {
      // to reset the data after deletion testing
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/archived_reports');
      await pageObjects.common.navigateToApp('reporting');
      await testSubjects.existOrFail(REPORT_TABLE_ID, { timeout: 200000 });
    });

    afterEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/archived_reports');
    });

    it('Confirm single report deletion works', async () => {
      log.debug('Checking for reports.');
      await retry.try(async () => {
        await testSubjects.click('checkboxSelectRow-krazcyw4156m0763b503j7f9');
      });

      const deleteButton = await testSubjects.find('deleteReportButton');
      await retry.waitFor('delete button to become enabled', async () => {
        return await deleteButton.isEnabled();
      });
      await deleteButton.click();
      await testSubjects.exists('confirmModalBodyText');
      await testSubjects.click('confirmModalConfirmButton');
      await retry.try(async () => {
        await testSubjects.waitForDeleted('checkboxSelectRow-krazcyw4156m0763b503j7f9');
      });
    });

    it('Paginates historical reports', async () => {
      // previous CAN NOT be clicked
      const previousButton = await testSubjects.find('pagination-button-previous');
      expect(await previousButton.getAttribute('disabled')).to.be('true');

      await testSubjects.find('checkboxSelectRow-krazcyw4156m0763b503j7f9'); // find first row of page 1

      await testSubjects.click('pagination-button-1'); // click page 2
      await testSubjects.find('checkboxSelectRow-k9a9xj3i0gpe1457b16qaduc'); // wait for first row of page 2

      // previous CAN be clicked
      expect(await previousButton.getAttribute('disabled')).to.be(null);
    });

    it('Displays types of report jobs', async () => {
      const list = await pageObjects.reporting.getManagementList();
      expectSnapshot(list).toMatch();
    });

    it('Exposes an action to see the ES query in console', async () => {
      const csvReportTitle = 'Discover search [2021-07-19T11:44:48.670-07:00]';
      await pageObjects.reporting.openReportFlyout(csvReportTitle);

      // Open "Actions" menu inside the flyout
      await testSubjects.click('reportInfoFlyoutActionsButton');

      expect(await find.existsByCssSelector('.euiContextMenuPanel')).to.eql(true);
      const contextMenu = await find.byClassName('euiContextMenuPanel');
      const contextMenuText = await contextMenu.getVisibleText();

      expect(contextMenuText).to.contain('Inspect query in Console');

      await testSubjects.click('reportInfoFlyoutOpenInConsoleButton');

      await pageObjects.common.waitUntilUrlIncludes('dev_tools#/console');

      await retry.try(async () => {
        // Getting the text of the console directly will only return the visible
        // text, not the full content so this test could fail on smaller screens.
        // So we need to copy the content to the clipboard and then read it from there.
        await pageObjects.console.copyRequestsToClipboard();
        const actualRequest = await browser.execute(() => navigator.clipboard.readText());

        expect(actualRequest.trim()).to.contain(
          '# These are the queries used when exporting data for\n# the CSV report'
        );

        expect(actualRequest).to.contain('POST /_search');
      });
    });
  });
};
