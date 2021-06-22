/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'reporting']);
  const log = getService('log');
  const retry = getService('retry');
  const security = getService('security');

  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');

  describe('Listing of Reports', function () {
    before(async () => {
      await security.role.create('test_reporting_user', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: { canvas: ['minimal_read', 'generate_report'] },
          },
        ],
      });
      await security.testUser.setRoles(['kibana_admin', 'test_reporting_user']);
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    });

    beforeEach(async () => {
      // to reset the data after deletion testing
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/archived_reports');
      await pageObjects.common.navigateToApp('reporting');
      await testSubjects.existOrFail('reportJobListing', { timeout: 200000 });
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
      await security.testUser.restoreDefaults();
    });

    afterEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/archived_reports');
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

    it('Paginates historical reports', async () => {
      // previous CAN NOT be clicked
      const previousButton = await testSubjects.find('pagination-button-previous');
      expect(await previousButton.getAttribute('disabled')).to.be('true');

      await testSubjects.find('checkboxSelectRow-k9a9xlwl0gpe1457b10rraq3'); // find first row of page 1

      await testSubjects.click('pagination-button-1'); // click page 2
      await testSubjects.find('checkboxSelectRow-k9a9uc4x0gpe1457b16wthc8'); // wait for first row of page 2

      await testSubjects.click('pagination-button-2'); // click page 3
      await testSubjects.find('checkboxSelectRow-k9a9p1840gpe1457b1ghfxw5'); // wait for first row of page 3

      // previous CAN be clicked
      expect(await previousButton.getAttribute('disabled')).to.be(null);
    });
  });
};
