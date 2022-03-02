/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test';

import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../../ftr_provider_context';

type ExpectedSectionTableEntries = Record<string, string>;
export interface ExpectedSectionTable {
  section: string;
  expectedEntries: ExpectedSectionTableEntries;
}

export type AnalyticsTableRowDetails = Record<'jobDetails', ExpectedSectionTable[]>;

export type MlDFAJobTable = ProvidedType<typeof MachineLearningDataFrameAnalyticsTableProvider>;

export function MachineLearningDataFrameAnalyticsTableProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return new (class AnalyticsTable {
    public async parseAnalyticsTable(
      tableEnvironment: 'mlDataFrameAnalytics' | 'stackMgmtJobList' = 'mlDataFrameAnalytics'
    ) {
      const table = await testSubjects.find('~mlAnalyticsTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~mlAnalyticsTableRow').toArray()) {
        const $tr = $(tr);

        const rowObject: {
          id: string;
          description: string;
          memoryStatus: string;
          sourceIndex: string;
          destinationIndex: string;
          type: string;
          status: string;
          progress: string;
          spaces?: string[];
        } = {
          id: $tr
            .findTestSubject('mlAnalyticsTableColumnId')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          description: $tr
            .findTestSubject('mlAnalyticsTableColumnJobDescription')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          memoryStatus: $tr
            .findTestSubject('mlAnalyticsTableColumnJobMemoryStatus')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          sourceIndex: $tr
            .findTestSubject('mlAnalyticsTableColumnSourceIndex')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          destinationIndex: $tr
            .findTestSubject('mlAnalyticsTableColumnDestIndex')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          type: $tr
            .findTestSubject('mlAnalyticsTableColumnType')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          status: $tr
            .findTestSubject('mlAnalyticsTableColumnStatus')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          progress: $tr
            .findTestSubject('mlAnalyticsTableColumnProgress')
            .findTestSubject('mlAnalyticsTableProgress')
            .attr('value'),
        };

        if (tableEnvironment === 'stackMgmtJobList') {
          const $spaces = $tr
            .findTestSubject('mlAnalyticsTableColumnSpaces')
            .find('.euiTableCellContent')
            .find('.euiAvatar--space');
          const spaces = [];
          for (const el of $spaces.toArray()) {
            // extract the space id from data-test-subj and add to list
            spaces.push($(el).attr('data-test-subj').replace('space-avatar-', ''));
          }

          rowObject.spaces = spaces;
        }

        rows.push(rowObject);
      }

      return rows;
    }

    public rowSelector(analyticsId: string, subSelector?: string) {
      const row = `~mlAnalyticsTable > ~row-${analyticsId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async waitForRefreshButtonLoaded(buttonTestSubj: string) {
      await testSubjects.existOrFail(`~${buttonTestSubj}`, { timeout: 10 * 1000 });
      await testSubjects.existOrFail(`${buttonTestSubj} loaded`, { timeout: 30 * 1000 });
    }

    public async refreshAnalyticsTable(
      tableEnvironment: 'mlDataFrameAnalytics' | 'stackMgmtJobList' = 'mlDataFrameAnalytics'
    ) {
      const testSubjStr =
        tableEnvironment === 'mlDataFrameAnalytics'
          ? 'mlRefreshPageButton'
          : 'mlAnalyticsRefreshListButton';
      await this.waitForRefreshButtonLoaded(testSubjStr);
      await testSubjects.click(`~${testSubjStr}`);
      await this.waitForRefreshButtonLoaded(testSubjStr);
      await this.waitForAnalyticsToLoad();
    }

    public async waitForAnalyticsToLoad() {
      await testSubjects.existOrFail('~mlAnalyticsTable', { timeout: 60 * 1000 });
      await testSubjects.existOrFail('mlAnalyticsTable loaded', { timeout: 30 * 1000 });
    }

    async getAnalyticsSearchInput(): Promise<WebElementWrapper> {
      const tableListContainer = await testSubjects.find('mlAnalyticsTableContainer');
      return await tableListContainer.findByClassName('euiFieldSearch');
    }

    public async assertJobRowViewButtonExists(analyticsId: string) {
      await testSubjects.existOrFail(this.rowSelector(analyticsId, 'mlAnalyticsJobViewButton'));
    }

    public async assertJobRowMapButtonExists(analyticsId: string) {
      await testSubjects.existOrFail(this.rowSelector(analyticsId, 'mlAnalyticsJobMapButton'));
    }

    public async assertJobRowViewButtonEnabled(analyticsId: string, expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(
        this.rowSelector(analyticsId, 'mlAnalyticsJobViewButton')
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected data frame analytics row "view results" button for job '${analyticsId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async openResultsView(analyticsId: string) {
      await retry.tryForTime(20 * 1000, async () => {
        await this.assertJobRowViewButtonExists(analyticsId);
        await testSubjects.click(this.rowSelector(analyticsId, 'mlAnalyticsJobViewButton'));
        await testSubjects.existOrFail('mlPageDataFrameAnalyticsExploration', {
          timeout: 5 * 1000,
        });
      });
    }

    public async openMapView(analyticsId: string) {
      await retry.tryForTime(20 * 1000, async () => {
        await this.assertJobRowMapButtonExists(analyticsId);
        await testSubjects.click(this.rowSelector(analyticsId, 'mlAnalyticsJobMapButton'));
        await testSubjects.existOrFail('mlPageDataFrameAnalyticsMap', { timeout: 5 * 1000 });
      });
    }

    public async assertAnalyticsSearchInputValue(expectedSearchValue: string) {
      const searchBarInput = await this.getAnalyticsSearchInput();
      const actualSearchValue = await searchBarInput.getAttribute('value');
      expect(actualSearchValue).to.eql(
        expectedSearchValue,
        `Analytics search input value should be '${expectedSearchValue}' (got '${actualSearchValue}')`
      );
    }

    public async filterWithSearchString(filter: string, expectedRowCount: number = 1) {
      await this.waitForAnalyticsToLoad();
      const searchBarInput = await this.getAnalyticsSearchInput();
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);
      await this.assertAnalyticsSearchInputValue(filter);

      const rows = await this.parseAnalyticsTable();
      const filteredRows = rows.filter((row) => row.id === filter);
      expect(filteredRows).to.have.length(
        expectedRowCount,
        `Filtered DFA job table should have ${expectedRowCount} row(s) for filter '${filter}' (got matching items '${filteredRows}')`
      );
    }

    public async assertAnalyticsJobDisplayedInTable(
      analyticsId: string,
      shouldBeDisplayed: boolean,
      refreshButtonTestSubj = 'mlRefreshPageButton'
    ) {
      await this.waitForRefreshButtonLoaded(refreshButtonTestSubj);
      await testSubjects.click(`~${refreshButtonTestSubj}`);
      await this.waitForRefreshButtonLoaded(refreshButtonTestSubj);
      await testSubjects.existOrFail('mlAnalyticsJobList', { timeout: 30 * 1000 });

      if (shouldBeDisplayed) {
        await this.filterWithSearchString(analyticsId, 1);
      } else {
        if (await testSubjects.exists('mlNoDataFrameAnalyticsFound', { timeout: 1000 })) {
          // no jobs at all, no other assertion needed
          return;
        }
        await this.filterWithSearchString(analyticsId, 0);
      }
    }

    public async assertAnalyticsRowFields(analyticsId: string, expectedRow: object) {
      await this.refreshAnalyticsTable();
      const rows = await this.parseAnalyticsTable();
      const analyticsRow = rows.filter((row) => row.id === analyticsId)[0];
      expect(analyticsRow).to.eql(
        expectedRow,
        `Expected analytics row to be '${JSON.stringify(expectedRow)}' (got '${JSON.stringify(
          analyticsRow
        )}')`
      );
    }

    public async assertJobRowActionsMenuButtonEnabled(analyticsId: string, expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(
        this.rowSelector(analyticsId, 'euiCollapsedItemActionsButton')
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected row action menu button for DFA job '${analyticsId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async ensureJobActionsMenuOpen(analyticsId: string) {
      await retry.tryForTime(30 * 1000, async () => {
        if (!(await testSubjects.exists('mlAnalyticsJobDeleteButton'))) {
          await testSubjects.click(this.rowSelector(analyticsId, 'euiCollapsedItemActionsButton'));
          await testSubjects.existOrFail('mlAnalyticsJobDeleteButton', { timeout: 5000 });
        }
      });
    }

    public async ensureJobActionsMenuClosed(analyticsId: string) {
      await retry.tryForTime(30 * 1000, async () => {
        if (await testSubjects.exists('mlAnalyticsJobDeleteButton')) {
          await testSubjects.click(this.rowSelector(analyticsId, 'euiCollapsedItemActionsButton'));
          await testSubjects.missingOrFail('mlAnalyticsJobDeleteButton', { timeout: 5000 });
        }
      });
    }

    public async assertJobActionViewButtonEnabled(analyticsId: string, expectedValue: boolean) {
      await this.ensureJobActionsMenuOpen(analyticsId);
      const actionMenuViewButton = await find.byCssSelector(
        '[data-test-subj="mlAnalyticsJobViewButton"][class="euiContextMenuItem"]'
      );
      const isEnabled = await actionMenuViewButton.isEnabled();
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "view" action menu button for DFA job '${analyticsId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertJobActionStartButtonEnabled(analyticsId: string, expectedValue: boolean) {
      await this.ensureJobActionsMenuOpen(analyticsId);
      const isEnabled = await testSubjects.isEnabled('mlAnalyticsJobStartButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "start" action menu button for DFA job '${analyticsId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertJobActionEditButtonEnabled(analyticsId: string, expectedValue: boolean) {
      await this.ensureJobActionsMenuOpen(analyticsId);
      const isEnabled = await testSubjects.isEnabled('mlAnalyticsJobEditButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "edit" action menu button for DFA job '${analyticsId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertJobActionCloneButtonEnabled(analyticsId: string, expectedValue: boolean) {
      await this.ensureJobActionsMenuOpen(analyticsId);
      const isEnabled = await testSubjects.isEnabled('mlAnalyticsJobCloneButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "clone" action menu button for DFA job '${analyticsId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertJobActionDeleteButtonEnabled(analyticsId: string, expectedValue: boolean) {
      await this.ensureJobActionsMenuOpen(analyticsId);
      const isEnabled = await testSubjects.isEnabled('mlAnalyticsJobDeleteButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "delete" action menu button for DFA job '${analyticsId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async openEditFlyout(analyticsId: string) {
      await this.ensureJobActionsMenuOpen(analyticsId);
      await testSubjects.click('mlAnalyticsJobEditButton');
      await testSubjects.existOrFail('mlAnalyticsEditFlyout', { timeout: 5000 });
    }

    public async cloneJob(analyticsId: string) {
      await this.ensureJobActionsMenuOpen(analyticsId);
      await testSubjects.click(`mlAnalyticsJobCloneButton`);
      await testSubjects.existOrFail('mlAnalyticsCreationContainer');
    }

    public detailsSelector(jobId: string, subSelector?: string) {
      const row = `mlAnalyticsTableRowDetails-${jobId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async assertRowDetailsTabExist(jobId: string, tabId: string) {
      const selector = `~mlAnalyticsTableRowDetailsTab > ~${tabId} > ${jobId}`;
      await testSubjects.existOrFail(selector);
    }

    public async withDetailsOpen<T>(jobId: string, block: () => Promise<T>): Promise<T> {
      await this.ensureDetailsOpen(jobId);
      try {
        return await block();
      } finally {
        await this.ensureDetailsClosed(jobId);
      }
    }

    public async ensureDetailsOpen(jobId: string) {
      await retry.tryForTime(10000, async () => {
        if (!(await testSubjects.exists(this.detailsSelector(jobId)))) {
          await testSubjects.click(this.rowSelector(jobId, 'mlAnalyticsTableRowDetailsToggle'));
          await testSubjects.existOrFail(this.detailsSelector(jobId), { timeout: 1000 });
        }
      });
    }

    public async ensureDetailsClosed(jobId: string) {
      await retry.tryForTime(10000, async () => {
        if (await testSubjects.exists(this.detailsSelector(jobId))) {
          await testSubjects.click(this.rowSelector(jobId, 'mlAnalyticsTableRowDetailsToggle'));
          await testSubjects.missingOrFail(this.detailsSelector(jobId), { timeout: 1000 });
        }
      });
    }

    public async assertRowDetailsTabsExist(tabTypeSubject: string, areaSubjects: string[]) {
      await retry.tryForTime(10000, async () => {
        const allTabs = await testSubjects.findAll(`~${tabTypeSubject}`, 3);
        expect(allTabs).to.have.length(
          areaSubjects.length,
          `Expected number of '${tabTypeSubject}' to be '${areaSubjects.length}' (got '${allTabs.length}')`
        );
        for (const areaSubj of areaSubjects) {
          await testSubjects.existOrFail(`~${tabTypeSubject}&~${areaSubj}`, { timeout: 1000 });
        }
      });
    }

    public async assertRowDetailsTabEnabled(tabSubject: string, expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(tabSubject);
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected Analytics details tab '${tabSubject}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async ensureDetailsTabOpen(jobId: string, tabSubject: string) {
      const tabSelector = `~mlAnalyticsTableRowDetailsTab&~${tabSubject}&~${jobId}`;
      const tabContentSelector = `~mlAnalyticsTableRowDetailsTabContent&~${tabSubject}&~${jobId}`;

      await retry.tryForTime(10000, async () => {
        if (!(await testSubjects.exists(tabContentSelector))) {
          await this.assertRowDetailsTabEnabled(tabSelector, true);
          await testSubjects.click(tabSelector);
          await testSubjects.existOrFail(tabContentSelector, { timeout: 1000 });
        }
      });
    }

    public detailsSectionSelector(jobId: string, sectionSubject: string) {
      const subSelector = `~mlAnalyticsTableRowDetailsSection&~${sectionSubject}`;
      return this.detailsSelector(jobId, subSelector);
    }

    public async assertDetailsSectionExists(jobId: string, sectionSubject: string) {
      const selector = this.detailsSectionSelector(jobId, sectionSubject);
      await retry.tryForTime(10000, async () => {
        await testSubjects.existOrFail(selector, { timeout: 1000 });
      });
    }

    public async parseDetailsSectionTable(el: WebElementWrapper) {
      const $ = await el.parseDomContent();
      const vars: Record<string, string> = {};

      for (const row of $('tr').toArray()) {
        const [name, value] = $(row).find('td').toArray();

        vars[$(name).text().trim()] = $(value).text().trim();
      }

      return vars;
    }

    public async assertRowDetailsSectionContent(
      jobId: string,
      sectionSubject: string,
      expectedEntries: ExpectedSectionTable['expectedEntries']
    ) {
      const sectionSelector = this.detailsSectionSelector(jobId, sectionSubject);
      await this.assertDetailsSectionExists(jobId, sectionSubject);

      const sectionTable = await testSubjects.find(`${sectionSelector}-table`);
      const parsedSectionTableEntries = await this.parseDetailsSectionTable(sectionTable);

      for (const [key, value] of Object.entries(expectedEntries)) {
        expect(parsedSectionTableEntries)
          .to.have.property(key)
          .eql(
            value,
            `Expected ${sectionSubject} property '${key}' to exist with value '${value}'`
          );
      }
    }

    public async assertJobDetailsTabContent(jobId: string, sections: ExpectedSectionTable[]) {
      const tabSubject = 'job-details';
      await this.ensureDetailsTabOpen(jobId, tabSubject);

      for (const { section, expectedEntries } of sections) {
        await this.assertRowDetailsSectionContent(jobId, section, expectedEntries);
      }
    }

    public async assertJobStatsTabContent(jobId: string) {
      const tabSubject = 'job-stats';
      await this.ensureDetailsTabOpen(jobId, tabSubject);
      await this.assertDetailsSectionExists(jobId, 'stats');
      await this.assertDetailsSectionExists(jobId, 'analysisStats');
    }

    public async assertJsonTabContent(jobId: string) {
      const tabSubject = 'json';
      await this.ensureDetailsTabOpen(jobId, tabSubject);
      await testSubjects.existOrFail(this.detailsSelector(jobId, 'mlAnalyticsDetailsJsonPreview'));
    }

    public async assertJobMessagesTabContent(jobId: string) {
      const tabSubject = 'job-messages';
      await this.ensureDetailsTabOpen(jobId, tabSubject);
      await testSubjects.existOrFail(
        this.detailsSelector(jobId, 'mlAnalyticsDetailsJobMessagesTable')
      );
    }

    public async assertAnalyticsRowDetails(
      jobId: string,
      expectedRowDetails: AnalyticsTableRowDetails
    ) {
      return await this.withDetailsOpen(jobId, async () => {
        await this.assertRowDetailsTabsExist('mlAnalyticsTableRowDetailsTab', [
          'job-details',
          'job-stats',
          'json',
          'job-messages',
        ]);
        await this.assertJobDetailsTabContent(jobId, expectedRowDetails.jobDetails);
        await this.assertJobStatsTabContent(jobId);
        await this.assertJsonTabContent(jobId);
        await this.assertJobMessagesTabContent(jobId);
      });
    }
  })();
}
