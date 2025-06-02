/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const { reporting, common, discover, timePicker, header, dashboard, unifiedFieldList } =
    getPageObjects([
      'reporting',
      'common',
      'discover',
      'timePicker',
      'header',
      'dashboard',
      'unifiedFieldList',
    ]);
  const monacoEditor = getService('monacoEditor');
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');
  const dataGrid = getService('dataGrid');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardCustomizePanel = getService('dashboardCustomizePanel');
  const dashboardBadgeActions = getService('dashboardBadgeActions');

  const GENERATE_CSV_DATA_TEST_SUBJ = 'embeddablePanelAction-generateCsvReport';
  const SAVED_DISCOVER_SESSION_WITH_DATA_VIEW = 'savedDiscoverSessionWithDataView';
  const SAVED_DISCOVER_SESSION_WITH_ESQL = 'savedDiscoverSessionWithESQL';

  const getDashboardPanelReport = async (title: string, { timeout } = { timeout: 60 * 1000 }) => {
    await toasts.dismissAll();

    await dashboardPanelActions.expectExistsPanelAction(GENERATE_CSV_DATA_TEST_SUBJ, title);
    await dashboardPanelActions.clickPanelActionByTitle(GENERATE_CSV_DATA_TEST_SUBJ, title);
    await testSubjects.existOrFail('csvReportStarted'); /* validate toast panel */

    const url = await reporting.getReportURL(timeout);
    const res = await reporting.getResponse(url ?? '');

    expect(res.status).to.equal(200);
    expect(res.get('content-type')).to.equal('text/csv; charset=utf-8');
    return res;
  };

  const addEmbeddableToDashboard = async (title: string) => {
    await dashboardAddPanel.addSavedSearch(title);
    await header.waitUntilLoadingHasFinished();
    await dashboard.waitForRenderComplete();
    const rows = await dataGrid.getDocTableRows();
    expect(rows.length).to.be.above(0);
    await dashboard.saveDashboard('test-csv', {
      saveAsNew: true,
      waitDialogIsClosed: false,
      exitFromEditMode: true,
    });
    await header.waitUntilLoadingHasFinished();
    await dashboard.waitForRenderComplete();
  };

  const setDashboardGlobalTimeRange = async () => {
    const fromTime = 'Sep 19, 2015 @ 16:31:44.000';
    const toTime = 'Sep 21, 2015 @ 11:31:44.000';
    await timePicker.setAbsoluteRange(fromTime, toTime);
  };

  const setDashboardPanelCustomTimeRange = async () => {
    await dashboardPanelActions.customizePanel();
    await dashboardCustomizePanel.enableCustomTimeRange();

    const toTime = 'Sep 21, 2015 @ 01:31:44.000';
    const endTimeTestSubj =
      'customizePanelTimeRangeDatePicker > superDatePickerendDatePopoverButton';
    await retry.waitFor(`endDate is set to ${toTime}`, async () => {
      await testSubjects.click(endTimeTestSubj);
      await testSubjects.click('superDatePickerAbsoluteDateInput');
      await timePicker.inputValue('superDatePickerAbsoluteDateInput', toTime);
      await testSubjects.click(endTimeTestSubj);
      const actualToTime = await testSubjects.getVisibleText(endTimeTestSubj);
      return toTime === actualToTime;
    });

    await dashboardCustomizePanel.clickSaveButton();
    await dashboard.waitForRenderComplete();
    await dashboardBadgeActions.expectExistsTimeRangeBadgeAction();
  };

  describe('Discover Embeddable - Generate CSV report per panel', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await discover.selectIndexPattern('logstash-*');

      // create and save a discover session with filters in data view mode
      await unifiedFieldList.waitUntilSidebarHasLoaded();
      await unifiedFieldList.clickFieldListItem('geo.src');
      await unifiedFieldList.clickFieldListPlusFilter('geo.src', 'US');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await unifiedFieldList.clickFieldListItemAdd('extension');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await queryBar.setQuery('machine.os : ios');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getDocCount()).to.be(222);
      await discover.saveSearch(SAVED_DISCOVER_SESSION_WITH_DATA_VIEW);
      await header.waitUntilLoadingHasFinished();

      // create and save a discover session with filters in ES|QL mode
      await discover.clickNewSearchButton();
      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | sort @timestamp desc | stats averageB = avg(bytes) by extension | sort averageB desc'
      );
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getDocCount()).to.be(5);
      await discover.saveSearch(SAVED_DISCOVER_SESSION_WITH_ESQL);
      await header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    [SAVED_DISCOVER_SESSION_WITH_DATA_VIEW, SAVED_DISCOVER_SESSION_WITH_ESQL].map(
      (title: string) => {
        describe(`Generate Embeddable CSV for ${title}`, () => {
          beforeEach(async () => {
            await kibanaServer.savedObjects.clean({ types: ['dashboard'] });
          });

          it('generates a report with global time range', async () => {
            await dashboard.navigateToApp();
            await dashboard.clickNewDashboard();
            await setDashboardGlobalTimeRange();
            await addEmbeddableToDashboard(title);

            const { text: csvFile } = await getDashboardPanelReport(title);
            expectSnapshot(csvFile).toMatch();
          });

          it('generates a report with custom time range', async () => {
            await dashboard.navigateToApp();
            await dashboard.clickNewDashboard();
            await setDashboardGlobalTimeRange();
            await addEmbeddableToDashboard(title);
            await setDashboardPanelCustomTimeRange();

            const { text: csvFile } = await getDashboardPanelReport(title);
            expectSnapshot(csvFile).toMatch();
          });
        });
      }
    );
  });
}
