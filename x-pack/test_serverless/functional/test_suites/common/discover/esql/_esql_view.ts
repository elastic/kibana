/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');
  const inspector = getService('inspector');
  const retry = getService('retry');
  const browser = getService('browser');
  const find = getService('find');
  const esql = getService('esql');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const PageObjects = getPageObjects([
    'svlCommonPage',
    'common',
    'discover',
    'dashboard',
    'header',
    'timePicker',
    'unifiedFieldList',
  ]);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover esql view', async function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      log.debug('load kibana index with default index pattern');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.svlCommonPage.loginAsAdmin();
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    describe('test', () => {
      it('should render esql view correctly', async function () {
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

        await testSubjects.existOrFail('showQueryBarMenu');
        await testSubjects.existOrFail('superDatePickerToggleQuickMenuButton');
        await testSubjects.existOrFail('addFilter');
        await testSubjects.existOrFail('dscViewModeDocumentButton');
        await testSubjects.existOrFail('unifiedHistogramChart');
        await testSubjects.existOrFail('discoverQueryHits');
        await testSubjects.existOrFail('discoverAlertsButton');
        await testSubjects.existOrFail('shareTopNavButton');
        await testSubjects.existOrFail('docTableExpandToggleColumn');
        await testSubjects.existOrFail('dataGridColumnSortingButton');
        await testSubjects.existOrFail('fieldListFiltersFieldSearch');
        await testSubjects.existOrFail('fieldListFiltersFieldTypeFilterToggle');
        await testSubjects.click('field-@message-showDetails');
        await testSubjects.existOrFail('discoverFieldListPanelEdit-@message');

        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

        await testSubjects.existOrFail('fieldListFiltersFieldSearch');
        await testSubjects.existOrFail('TextBasedLangEditor');
        await testSubjects.existOrFail('superDatePickerToggleQuickMenuButton');

        await testSubjects.missingOrFail('showQueryBarMenu');
        await testSubjects.missingOrFail('addFilter');
        await testSubjects.missingOrFail('dscViewModeDocumentButton');
        // when Lens suggests a table, we render an ESQL based histogram
        await testSubjects.existOrFail('unifiedHistogramChart');
        await testSubjects.existOrFail('discoverQueryHits');
        await testSubjects.existOrFail('discoverAlertsButton');
        await testSubjects.existOrFail('shareTopNavButton');
        await testSubjects.existOrFail('dataGridColumnSortingButton');
        await testSubjects.existOrFail('docTableExpandToggleColumn');
        await testSubjects.existOrFail('fieldListFiltersFieldTypeFilterToggle');
        await testSubjects.click('field-@message-showDetails');
        await testSubjects.missingOrFail('discoverFieldListPanelEditItem');
      });

      it('should perform test query correctly', async function () {
        await PageObjects.discover.selectTextBaseLang();
        const testQuery = `from logstash-* | limit 10 | stats countB = count(bytes) by geo.dest | sort countB`;

        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        // here Lens suggests a XY so it is rendered
        await testSubjects.existOrFail('unifiedHistogramChart');
        await testSubjects.existOrFail('xyVisChart');
        const cell = await dataGrid.getCellElement(0, 2);
        expect(await cell.getVisibleText()).to.be('1');
      });

      it('should render when switching to a time range with no data, then back to a time range with data', async () => {
        await PageObjects.discover.selectTextBaseLang();
        const testQuery = `from logstash-* | limit 10 | stats countB = count(bytes) by geo.dest | sort countB`;
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        let cell = await dataGrid.getCellElement(0, 2);
        expect(await cell.getVisibleText()).to.be('1');
        await PageObjects.timePicker.setAbsoluteRange(
          'Sep 19, 2015 @ 06:31:44.000',
          'Sep 19, 2015 @ 06:31:44.000'
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await testSubjects.existOrFail('discoverNoResults');
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        cell = await dataGrid.getCellElement(0, 2);
        expect(await cell.getVisibleText()).to.be('1');
      });

      it('should query an index pattern that doesnt translate to a dataview correctly', async function () {
        await PageObjects.discover.selectTextBaseLang();
        const testQuery = `from logstash* | limit 10 | stats countB = count(bytes) by geo.dest | sort countB`;

        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const cell = await dataGrid.getCellElement(0, 2);
        expect(await cell.getVisibleText()).to.be('1');
      });

      it('should render correctly if there are empty fields', async function () {
        await PageObjects.discover.selectTextBaseLang();
        const testQuery = `from logstash-* | limit 10 | keep machine.ram_range, bytes`;

        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const cell = await dataGrid.getCellElement(0, 3);
        expect(await cell.getVisibleText()).to.be(' - ');
        expect(await dataGrid.getHeaders()).to.eql([
          'Control column',
          'Select column',
          'Numberbytes',
          'machine.ram_range',
        ]);
      });

      it('should work without a FROM statement', async function () {
        await PageObjects.discover.selectTextBaseLang();
        const testQuery = `ROW a = 1, b = "two", c = null`;

        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.discover.dragFieldToTable('a');
        const cell = await dataGrid.getCellElement(0, 2);
        expect(await cell.getVisibleText()).to.be('1');
      });
    });

    describe('errors', () => {
      it('should show error messages for syntax errors in query', async function () {
        await PageObjects.discover.selectTextBaseLang();
        const brokenQueries = [
          'from logstash-* | limit 10*',
          'from logstash-* | limit A',
          'from logstash-* | where a*',
          'limit 10',
        ];
        for (const testQuery of brokenQueries) {
          await monacoEditor.setCodeEditorValue(testQuery);
          await testSubjects.click('querySubmitButton');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();
          // error in fetching documents because of the invalid query
          await PageObjects.discover.showsErrorCallout();
          const message = await testSubjects.getVisibleText('discoverErrorCalloutMessage');
          expect(message).to.contain(
            "[esql] > Couldn't parse Elasticsearch ES|QL query. Check your query and try again."
          );
          expect(message).to.not.contain('undefined');
          if (message.includes('line')) {
            expect((await monacoEditor.getCurrentMarkers('kibanaCodeEditor')).length).to.eql(1);
          }
        }
      });
    });

    describe('switch modal', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.timePicker.setDefaultAbsoluteRange();
      });

      it('should show switch modal when switching to a data view', async () => {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.discover.selectIndexPattern('logstash-*', false);
        await retry.try(async () => {
          await testSubjects.existOrFail('unifiedSearch_switch_modal');
        });
      });

      it('should not show switch modal when switching to a data view while a saved search is open', async () => {
        await PageObjects.discover.selectTextBaseLang();
        const testQuery = 'from logstash-* | limit 100 | drop @timestamp';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.discover.selectIndexPattern('logstash-*', false);
        await retry.try(async () => {
          await testSubjects.existOrFail('unifiedSearch_switch_modal');
        });
        await find.clickByCssSelector(
          '[data-test-subj="unifiedSearch_switch_modal"] .euiModal__closeIcon'
        );
        await retry.try(async () => {
          await testSubjects.missingOrFail('unifiedSearch_switch_modal');
        });
        await PageObjects.discover.saveSearch('esql_test');
        await PageObjects.discover.selectIndexPattern('logstash-*');
        await testSubjects.missingOrFail('unifiedSearch_switch_modal');
      });

      it('should show switch modal when switching to a data view while a saved search with unsaved changes is open', async () => {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.discover.saveSearch('esql_test2');
        const testQuery = 'from logstash-* | limit 100 | drop @timestamp';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.discover.selectIndexPattern('logstash-*', false);
        await retry.try(async () => {
          await testSubjects.existOrFail('unifiedSearch_switch_modal');
        });
      });
    });

    describe('inspector', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.timePicker.setDefaultAbsoluteRange();
      });

      it('shows Discover and Lens requests in Inspector', async () => {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await inspector.open();
        const requestNames = await inspector.getRequestNames();
        expect(requestNames).to.contain('Table');
        expect(requestNames).to.contain('Visualization');
      });
    });

    describe('query history', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.timePicker.setDefaultAbsoluteRange();
      });

      it('should see my current query in the history', async () => {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

        await testSubjects.click('TextBasedLangEditor-expand');
        await testSubjects.click('TextBasedLangEditor-toggle-query-history-button');
        const historyItems = await esql.getHistoryItems();
        log.debug(historyItems);
        const queryAdded = historyItems.some((item) => {
          return item[1] === 'from logstash-* | limit 10';
        });

        expect(queryAdded).to.be(true);
      });

      it('updating the query should add this to the history', async () => {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

        const testQuery = 'from logstash-* | limit 100 | drop @timestamp';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await testSubjects.click('TextBasedLangEditor-expand');
        await testSubjects.click('TextBasedLangEditor-toggle-query-history-button');
        const historyItems = await esql.getHistoryItems();
        log.debug(historyItems);
        const queryAdded = historyItems.some((item) => {
          return item[1] === 'from logstash-* | limit 100 | drop @timestamp';
        });

        expect(queryAdded).to.be(true);
      });

      it('should select a query from the history and submit it', async () => {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

        await testSubjects.click('TextBasedLangEditor-expand');
        await testSubjects.click('TextBasedLangEditor-toggle-query-history-button');
        // click a history item
        await esql.clickHistoryItem(1);

        const historyItems = await esql.getHistoryItems();
        log.debug(historyItems);
        const queryAdded = historyItems.some((item) => {
          return item[1] === 'from logstash-* | limit 100 | drop @timestamp';
        });

        expect(queryAdded).to.be(true);
      });

      it('should add a failed query to the history', async () => {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

        const testQuery = 'from logstash-* | limit 100 | woof and meow';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
        await testSubjects.click('TextBasedLangEditor-expand');
        await testSubjects.click('TextBasedLangEditor-toggle-query-history-button');
        await testSubjects.click('TextBasedLangEditor-queryHistory-runQuery-button');
        const historyItem = await esql.getHistoryItem(0);
        await historyItem.findByTestSubject('TextBasedLangEditor-queryHistory-error');
      });
    });

    describe('sorting', () => {
      it('should sort correctly', async () => {
        const savedSearchName = 'testSorting';

        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();

        const testQuery = 'from logstash-* | sort @timestamp | limit 100';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

        await PageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await retry.waitFor('first cell contains an initial value', async () => {
          const cell = await dataGrid.getCellElement(0, 2);
          const text = await cell.getVisibleText();
          return text === '1,623';
        });

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields'
        );

        await dataGrid.clickDocSortDesc('bytes', 'Sort High-Low');

        await PageObjects.discover.waitUntilSearchingHasFinished();

        await retry.waitFor('first cell contains the highest value', async () => {
          const cell = await dataGrid.getCellElement(0, 2);
          const text = await cell.getVisibleText();
          return text === '483';
        });

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields\n1'
        );

        await PageObjects.discover.saveSearch(savedSearchName);

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await retry.waitFor('first cell contains the same highest value', async () => {
          const cell = await dataGrid.getCellElement(0, 2);
          const text = await cell.getVisibleText();
          return text === '483';
        });

        await browser.refresh();

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await retry.waitFor('first cell contains the same highest value after reload', async () => {
          const cell = await dataGrid.getCellElement(0, 2);
          const text = await cell.getVisibleText();
          return text === '483';
        });

        await PageObjects.discover.clickNewSearchButton();

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await PageObjects.discover.loadSavedSearch(savedSearchName);

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await retry.waitFor(
          'first cell contains the same highest value after reopening',
          async () => {
            const cell = await dataGrid.getCellElement(0, 2);
            const text = await cell.getVisibleText();
            return text === '483';
          }
        );

        await dataGrid.clickDocSortDesc('bytes', 'Sort Low-High');

        await PageObjects.discover.waitUntilSearchingHasFinished();

        await retry.waitFor('first cell contains the lowest value', async () => {
          const cell = await dataGrid.getCellElement(0, 2);
          const text = await cell.getVisibleText();
          return text === '0';
        });

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields\n1'
        );

        await PageObjects.unifiedFieldList.clickFieldListItemAdd('extension');

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await dataGrid.clickDocSortDesc('extension', 'Sort A-Z');

        await retry.waitFor('first cell contains the lowest value for extension', async () => {
          const cell = await dataGrid.getCellElement(0, 3);
          const text = await cell.getVisibleText();
          return text === 'css';
        });

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields\n2'
        );

        await browser.refresh();

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await retry.waitFor('first cell contains the same lowest value after reload', async () => {
          const cell = await dataGrid.getCellElement(0, 2);
          const text = await cell.getVisibleText();
          return text === '0';
        });

        await retry.waitFor(
          'first cell contains the same lowest value for extension after reload',
          async () => {
            const cell = await dataGrid.getCellElement(0, 3);
            const text = await cell.getVisibleText();
            return text === 'css';
          }
        );

        await PageObjects.discover.saveSearch(savedSearchName);

        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await dashboardAddPanel.clickOpenAddPanel();
        await dashboardAddPanel.addSavedSearch(savedSearchName);
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.waitFor(
          'first cell contains the same lowest value as dashboard panel',
          async () => {
            const cell = await dataGrid.getCellElement(0, 2);
            const text = await cell.getVisibleText();
            return text === '0';
          }
        );

        await retry.waitFor(
          'first cell contains the lowest value for extension as dashboard panel',
          async () => {
            const cell = await dataGrid.getCellElement(0, 3);
            const text = await cell.getVisibleText();
            return text === 'css';
          }
        );

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields\n2'
        );
      });
    });
  });
}
