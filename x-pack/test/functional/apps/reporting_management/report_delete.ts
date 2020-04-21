/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'reporting']);
  const log = getService('log');
  const retry = getService('retry');
  // const find = getService('find');

  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');

  describe.only('Delete reports', function() {
    before(async () => {
      await esArchiver.load('empty_kibana');
      await esArchiver.load('reporting/archived_reports');
      await pageObjects.common.navigateToActualUrl('kibana', '/management/kibana/reporting');
      await testSubjects.existOrFail('reportJobListing', { timeout: 200000 });
    });

    after(async () => {
      // await pageObjects.common.sleep(30000);
      await esArchiver.unload('empty_kibana');
      await esArchiver.unload('reporting/archived_reports');
    });

    it('Confirm report deletion works', async () => {
      log.debug('Checking for reports.');

      // const table = await testSubjects.find('reportJobListing');
      // const rows = await table.findAllByCssSelector('tbody tr');
      // log.debug(rows.length);
      await retry.try(async () => {
        await testSubjects.click('checkboxSelectRow-k90jio0c105u66d68f0dox29');
      });
      const deleteButton = await testSubjects.find('deleteReportButton');
      await retry.waitFor('delete button to become enabled', async () => {
        return await deleteButton.isEnabled();
      });
      await deleteButton.click();
      await testSubjects.exists('confirmModalBodyText');
      await testSubjects.click('confirmModalConfirmButton');
      await retry.try(async () => {
        await testSubjects.waitForDeleted('checkboxSelectRow-k90jio0c105u66d68f0dox29');
      });
    });
  });
};
