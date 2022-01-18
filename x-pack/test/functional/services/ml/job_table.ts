/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test';

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';
import { MlCustomUrls } from './custom_urls';

import {
  TimeRangeType,
  TIME_RANGE_TYPE,
  URL_TYPE,
} from '../../../../plugins/ml/public/application/jobs/components/custom_url_editor/constants';

export type MlADJobTable = ProvidedType<typeof MachineLearningJobTableProvider>;

export interface DiscoverUrlConfig {
  label: string;
  indexPattern: string;
  queryEntityFieldNames: string[];
  timeRange: TimeRangeType;
  timeRangeInterval?: string;
}

export interface DashboardUrlConfig {
  label: string;
  dashboardName: string;
  queryEntityFieldNames: string[];
  timeRange: TimeRangeType;
  timeRangeInterval?: string;
}

export interface OtherUrlConfig {
  label: string;
  url: string;
}

export function MachineLearningJobTableProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI,
  customUrls: MlCustomUrls
) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return new (class MlJobTable {
    public async parseJobTable(
      tableEnvironment: 'mlAnomalyDetection' | 'stackMgmtJobList' = 'mlAnomalyDetection'
    ) {
      const table = await testSubjects.find('~mlJobListTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~mlJobListRow').toArray()) {
        const $tr = $(tr);

        const $description = $tr
          .findTestSubject('mlJobListColumnDescription')
          .find('.euiTableCellContent');
        const $jobGroups = $description.findTestSubjects('mlJobGroup');
        const jobGroups = [];
        for (const el of $jobGroups.toArray()) {
          // collect this group in our array
          jobGroups.push($(el).text().trim());

          // remove this element from $description so it doesn't pollute it's text value
          $(el).remove();
        }

        const rowObject: {
          id: string;
          description: string;
          jobGroups: string[];
          recordCount: string;
          memoryStatus: string;
          jobState: string;
          datafeedState: string;
          latestTimestamp?: string;
          spaces?: string[];
        } = {
          id: $tr.findTestSubject('mlJobListColumnId').find('.euiTableCellContent').text().trim(),
          description: $description
            .text()
            .replace(/(&nbsp;$)/g, '')
            .trim(),
          jobGroups,
          recordCount: $tr
            .findTestSubject('mlJobListColumnRecordCount')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          memoryStatus: $tr
            .findTestSubject('mlJobListColumnMemoryStatus')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          jobState: $tr
            .findTestSubject('mlJobListColumnJobState')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          datafeedState: $tr
            .findTestSubject('mlJobListColumnDatafeedState')
            .find('.euiTableCellContent')
            .text()
            .trim(),
        };

        if (tableEnvironment === 'mlAnomalyDetection') {
          const latestTimestamp = $tr
            .findTestSubject('mlJobListColumnLatestTimestamp')
            .find('.euiTableCellContent')
            .text()
            .trim();

          rowObject.latestTimestamp = latestTimestamp;
        }

        if (tableEnvironment === 'stackMgmtJobList') {
          const $spaces = $tr
            .findTestSubject('mlJobListColumnSpaces')
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

    public async parseJobCounts(jobId: string) {
      return await this.withDetailsOpen(jobId, async () => {
        // click counts tab
        await testSubjects.click(this.detailsSelector(jobId, 'mlJobListTab-counts'));

        const countsTable = await testSubjects.find(
          this.detailsSelector(jobId, 'mlJobDetails-counts > mlJobRowDetailsSection-counts')
        );
        const modelSizeStatsTable = await testSubjects.find(
          this.detailsSelector(jobId, 'mlJobDetails-counts > mlJobRowDetailsSection-modelSizeStats')
        );

        // parse a table by reading each row
        async function parseTable(el: typeof countsTable) {
          const $ = await el.parseDomContent();
          const vars: Record<string, string> = {};

          for (const row of $('tr').toArray()) {
            const [name, value] = $(row).find('td').toArray();

            vars[$(name).text().trim()] = $(value).text().trim();
          }

          return vars;
        }

        return {
          counts: await parseTable(countsTable),
          modelSizeStats: await parseTable(modelSizeStatsTable),
        };
      });
    }

    public rowSelector(jobId: string, subSelector?: string) {
      const row = `~mlJobListTable > ~row-${jobId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public detailsSelector(jobId: string, subSelector?: string) {
      const row = `~mlJobListTable > ~details-${jobId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
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
          await testSubjects.click(this.rowSelector(jobId, 'mlJobListRowDetailsToggle'));
          await testSubjects.existOrFail(this.detailsSelector(jobId), { timeout: 1000 });
        }
      });
    }

    public async ensureDetailsClosed(jobId: string) {
      await retry.tryForTime(10000, async () => {
        if (await testSubjects.exists(this.detailsSelector(jobId))) {
          await testSubjects.click(this.rowSelector(jobId, 'mlJobListRowDetailsToggle'));
          await testSubjects.missingOrFail(this.detailsSelector(jobId), { timeout: 1000 });
        }
      });
    }

    public async openAnnotationsTab<T>(jobId: string) {
      await retry.tryForTime(10000, async () => {
        await this.ensureDetailsOpen(jobId);
        await testSubjects.click(this.detailsSelector(jobId, 'mlJobListTab-annotations'));
        await testSubjects.existOrFail('mlAnnotationsTable');
      });
    }

    public async waitForRefreshButtonLoaded(buttonTestSubj: string) {
      await testSubjects.existOrFail(`~${buttonTestSubj}`, { timeout: 10 * 1000 });
      await testSubjects.existOrFail(`${buttonTestSubj} loaded`, { timeout: 30 * 1000 });
    }

    public async refreshJobList(
      tableEnvironment: 'mlAnomalyDetection' | 'stackMgmtJobList' = 'mlAnomalyDetection'
    ) {
      const testSubjStr =
        tableEnvironment === 'mlAnomalyDetection'
          ? 'mlRefreshPageButton'
          : 'mlRefreshJobListButton';

      await this.waitForRefreshButtonLoaded(testSubjStr);
      await testSubjects.click(`~${testSubjStr}`);
      await this.waitForRefreshButtonLoaded(testSubjStr);
      await this.waitForJobsToLoad();
    }

    public async waitForJobsToLoad() {
      await testSubjects.existOrFail('~mlJobListTable', { timeout: 60 * 1000 });
      await testSubjects.existOrFail('mlJobListTable loaded', { timeout: 30 * 1000 });
    }

    public async filterWithSearchString(
      filter: string,
      expectedRowCount: number = 1,
      tableEnvironment: 'mlAnomalyDetection' | 'stackMgmtJobList' = 'mlAnomalyDetection'
    ) {
      await this.waitForJobsToLoad();
      await this.refreshJobList(tableEnvironment);
      const searchBar = await testSubjects.find('mlJobListSearchBar');
      const searchBarInput = await searchBar.findByTagName('input');
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);

      const rows = await this.parseJobTable();
      const filteredRows = rows.filter((row) => row.id === filter);
      expect(filteredRows).to.have.length(
        expectedRowCount,
        `Filtered AD job table should have ${expectedRowCount} row(s) for filter '${filter}' (got matching items '${JSON.stringify(
          filteredRows
        )}')`
      );
    }

    public async assertJobRowFields(jobId: string, expectedRow: object) {
      await retry.tryForTime(5000, async () => {
        await this.refreshJobList();
        const rows = await this.parseJobTable();
        const jobRow = rows.filter((row) => row.id === jobId)[0];
        expect(jobRow).to.eql(
          expectedRow,
          `Expected job row to be '${JSON.stringify(expectedRow)}' (got '${JSON.stringify(
            jobRow
          )}')`
        );
      });
    }

    public async assertJobRowDetailsCounts(
      jobId: string,
      expectedCounts: object,
      expectedModelSizeStats: object
    ) {
      const { counts, modelSizeStats } = await this.parseJobCounts(jobId);

      // Only check for expected keys / values, ignore additional properties
      // This way the tests stay stable when new properties are added on the ES side
      for (const [key, value] of Object.entries(expectedCounts)) {
        expect(counts)
          .to.have.property(key)
          .eql(value, `Expected counts property '${key}' to exist with value '${value}'`);
      }

      for (const [key, value] of Object.entries(expectedModelSizeStats)) {
        expect(modelSizeStats)
          .to.have.property(key)
          .eql(
            value,
            `Expected model size stats property '${key}' to exist with value '${value}')`
          );
      }
    }

    public async assertJobActionSingleMetricViewerButtonEnabled(
      jobId: string,
      expectedValue: boolean
    ) {
      const isEnabled = await testSubjects.isEnabled(
        this.rowSelector(jobId, 'mlOpenJobsInSingleMetricViewerButton')
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "open in single metric viewer" job action button for AD job '${jobId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertJobActionAnomalyExplorerButtonEnabled(
      jobId: string,
      expectedValue: boolean
    ) {
      const isEnabled = await testSubjects.isEnabled(
        this.rowSelector(jobId, 'mlOpenJobsInAnomalyExplorerButton')
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "open in anomaly explorer" job action button for AD job '${jobId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertJobActionsMenuButtonEnabled(jobId: string, expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(
        this.rowSelector(jobId, 'euiCollapsedItemActionsButton')
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected actions menu button for AD job '${jobId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertJobActionStartDatafeedButtonEnabled(jobId: string, expectedValue: boolean) {
      await this.ensureJobActionsMenuOpen(jobId);
      const isEnabled = await testSubjects.isEnabled('mlActionButtonStartDatafeed');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "start datafeed" action button for AD job '${jobId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertJobActionCloneJobButtonEnabled(jobId: string, expectedValue: boolean) {
      await this.ensureJobActionsMenuOpen(jobId);
      const isEnabled = await testSubjects.isEnabled('mlActionButtonCloneJob');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "clone job" action button for AD job '${jobId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertJobActionEditJobButtonEnabled(jobId: string, expectedValue: boolean) {
      await this.ensureJobActionsMenuOpen(jobId);
      const isEnabled = await testSubjects.isEnabled('mlActionButtonEditJob');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "edit job" action button for AD job '${jobId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertJobActionDeleteJobButtonEnabled(jobId: string, expectedValue: boolean) {
      await this.ensureJobActionsMenuOpen(jobId);
      const isEnabled = await testSubjects.isEnabled('mlActionButtonDeleteJob');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "delete job" action button for AD job '${jobId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async ensureJobActionsMenuOpen(jobId: string) {
      await retry.tryForTime(30 * 1000, async () => {
        if (!(await testSubjects.exists('mlActionButtonDeleteJob'))) {
          await testSubjects.click(this.rowSelector(jobId, 'euiCollapsedItemActionsButton'));
          await testSubjects.existOrFail('mlActionButtonDeleteJob', { timeout: 5000 });
        }
      });
    }

    public async clickCloneJobAction(jobId: string) {
      await this.ensureJobActionsMenuOpen(jobId);
      await testSubjects.click('mlActionButtonCloneJob');
      await testSubjects.existOrFail('~mlPageJobWizard');
    }

    public async clickCloneJobActionWhenNoDataViewExists(jobId: string) {
      await this.ensureJobActionsMenuOpen(jobId);
      await testSubjects.click('mlActionButtonCloneJob');
      await this.assertNoDataViewForCloneJobWarningToastExist();
    }

    public async assertNoDataViewForCloneJobWarningToastExist() {
      await testSubjects.existOrFail('mlCloneJobNoDataViewExistsWarningToast', { timeout: 5000 });
    }

    public async clickEditJobAction(jobId: string) {
      await this.ensureJobActionsMenuOpen(jobId);
      await testSubjects.click('mlActionButtonEditJob');
      await testSubjects.existOrFail('mlJobEditFlyout');
    }

    public async clickDeleteJobAction(jobId: string) {
      await this.ensureJobActionsMenuOpen(jobId);
      await testSubjects.click('mlActionButtonDeleteJob');
      await testSubjects.existOrFail('mlDeleteJobConfirmModal');
    }

    public async confirmDeleteJobModal() {
      await testSubjects.click('mlDeleteJobConfirmModal > mlDeleteJobConfirmModalButton');
      await testSubjects.missingOrFail('mlDeleteJobConfirmModal', { timeout: 30 * 1000 });
    }

    public async clickOpenJobInSingleMetricViewerButton(jobId: string) {
      await testSubjects.click(this.rowSelector(jobId, 'mlOpenJobsInSingleMetricViewerButton'));
      await testSubjects.existOrFail('~mlPageSingleMetricViewer');
    }

    public async clickOpenJobInAnomalyExplorerButton(jobId: string) {
      await testSubjects.click(this.rowSelector(jobId, 'mlOpenJobsInAnomalyExplorerButton'));
      await testSubjects.existOrFail('~mlPageAnomalyExplorer');
    }

    public async isJobRowSelected(jobId: string): Promise<boolean> {
      return await testSubjects.isChecked(this.rowSelector(jobId, `checkboxSelectRow-${jobId}`));
    }

    public async assertJobRowSelected(jobId: string, expectedValue: boolean) {
      const isSelected = await this.isJobRowSelected(jobId);
      expect(isSelected).to.eql(
        expectedValue,
        `Expected job row for AD job '${jobId}' to be '${
          expectedValue ? 'selected' : 'deselected'
        }' (got '${isSelected ? 'selected' : 'deselected'}')`
      );
    }

    public async selectJobRow(jobId: string) {
      if ((await this.isJobRowSelected(jobId)) === false) {
        await testSubjects.click(this.rowSelector(jobId, `checkboxSelectRow-${jobId}`));
      }

      await this.assertJobRowSelected(jobId, true);
      await this.assertMultiSelectActionsAreaActive();
    }

    public async deselectJobRow(jobId: string) {
      if ((await this.isJobRowSelected(jobId)) === true) {
        await testSubjects.click(this.rowSelector(jobId, `checkboxSelectRow-${jobId}`));
      }

      await this.assertJobRowSelected(jobId, false);
      await this.assertMultiSelectActionsAreaInactive();
    }

    public async assertMultiSelectActionsAreaActive() {
      await testSubjects.existOrFail('mlADJobListMultiSelectActionsArea active');
    }

    public async assertMultiSelectActionsAreaInactive() {
      await testSubjects.existOrFail('mlADJobListMultiSelectActionsArea inactive', {
        allowHidden: true,
      });
    }

    public async assertMultiSelectActionSingleMetricViewerButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(
        '~mlADJobListMultiSelectActionsArea > mlOpenJobsInSingleMetricViewerButton'
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected AD jobs multi select "open in single metric viewer" action button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertMultiSelectActionAnomalyExplorerButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(
        '~mlADJobListMultiSelectActionsArea > mlOpenJobsInAnomalyExplorerButton'
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected AD jobs multi select "open in anomaly explorer" action button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertMultiSelectActionEditJobGroupsButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(
        '~mlADJobListMultiSelectActionsArea > mlADJobListMultiSelectEditJobGroupsButton'
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected AD jobs multi select "edit job groups" action button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertMultiSelectManagementActionsButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(
        '~mlADJobListMultiSelectActionsArea > mlADJobListMultiSelectManagementActionsButton'
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected AD jobs multi select "management actions" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertMultiSelectStartDatafeedActionButtonEnabled(expectedValue: boolean) {
      await this.ensureMultiSelectManagementActionsMenuOpen();
      const isEnabled = await testSubjects.isEnabled(
        'mlADJobListMultiSelectStartDatafeedActionButton'
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected AD jobs multi select "management actions" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertMultiSelectDeleteJobActionButtonEnabled(expectedValue: boolean) {
      await this.ensureMultiSelectManagementActionsMenuOpen();
      const isEnabled = await testSubjects.isEnabled('mlADJobListMultiSelectDeleteJobActionButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected AD jobs multi select "management actions" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async ensureMultiSelectManagementActionsMenuOpen() {
      await retry.tryForTime(30 * 1000, async () => {
        if (!(await testSubjects.exists('mlADJobListMultiSelectDeleteJobActionButton'))) {
          await testSubjects.click('mlADJobListMultiSelectManagementActionsButton');
          await testSubjects.existOrFail('mlADJobListMultiSelectDeleteJobActionButton', {
            timeout: 5000,
          });
        }
      });
    }

    public async openEditCustomUrlsForJobTab(jobId: string) {
      await this.clickEditJobAction(jobId);
      // click Custom URLs tab
      await testSubjects.click('mlEditJobFlyout-customUrls');
      await this.ensureEditCustomUrlTabOpen();
    }

    public async ensureEditCustomUrlTabOpen() {
      await testSubjects.existOrFail('mlJobOpenCustomUrlFormButton', { timeout: 5000 });
    }

    public async closeEditJobFlyout() {
      if (await testSubjects.exists('mlEditJobFlyoutCloseButton')) {
        await testSubjects.click('mlEditJobFlyoutCloseButton');
        await testSubjects.missingOrFail('mlJobEditFlyout');
      }
    }

    public async saveEditJobFlyoutChanges() {
      await testSubjects.click('mlEditJobFlyoutSaveButton');
      await testSubjects.missingOrFail('mlJobEditFlyout', { timeout: 5000 });
    }

    public async clickOpenCustomUrlEditor() {
      await this.ensureEditCustomUrlTabOpen();
      await testSubjects.click('mlJobOpenCustomUrlFormButton');
      await testSubjects.existOrFail('mlJobCustomUrlForm');
    }

    public async getExistingCustomUrlCount(): Promise<number> {
      const existingCustomUrls = await testSubjects.findAll('mlJobEditCustomUrlItemLabel');
      return existingCustomUrls.length;
    }

    public async saveCustomUrl(expectedLabel: string, expectedIndex: number) {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click('mlJobAddCustomUrl');
        await customUrls.assertCustomUrlLabel(expectedIndex, expectedLabel);
      });
    }

    public async fillInDiscoverUrlForm(customUrl: DiscoverUrlConfig) {
      await this.clickOpenCustomUrlEditor();
      await customUrls.setCustomUrlLabel(customUrl.label);
      await mlCommonUI.selectRadioGroupValue(
        `mlJobCustomUrlLinkToTypeInput`,
        URL_TYPE.KIBANA_DISCOVER
      );
      await mlCommonUI.selectSelectValueByVisibleText(
        'mlJobCustomUrlDiscoverIndexPatternInput',
        customUrl.indexPattern
      );
      await customUrls.setCustomUrlQueryEntityFieldNames(customUrl.queryEntityFieldNames);
      await mlCommonUI.selectSelectValueByVisibleText(
        'mlJobCustomUrlTimeRangeInput',
        customUrl.timeRange
      );
      if (customUrl.timeRange === TIME_RANGE_TYPE.INTERVAL) {
        await customUrls.setCustomUrlTimeRangeInterval(customUrl.timeRangeInterval!);
      }
    }

    public async fillInDashboardUrlForm(customUrl: DashboardUrlConfig) {
      await this.clickOpenCustomUrlEditor();
      await customUrls.setCustomUrlLabel(customUrl.label);
      await mlCommonUI.selectRadioGroupValue(
        `mlJobCustomUrlLinkToTypeInput`,
        URL_TYPE.KIBANA_DASHBOARD
      );
      await mlCommonUI.selectSelectValueByVisibleText(
        'mlJobCustomUrlDashboardNameInput',
        customUrl.dashboardName
      );
      await customUrls.setCustomUrlQueryEntityFieldNames(customUrl.queryEntityFieldNames);
      await mlCommonUI.selectSelectValueByVisibleText(
        'mlJobCustomUrlTimeRangeInput',
        customUrl.timeRange
      );
      if (customUrl.timeRange === TIME_RANGE_TYPE.INTERVAL) {
        await customUrls.setCustomUrlTimeRangeInterval(customUrl.timeRangeInterval!);
      }
    }

    public async fillInOtherUrlForm(customUrl: OtherUrlConfig) {
      await this.clickOpenCustomUrlEditor();
      await customUrls.setCustomUrlLabel(customUrl.label);
      await mlCommonUI.selectRadioGroupValue(`mlJobCustomUrlLinkToTypeInput`, URL_TYPE.OTHER);
      await customUrls.setCustomUrlOtherTypeUrl(customUrl.url);
    }

    public async addDiscoverCustomUrl(jobId: string, customUrl: DiscoverUrlConfig) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.closeEditJobFlyout();
        await this.openEditCustomUrlsForJobTab(jobId);
        const existingCustomUrlCount = await this.getExistingCustomUrlCount();

        await this.fillInDiscoverUrlForm(customUrl);
        await this.saveCustomUrl(customUrl.label, existingCustomUrlCount);
      });

      // Save the job
      await this.saveEditJobFlyoutChanges();
    }

    public async addDashboardCustomUrl(jobId: string, customUrl: DashboardUrlConfig) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.closeEditJobFlyout();
        await this.openEditCustomUrlsForJobTab(jobId);
        const existingCustomUrlCount = await this.getExistingCustomUrlCount();

        await this.fillInDashboardUrlForm(customUrl);
        await this.saveCustomUrl(customUrl.label, existingCustomUrlCount);
      });

      // Save the job
      await this.saveEditJobFlyoutChanges();
    }

    public async addOtherTypeCustomUrl(jobId: string, customUrl: OtherUrlConfig) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.closeEditJobFlyout();
        await this.openEditCustomUrlsForJobTab(jobId);
        const existingCustomUrlCount = await this.getExistingCustomUrlCount();

        await this.fillInOtherUrlForm(customUrl);
        await this.saveCustomUrl(customUrl.label, existingCustomUrlCount);
      });

      // Save the job
      await this.saveEditJobFlyoutChanges();
    }

    public async editCustomUrl(
      jobId: string,
      indexInList: number,
      customUrl: { label: string; url: string }
    ) {
      await this.openEditCustomUrlsForJobTab(jobId);
      await customUrls.editCustomUrlLabel(indexInList, customUrl.label);
      await customUrls.editCustomUrlUrlValue(indexInList, customUrl.url);

      // Save the edit
      await this.saveEditJobFlyoutChanges();
    }

    public async deleteCustomUrl(jobId: string, indexInList: number) {
      await this.openEditCustomUrlsForJobTab(jobId);
      const beforeCustomUrls = await testSubjects.findAll('mlJobEditCustomUrlItemLabel');
      await customUrls.deleteCustomUrl(indexInList);

      // Save the edit and check the custom URL has been deleted.
      await testSubjects.click('mlEditJobFlyoutSaveButton');
      await this.openEditCustomUrlsForJobTab(jobId);
      await customUrls.assertCustomUrlsLength(beforeCustomUrls.length - 1);
      await this.closeEditJobFlyout();
    }

    public async openTestCustomUrl(jobId: string, indexInList: number) {
      await this.openEditCustomUrlsForJobTab(jobId);
      await customUrls.clickTestCustomUrl(indexInList);
    }

    public async testDiscoverCustomUrlAction(expectedHitCountFormatted: string) {
      await customUrls.assertDiscoverCustomUrlAction(expectedHitCountFormatted);
    }

    public async testDashboardCustomUrlAction(expectedPanelCount: number) {
      await customUrls.assertDashboardCustomUrlAction(expectedPanelCount);
    }

    public async testOtherTypeCustomUrlAction(
      jobId: string,
      indexInList: number,
      expectedUrl: string
    ) {
      // Can't test the contents of the external page, so just check the expected URL.
      await this.openEditCustomUrlsForJobTab(jobId);
      await customUrls.assertCustomUrlUrlValue(indexInList, expectedUrl);
      await this.closeEditJobFlyout();
    }
  })();
}
