/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../../ftr_provider_context';

const getTableTextFromElement = async (tableEl: WebElementWrapper) => {
  const rows = await tableEl.findAllByCssSelector('tbody tr');
  return (
    await Promise.all(
      rows.map(async (row) => {
        return await row.getVisibleText();
      })
    )
  ).join('\n');
};

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'reporting']);
  const log = getService('log');
  const retry = getService('retry');
  const security = getService('security');

  const testSubjects = getService('testSubjects');
  const findInstance = getService('find');
  const esArchiver = getService('esArchiver');

  // FLAKY: https://github.com/elastic/kibana/issues/75044
  describe.skip('Listing of Reports', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'reporting_user']);
      await esArchiver.load('empty_kibana');
    });

    beforeEach(async () => {
      // to reset the data after deletion testing
      await esArchiver.load('reporting/archived_reports');
      await pageObjects.common.navigateToApp('reporting');
      await testSubjects.existOrFail('reportJobListing', { timeout: 200000 });
    });

    after(async () => {
      await esArchiver.unload('empty_kibana');
      await security.testUser.restoreDefaults();
    });

    afterEach(async () => {
      await esArchiver.unload('reporting/archived_reports');
    });

    it('Confirm single report deletion works', async () => {
      log.debug('Checking for reports.');
      await retry.try(async () => {
        await testSubjects.click('checkboxSelectRow-k9a9xlwl0gpe1457b10rraq3');
      });
      const deleteButton = await testSubjects.find('deleteReportButton');
      await retry.waitFor('delete button to become enabled', async () => {
        return await deleteButton.isEnabled();
      });
      await deleteButton.click();
      await testSubjects.exists('confirmModalBodyText');
      await testSubjects.click('confirmModalConfirmButton');
      await retry.try(async () => {
        await testSubjects.waitForDeleted('checkboxSelectRow-k9a9xlwl0gpe1457b10rraq3');
      });
    });

    it('Paginates content', async () => {
      const previousButton = await testSubjects.find('pagination-button-previous');

      // previous CAN NOT be clicked
      expect(await previousButton.getAttribute('disabled')).to.be('true');

      // scan page 1
      let tableText = await getTableTextFromElement(await testSubjects.find('reportJobListing'));
      const PAGE_CONTENT_1 = `[Logs] File Type Scatter Plot\n2020-04-21 @ 07:01 PM\ntest_user\nCompleted at 2020-04-21 @ 07:02 PM
[Logs] File Type Scatter Plot\n2020-04-21 @ 07:01 PM\ntest_user\nCompleted at 2020-04-21 @ 07:02 PM
[Logs] Heatmap\n2020-04-21 @ 07:00 PM\ntest_user\nCompleted at 2020-04-21 @ 07:01 PM
[Logs] Heatmap\n2020-04-21 @ 07:00 PM\ntest_user\nCompleted at 2020-04-21 @ 07:01 PM
[Flights] Flight Delays\n2020-04-21 @ 07:00 PM\ntest_user\nCompleted at 2020-04-21 @ 07:01 PM
[Flights] Flight Delays\n2020-04-21 @ 07:00 PM\ntest_user\nCompleted at 2020-04-21 @ 07:01 PM
pdf\n2020-04-21 @ 07:00 PM\ntest_user\nCompleted at 2020-04-21 @ 07:00 PM
pdf\n2020-04-21 @ 07:00 PM\ntest_user\nCompleted at 2020-04-21 @ 07:00 PM
[Flights] Flight Cancellations\n2020-04-21 @ 06:59 PM\ntest_user\nCompleted at 2020-04-21 @ 07:00 PM
[Flights] Markdown Instructions\n2020-04-21 @ 06:59 PM\ntest_user\nCompleted at 2020-04-21 @ 07:00 PM`;

      expect(tableText).to.be(PAGE_CONTENT_1);

      // click page 2
      await testSubjects.click('pagination-button-1');
      await findInstance.byCssSelector('[data-test-page="1"]');

      // previous CAN be clicked
      expect(await previousButton.getAttribute('disabled')).to.be(null);

      // scan page 2
      tableText = await getTableTextFromElement(await testSubjects.find('reportJobListing'));
      const PAGE_CONTENT_2 = `[eCommerce] Revenue Tracking\n2020-04-21 @ 06:58 PM\ntest_user\nCompleted at 2020-04-21 @ 06:59 PM
[Logs] Web Traffic\n2020-04-21 @ 06:58 PM\ntest_user\nCompleted at 2020-04-21 @ 06:59 PM
[Flights] Overview\n2020-04-21 @ 06:58 PM\ntest_user\nCompleted at 2020-04-21 @ 06:59 PM
[eCommerce] Revenue Dashboard\n2020-04-21 @ 06:57 PM\ntest_user\nCompleted at 2020-04-21 @ 06:58 PM
[Logs] Web Traffic\n2020-04-21 @ 06:57 PM\ntest_user\nCompleted at 2020-04-21 @ 06:58 PM
[Flights] Global Flight Dashboard\n2020-04-21 @ 06:56 PM\ntest_user\nCompleted at 2020-04-21 @ 06:57 PM
[Flights] Global Flight Dashboard\n2020-04-21 @ 06:56 PM\ntest_user\nCompleted at 2020-04-21 @ 06:57 PM
report4csv\nsearch\n2020-04-21 @ 06:55 PM\ntest_user\nCompleted at 2020-04-21 @ 06:56 PM - Max size reached
report3csv\nsearch\n2020-04-21 @ 06:55 PM\ntest_user\nCompleted at 2020-04-21 @ 06:55 PM - Max size reached
report2csv\nsearch\n2020-04-21 @ 06:54 PM\ntest_user\nCompleted at 2020-04-21 @ 06:55 PM - Max size reached`;
      expect(tableText).to.be(PAGE_CONTENT_2);

      // click page 3
      await testSubjects.click('pagination-button-2');
      await findInstance.byCssSelector('[data-test-page="2"]');

      // scan page 3
      tableText = await getTableTextFromElement(await testSubjects.find('reportJobListing'));
      const PAGE_CONTENT_3 = `report1csv\nsearch\n2020-04-21 @ 06:54 PM\ntest_user\nCompleted at 2020-04-21 @ 06:54 PM - Max size reached`;
      expect(tableText).to.be(PAGE_CONTENT_3);
    });
  });
};
