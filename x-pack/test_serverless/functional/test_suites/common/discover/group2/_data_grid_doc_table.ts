/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const dataGrid = getService('dataGrid');
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const monacoEditor = getService('monacoEditor');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const PageObjects = getPageObjects([
    'common',
    'svlCommonPage',
    'discover',
    'header',
    'timePicker',
    'dashboard',
    'unifiedFieldList',
  ]);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'discover:rowHeightOption': 0, // single line
  };
  const testSubjects = getService('testSubjects');
  const security = getService('security');

  describe('discover data grid doc table', function describeIndexTests() {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      log.debug('load kibana index with default index pattern');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.svlCommonPage.loginWithPrivilegedRole();
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToApp('discover');
    });

    after(async function () {
      log.debug('reset uiSettings');
      await kibanaServer.uiSettings.replace({});
    });

    it('should show rows by default', async function () {
      // with the default range the number of hits is ~14000
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);
    });

    it('should refresh the table content when changing time window', async function () {
      const initialRows = await dataGrid.getDocTableRows();

      const fromTime = 'Sep 20, 2015 @ 23:00:00.000';
      const toTime = 'Sep 20, 2015 @ 23:14:00.000';

      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.discover.waitUntilSearchingHasFinished();

      const finalRows = await PageObjects.discover.getDocTableRows();
      expect(finalRows.length).to.be.below(initialRows.length);
    });

    it('should show popover with expanded cell content by click on expand button', async () => {
      log.debug('open popover with expanded cell content to get json from the editor');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await retry.waitForWithTimeout('timestamp matches expected doc', 5000, async () => {
        const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        const text = await cell.getVisibleText();
        log.debug(`row document timestamp: ${text}`);
        return text === 'Sep 22, 2015 @ 23:50:13.253';
      });

      await dataGrid.clickCellExpandButton(0, 3);

      let expandDocId = '';
      await retry.waitForWithTimeout('expandDocId to be valid', 5000, async () => {
        const text = await monacoEditor.getCodeEditorValue();
        const flyoutJson = JSON.parse(text);
        expandDocId = flyoutJson._id;
        return expandDocId === 'AU_x3_g4GFA8no6QjkYX';
      });
      log.debug(`expanded document id: ${expandDocId}`);

      await dataGrid.clickRowToggle();
      await find.clickByCssSelectorWhenNotDisabledWithoutRetry(
        '#kbn_doc_viewer_tab_doc_view_source'
      );

      await retry.waitForWithTimeout(
        'document id in flyout matching the expanded document id',
        5000,
        async () => {
          const text = await monacoEditor.getCodeEditorValue();
          const flyoutJson = JSON.parse(text);
          log.debug(`flyout document id: ${flyoutJson._id}`);
          return flyoutJson._id === expandDocId;
        }
      );
    });

    it('should show popover with expanded cell content by click on expand button on embeddable', async () => {
      log.debug('open popover with expanded cell content to get json from the editor');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await PageObjects.discover.saveSearch('expand-cell-search');

      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await dashboardAddPanel.addSavedSearch('expand-cell-search');

      await retry.waitForWithTimeout('timestamp matches expected doc', 5000, async () => {
        const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        const text = await cell.getVisibleText();
        log.debug(`row document timestamp: ${text}`);
        return text === 'Sep 22, 2015 @ 23:50:13.253';
      });
      await dataGrid.clickCellExpandButton(0, 3);

      let expandDocId = '';
      await retry.waitForWithTimeout('expandDocId to be valid', 5000, async () => {
        const text = await monacoEditor.getCodeEditorValue();
        return (expandDocId = JSON.parse(text)._id) === 'AU_x3_g4GFA8no6QjkYX';
      });
      log.debug(`expanded document id: ${expandDocId}`);

      await dataGrid.clickRowToggle();
      await find.clickByCssSelectorWhenNotDisabledWithoutRetry(
        '#kbn_doc_viewer_tab_doc_view_source'
      );

      await retry.waitForWithTimeout(
        'document id in flyout matching the expanded document id',
        5000,
        async () => {
          const text = await monacoEditor.getCodeEditorValue();
          const flyoutJson = JSON.parse(text);
          log.debug(`flyout document id: ${flyoutJson._id}`);
          return flyoutJson._id === expandDocId;
        }
      );
    });

    describe('expand a document row', function () {
      const rowToInspect = 1;

      it('should expand the detail row when the toggle arrow is clicked', async function () {
        await retry.try(async function () {
          await dataGrid.clickRowToggle({ isAnchorRow: false, rowIndex: rowToInspect - 1 });
          const detailsEl = await dataGrid.getDetailsRows();
          const defaultMessageEl = await detailsEl[0].findByTestSubject('docViewerRowDetailsTitle');
          expect(defaultMessageEl).to.be.ok();
          await dataGrid.closeFlyout();
        });
      });

      it('should show the detail panel actions', async function () {
        await retry.try(async function () {
          await dataGrid.clickRowToggle({ isAnchorRow: false, rowIndex: rowToInspect - 1 });
          const [surroundingActionEl, singleActionEl] = await dataGrid.getRowActions({
            isAnchorRow: false,
            rowIndex: rowToInspect - 1,
          });
          expect(surroundingActionEl).to.be.ok();
          expect(singleActionEl).to.be.ok();
          await dataGrid.closeFlyout();
        });
      });

      it('should allow paginating docs in the flyout by clicking in the doc table', async function () {
        await retry.try(async function () {
          await dataGrid.clickRowToggle({ rowIndex: rowToInspect - 1 });
          await testSubjects.exists(`docViewerFlyoutNavigationPage0`);
          await dataGrid.clickRowToggle({ rowIndex: rowToInspect });
          await testSubjects.exists(`docViewerFlyoutNavigationPage1`);
          await dataGrid.closeFlyout();
        });
      });

      it('should show allow adding columns from the detail panel', async function () {
        await retry.try(async function () {
          await dataGrid.clickRowToggle({ isAnchorRow: false, rowIndex: rowToInspect - 1 });

          // add columns
          const fields = ['_id', '_index', 'agent'];
          for (const field of fields) {
            await dataGrid.clickFieldActionInFlyout(field, 'toggleColumnButton');
          }

          const headerWithFields = await dataGrid.getHeaderFields();
          expect(headerWithFields.join(' ')).to.contain(fields.join(' '));

          // remove columns
          for (const field of fields) {
            await dataGrid.clickFieldActionInFlyout(field, 'toggleColumnButton');
          }

          const headerWithoutFields = await dataGrid.getHeaderFields();
          expect(headerWithoutFields.join(' ')).not.to.contain(fields.join(' '));

          await dataGrid.closeFlyout();
        });
      });
    });

    describe('add and remove columns', function () {
      const extraColumns = ['phpmemory', 'ip'];
      const expectedFieldLength: Record<string, number> = {
        phpmemory: 1,
        ip: 4,
      };
      afterEach(async function () {
        for (const column of extraColumns) {
          await PageObjects.unifiedFieldList.clickFieldListItemRemove(column);
          await PageObjects.header.waitUntilLoadingHasFinished();
        }
      });

      it('should add more columns to the table', async function () {
        for (const column of extraColumns) {
          await PageObjects.unifiedFieldList.clearFieldSearchInput();
          await PageObjects.unifiedFieldList.findFieldByName(column);
          await PageObjects.unifiedFieldList.waitUntilFieldlistHasCountOfFields(
            expectedFieldLength[column]
          );
          await PageObjects.unifiedFieldList.clickFieldListItemAdd(column);
          await PageObjects.header.waitUntilLoadingHasFinished();
          // test the header now
          const header = await dataGrid.getHeaderFields();
          expect(header.join(' ')).to.have.string(column);
        }
      });

      it('should remove columns from the table', async function () {
        for (const column of extraColumns) {
          await PageObjects.unifiedFieldList.clearFieldSearchInput();
          await PageObjects.unifiedFieldList.findFieldByName(column);
          await PageObjects.unifiedFieldList.waitUntilFieldlistHasCountOfFields(
            expectedFieldLength[column]
          );
          await PageObjects.unifiedFieldList.clickFieldListItemAdd(column);
          await PageObjects.header.waitUntilLoadingHasFinished();
        }
        // remove the second column
        await PageObjects.unifiedFieldList.clickFieldListItemRemove(extraColumns[1]);
        await PageObjects.header.waitUntilLoadingHasFinished();
        // test that the second column is no longer there
        const header = await dataGrid.getHeaderFields();
        expect(header.join(' ')).to.not.have.string(extraColumns[1]);
      });
    });
  });
}
