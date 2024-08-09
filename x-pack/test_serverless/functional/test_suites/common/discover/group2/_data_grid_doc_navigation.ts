/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const filterBar = getService('filterBar');
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'svlCommonPage', 'discover', 'timePicker']);
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const defaultSettings = { defaultIndex: 'logstash-*' };

  describe('discover data grid doc link', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await PageObjects.svlCommonPage.loginAsViewer();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    beforeEach(async function () {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
    });

    it('should open the doc view of the selected document', async function () {
      // navigate to the doc view
      await dataGrid.clickRowToggle({ rowIndex: 0 });

      // click the open action
      await retry.try(async () => {
        const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
        if (!rowActions.length) {
          throw new Error('row actions empty, trying again');
        }
        await rowActions[0].click();
      });

      await retry.waitFor('hit loaded', async () => {
        const hasDocHit = await testSubjects.exists('doc-hit');
        return !!hasDocHit;
      });
    });

    it('should create an exists filter from doc view of the selected document', async function () {
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await dataGrid.clickRowToggle({ rowIndex: 0 });
      await dataGrid.clickFieldActionInFlyout('@timestamp', 'addExistsFilterButton');

      const hasExistsFilter = await filterBar.hasFilter('@timestamp', 'exists', true, false, false);
      expect(hasExistsFilter).to.be(true);
    });
  });
}
