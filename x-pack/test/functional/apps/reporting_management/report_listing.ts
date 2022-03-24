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
      await security.testUser.setRoles([
        'kibana_admin', // to access stack management
        'reporting_user', // NOTE: the built-in role granting full reporting access is deprecated. See xpack.reporting.roles.enabled
      ]);
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
      expectSnapshot(list).toMatchInline(`
        Array [
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:47 PM",
            "report": "Discover search [2021-07-19T11:47:35.995-07:00]",
            "status": "Done",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:46 PM",
            "report": "Discover search [2021-07-19T11:46:00.132-07:00]",
            "status": "Done, warnings detected",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:44 PM",
            "report": "Discover search [2021-07-19T11:44:48.670-07:00]",
            "status": "Done, warnings detected",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:41 PM",
            "report": "[Flights] Global Flight Dashboard",
            "status": "Pending",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:41 PM",
            "report": "[Flights] Global Flight Dashboard",
            "status": "Failed",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:41 PM",
            "report": "[Flights] Global Flight Dashboard",
            "status": "Done, warnings detected",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:38 PM",
            "report": "[Flights] Global Flight Dashboard",
            "status": "Done, warnings detected",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:38 PM",
            "report": "[Flights] Global Flight Dashboard",
            "status": "Done",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 06:38 PM",
            "report": "[Flights] Global Flight Dashboard",
            "status": "Done",
          },
          Object {
            "actions": "",
            "createdAt": "2021-07-19 @ 02:41 PM",
            "report": "[Flights] Global Flight Dashboard",
            "status": "Failed",
          },
        ]
      `);
    });
  });
};
