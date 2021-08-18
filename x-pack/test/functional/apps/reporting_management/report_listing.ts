/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { REPORT_TABLE_ID } from '../../../../plugins/reporting/common/constants';
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
      await testSubjects.existOrFail(REPORT_TABLE_ID, { timeout: 200000 });
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
        await testSubjects.click('checkboxSelectRow-krb7arhe164k0763b50bjm29');
      });
      const deleteButton = await testSubjects.find('deleteReportButton');
      await retry.waitFor('delete button to become enabled', async () => {
        return await deleteButton.isEnabled();
      });
      await deleteButton.click();
      await testSubjects.exists('confirmModalBodyText');
      await testSubjects.click('confirmModalConfirmButton');
      await retry.try(async () => {
        await testSubjects.waitForDeleted('checkboxSelectRow-krb7arhe164k0763b50bjm29');
      });
    });

    it('Paginates historical reports', async () => {
      // previous CAN NOT be clicked
      const previousButton = await testSubjects.find('pagination-button-previous');
      expect(await previousButton.getAttribute('disabled')).to.be('true');

      await testSubjects.find('checkboxSelectRow-krb7arhe164k0763b50bjm29'); // find first row of page 1

      await testSubjects.click('pagination-button-1'); // click page 2
      await testSubjects.find('checkboxSelectRow-kraz0qle154g0763b569zz83'); // wait for first row of page 2

      await testSubjects.click('pagination-button-2'); // click page 3
      await testSubjects.find('checkboxSelectRow-k9a9p1840gpe1457b1ghfxw5'); // wait for first row of page 3

      // previous CAN be clicked
      expect(await previousButton.getAttribute('disabled')).to.be(null);
    });

    it('Displays types of report jobs', async () => {
      const list = await pageObjects.reporting.getManagementList();
      expectSnapshot(list).toMatchInline(`
        Array [
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 10:29 PMtest_user",
            "report": "Automated reportsearch",
            "status": "Completed at 2021-07-19 @ 10:29 PM See report info for warnings. This is a deprecated export type. Automation of this report will need to be re-created for compatibility with future versions of Kibana.",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:47 PMtest_user",
            "report": "Discover search [2021-07-19T11:47:35.995-07:00]search",
            "status": "Completed at 2021-07-19 @ 06:47 PM",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:46 PMtest_user",
            "report": "Discover search [2021-07-19T11:46:00.132-07:00]search",
            "status": "Completed at 2021-07-19 @ 06:46 PM See report info for warnings.",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:44 PMtest_user",
            "report": "Discover search [2021-07-19T11:44:48.670-07:00]search",
            "status": "Completed at 2021-07-19 @ 06:44 PM See report info for warnings.",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:41 PMtest_user",
            "report": "[Flights] Global Flight Dashboarddashboard",
            "status": "Pending at 2021-07-19 @ 06:41 PM Waiting for job to process.",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:41 PMtest_user",
            "report": "[Flights] Global Flight Dashboarddashboard",
            "status": "Failed at 2021-07-19 @ 06:43 PM See report info for error details.",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:41 PMtest_user",
            "report": "[Flights] Global Flight Dashboarddashboard",
            "status": "Completed at 2021-07-19 @ 06:41 PM See report info for warnings.",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:38 PMtest_user",
            "report": "[Flights] Global Flight Dashboarddashboard",
            "status": "Completed at 2021-07-19 @ 06:39 PM See report info for warnings.",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:38 PMtest_user",
            "report": "[Flights] Global Flight Dashboarddashboard",
            "status": "Completed at 2021-07-19 @ 06:39 PM",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:38 PMtest_user",
            "report": "[Flights] Global Flight Dashboarddashboard",
            "status": "Completed at 2021-07-19 @ 06:38 PM",
          },
        ]
      `);
    });
  });
};
