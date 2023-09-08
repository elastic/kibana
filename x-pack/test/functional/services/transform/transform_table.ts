/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

type TransformRowActionName =
  | 'Clone'
  | 'Delete'
  | 'Discover'
  | 'Edit'
  | 'Reset'
  | 'Start'
  | 'Stop'
  | 'Reauthorize';

export function TransformTableProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const ml = getService('ml');

  return new (class TransformTable {
    public async parseTransformTable() {
      const table = await testSubjects.find('~transformListTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~transformListRow').toArray()) {
        const $tr = $(tr);

        rows.push({
          id: $tr
            .findTestSubject('transformListColumnId')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          description: $tr
            .findTestSubject('transformListColumnDescription')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          type: $tr
            .findTestSubject('transformListColumnType')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          status: $tr
            .findTestSubject('transformListColumnStatus')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          mode: $tr
            .findTestSubject('transformListColumnMode')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          progress: $tr
            .findTestSubject('transformListColumnProgress')
            .findTestSubject('transformListProgress')
            .attr('value'),
          health: $tr
            .findTestSubject('transformListColumnHealth')
            .findTestSubject('transformListHealth')
            .text()
            .trim(),
        });
      }

      return rows;
    }

    public async waitForRefreshButtonLoaded() {
      await testSubjects.existOrFail('~transformRefreshTransformListButton', {
        timeout: 10 * 1000,
      });
      await testSubjects.existOrFail('transformRefreshTransformListButton loaded', {
        timeout: 30 * 1000,
      });
    }

    public async refreshTransformList() {
      await this.waitForRefreshButtonLoaded();
      await testSubjects.click('~transformRefreshTransformListButton');
      await this.waitForRefreshButtonLoaded();
      await this.waitForTransformsToLoad();
    }

    public async waitForTransformsToLoad() {
      await testSubjects.existOrFail('~transformListTable', { timeout: 60 * 1000 });
      await testSubjects.existOrFail('transformListTable loaded', { timeout: 30 * 1000 });
    }

    public async filterWithSearchString(filter: string, expectedRowCount: number = 1) {
      await this.waitForTransformsToLoad();
      const tableListContainer = await testSubjects.find('transformListTableContainer');
      const searchBarInput = await tableListContainer.findByClassName('euiFieldSearch');
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);

      const rows = await this.parseTransformTable();
      const filteredRows = rows.filter((row) => row.id === filter);
      expect(filteredRows).to.have.length(
        expectedRowCount,
        `Filtered Transform table should have ${expectedRowCount} row(s) for filter '${filter}' (got matching items '${filteredRows}')`
      );
    }

    public async clearSearchString(expectedRowCount: number = 1) {
      await this.waitForTransformsToLoad();
      const tableListContainer = await testSubjects.find('transformListTableContainer');
      const searchBarInput = await tableListContainer.findByClassName('euiFieldSearch');
      await searchBarInput.clearValueWithKeyboard();
      const rows = await this.parseTransformTable();
      expect(rows).to.have.length(
        expectedRowCount,
        `Transform table should have ${expectedRowCount} row(s) after clearing search' (got '${rows.length}')`
      );
    }

    public async assertTransformRowFields(transformId: string, expectedRow: object) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.refreshTransformList();
        const rows = await this.parseTransformTable();
        const transformRow = rows.filter((row) => row.id === transformId)[0];

        for (const [key, value] of Object.entries(expectedRow)) {
          expect(transformRow)
            .to.have.property(key)
            .eql(
              value,
              `Expected transform row ${transformId} to have '${key}' with value '${value}' (got ${JSON.stringify(
                transformRow
              )})`
            );
        }
      });
    }

    public async assertTransformRowProgressGreaterThan(
      transformId: string,
      expectedProgress: number
    ) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.refreshTransformList();
        const rows = await this.parseTransformTable();
        const transformRow = rows.filter((row) => row.id === transformId)[0];
        expect(transformRow.progress).to.greaterThan(
          0,
          `Expected transform row progress to be greater than '${expectedProgress}' (got '${transformRow.progress}')`
        );
      });
    }

    public async assertTransformRowHealth(transformId: string, health: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.refreshTransformList();
        const rows = await this.parseTransformTable();
        const transformRow = rows.filter((row) => row.id === transformId)[0];
        expect(transformRow.health).to.eql(
          health,
          `Expected transform row status to not be '${health}' (got '${transformRow.health}')`
        );
      });
    }

    public async assertTransformRowStatusNotEql(transformId: string, status: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.refreshTransformList();
        const rows = await this.parseTransformTable();
        const transformRow = rows.filter((row) => row.id === transformId)[0];
        expect(transformRow.status).to.not.eql(
          status,
          `Expected transform row status to not be '${status}' (got '${transformRow.status}')`
        );
      });
    }

    public async ensureDetailsOpen() {
      await retry.tryForTime(30 * 1000, async () => {
        if (!(await testSubjects.exists('transformExpandedRowTabbedContent'))) {
          await testSubjects.click('transformListRowDetailsToggle');
          await testSubjects.existOrFail('transformExpandedRowTabbedContent', { timeout: 1000 });
        }
      });
    }

    public async ensureDetailsClosed() {
      await retry.tryForTime(30 * 1000, async () => {
        if (await testSubjects.exists('transformExpandedRowTabbedContent')) {
          await testSubjects.click('transformListRowDetailsToggle');
          await testSubjects.missingOrFail('transformExpandedRowTabbedContent', { timeout: 1000 });
        }
      });
    }

    public async switchToExpandedRowTab(tabSubject: string, contentSubject: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.click(tabSubject);
        await testSubjects.existOrFail(contentSubject, { timeout: 1000 });
      });
    }

    public async assertTransformExpandedRow() {
      await this.ensureDetailsOpen();
      await retry.tryForTime(30 * 1000, async () => {
        // The expanded row should show the details tab content by default
        await testSubjects.existOrFail('transformDetailsTab', { timeout: 1000 });
        await testSubjects.existOrFail('~transformDetailsTabContent', { timeout: 1000 });
      });

      // Walk through the rest of the tabs and check if the corresponding content shows up
      await this.switchToExpandedRowTab('transformJsonTab', '~transformJsonTabContent');
      await this.switchToExpandedRowTab('transformHealthTab', '~transformHealthTabContent');
      await this.switchToExpandedRowTab('transformMessagesTab', '~transformMessagesTabContent');
      await this.switchToExpandedRowTab('transformPreviewTab', '~transformPivotPreview');
    }
    public async assertTransformExpandedRowJson(expectedText: string, expectedToContain = true) {
      await this.ensureDetailsOpen();

      // The expanded row should show the details tab content by default
      await testSubjects.existOrFail('transformDetailsTab');
      await testSubjects.existOrFail('~transformDetailsTabContent');

      // Click on the JSON tab and assert the messages
      await this.switchToExpandedRowTab('transformJsonTab', '~transformJsonTabContent');
      await retry.tryForTime(30 * 1000, async () => {
        const actualText = await testSubjects.getVisibleText('~transformJsonTabContent');
        if (expectedToContain) {
          expect(actualText.toLowerCase()).to.contain(
            expectedText.toLowerCase(),
            `Expected transform messages text to include '${expectedText}'`
          );
        } else {
          expect(actualText.toLowerCase()).to.not.contain(
            expectedText.toLowerCase(),
            `Expected transform messages text to not include '${expectedText}'`
          );
        }
      });

      // Switch back to details tab
      await this.switchToExpandedRowTab('transformDetailsTab', '~transformDetailsTabContent');
    }

    public async assertTransformExpandedRowMessages(expectedText: string) {
      await this.ensureDetailsOpen();

      // The expanded row should show the details tab content by default
      await testSubjects.existOrFail('transformDetailsTab');
      await testSubjects.existOrFail('~transformDetailsTabContent');

      // Click on the messages tab and assert the messages
      await this.switchToExpandedRowTab('transformMessagesTab', '~transformMessagesTabContent');
      await retry.tryForTime(30 * 1000, async () => {
        const actualText = await testSubjects.getVisibleText('~transformMessagesTabContent');
        expect(actualText.toLowerCase()).to.contain(
          expectedText.toLowerCase(),
          `Expected transform messages text to include '${expectedText}'`
        );
      });

      // Switch back to details tab
      await this.switchToExpandedRowTab('transformDetailsTab', '~transformDetailsTabContent');
    }

    public async assertTransformExpandedRowHealth(
      expectedText: string,
      expectIssueTableToExist: boolean
    ) {
      await this.ensureDetailsOpen();

      // The expanded row should show the details tab content by default
      await testSubjects.existOrFail('transformDetailsTab');
      await testSubjects.existOrFail('~transformDetailsTabContent');

      // Click on the messages tab and assert the messages
      await this.switchToExpandedRowTab('transformHealthTab', '~transformHealthTabContent');
      await retry.tryForTime(30 * 1000, async () => {
        const actualText = await testSubjects.getVisibleText('~transformHealthTabContent');
        expect(actualText.toLowerCase()).to.contain(
          expectedText.toLowerCase(),
          `Expected transform messages text to include '${expectedText}'`
        );
      });

      if (expectIssueTableToExist) {
        await testSubjects.existOrFail('transformHealthTabContentIssueTable');
      } else {
        await testSubjects.missingOrFail('transformHealthTabContentIssueTable');
      }

      // Switch back to details tab
      await this.switchToExpandedRowTab('transformDetailsTab', '~transformDetailsTabContent');
    }

    public async getTransformExpandedRowStats(
      transformId: string
    ): Promise<Record<string, number | string>> {
      await this.filterWithSearchString(transformId, 1);
      await this.ensureDetailsOpen();
      let stats: Record<string, number | string> = {};

      await retry.tryForTime(30 * 1000, async () => {
        // The expanded row should show the details tab content by default
        await testSubjects.existOrFail('transformDetailsTab');
        await testSubjects.existOrFail('~transformDetailsTabContent');

        // Reset stats in case of retries
        stats = {};
        // Click on the messages tab and assert the messages
        await this.switchToExpandedRowTab('transformStatsTab', '~transformStatsTabContent');
        const actualText = await testSubjects.getVisibleText('~transformStatsTabContent');
        const parsedText = actualText.split('\n').slice(1);
        if (Array.isArray(parsedText) && parsedText.length % 2 === 0) {
          parsedText.forEach((key, idx) => {
            if (idx % 2 === 0) {
              const val = parsedText[idx + 1];
              stats[key] =
                typeof val === 'string' && !isNaN(Number(val)) && !isNaN(parseFloat(val))
                  ? parseFloat(val)
                  : val;
            }
          });
        }
        // Switch back to details tab
        await this.switchToExpandedRowTab('transformDetailsTab', '~transformDetailsTabContent');
      });
      return stats;
    }

    public async assertTransformExpandedRowStats(transformId: string, expectedStats: object) {
      const stats = await this.getTransformExpandedRowStats(transformId);

      await retry.tryForTime(60 * 1000, async () => {
        for (const [key, value] of Object.entries(expectedStats)) {
          expect(stats)
            .to.have.property(key)
            .eql(
              value,
              `Expected transform row stats to have '${key}' with value '${value}' (got ${JSON.stringify(
                stats
              )})`
            );
        }
      });
    }

    public async assertTransformExpandedRowStatsNotEql(transformId: string, expectedStats: object) {
      const stats = await this.getTransformExpandedRowStats(transformId);

      await retry.tryForTime(60 * 1000, async () => {
        for (const [key, val] of Object.entries(expectedStats)) {
          expect(stats[key]).not.eql(
            val,
            `Expected transform row stats to have '${key}' with value not equal to ${val}' (got ${JSON.stringify(
              stats
            )})`
          );
        }
      });
    }

    public rowSelector(transformId: string, subSelector?: string) {
      const row = `~transformListTable > ~row-${transformId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async ensureTransformActionsMenuOpen(transformId: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.ensureTransformActionsMenuClosed();

        if (!(await find.existsByCssSelector('.euiContextMenuPanel', 1000))) {
          await testSubjects.click(this.rowSelector(transformId, 'euiCollapsedItemActionsButton'));
          expect(await find.existsByCssSelector('.euiContextMenuPanel', 1000)).to.eql(
            true,
            'Actions popover should exist'
          );
        }
      });
    }

    public async ensureTransformActionsMenuClosed() {
      await retry.tryForTime(30 * 1000, async () => {
        await browser.pressKeys(browser.keys.ESCAPE);
        expect(await find.existsByCssSelector('.euiContextMenuPanel', 1000)).to.eql(
          false,
          'Actions popover should not exist'
        );
      });
    }

    public async assertTransformRowActionsButtonEnabled(
      transformId: string,
      expectedValue: boolean
    ) {
      const isEnabled = await testSubjects.isEnabled(
        this.rowSelector(transformId, 'euiCollapsedItemActionsButton')
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected transform row actions button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertTransformRowActions(transformId: string, isTransformRunning = false) {
      await this.ensureTransformActionsMenuOpen(transformId);

      await testSubjects.existOrFail('transformActionClone');
      await testSubjects.existOrFail('transformActionDelete');
      await testSubjects.existOrFail('transformActionDiscover');
      await testSubjects.existOrFail('transformActionEdit');
      await testSubjects.existOrFail('transformActionReset');

      if (isTransformRunning) {
        await testSubjects.missingOrFail('transformActionStart');
        await testSubjects.existOrFail('transformActionStop');
      } else {
        await testSubjects.existOrFail('transformActionStart');
        await testSubjects.missingOrFail('transformActionStop');
      }

      await this.ensureTransformActionsMenuClosed();
    }

    public async resetTransform(transformId: string) {
      await this.assertTransformRowFields(transformId, { status: 'stopped' });
      // Assert that transform previously started and has processed documents
      await this.assertTransformExpandedRowStatsNotEql(transformId, {
        documents_indexed: 0,
        documents_processed: 0,
        exponential_avg_checkpoint_duration_ms: 0,
      });
      await retry.tryForTime(180 * 1000, async () => {
        await this.clickTransformRowAction(transformId, 'Reset');
        await this.confirmResetTransform();
        await this.assertTransformRowFields(transformId, { status: 'stopped' });
        // Assert that transform is reseted correctly and has 0 documents
        await this.assertTransformExpandedRowStats(transformId, {
          documents_indexed: 0,
          documents_processed: 0,
          exponential_avg_checkpoint_duration_ms: 0,
        });
      });
    }

    public async stopTransform(transformId: string) {
      await this.assertTransformRowFields(transformId, { status: 'started' });
      await this.assertTransformRowActionEnabled(transformId, 'Stop', true);
      await retry.tryForTime(60 * 1000, async () => {
        await this.clickTransformRowAction(transformId, 'Stop');
        await this.assertTransformRowFields(transformId, { status: 'stopped' });
      });
    }

    public async startTransform(transformId: string) {
      await this.assertTransformRowFields(transformId, { status: 'stopped' });
      await this.assertTransformRowActionEnabled(transformId, 'Start', true);

      await retry.tryForTime(60 * 1000, async () => {
        await this.clickTransformRowAction(transformId, 'Start');
        await this.confirmStartTransform();
        await this.assertTransformRowFields(transformId, { status: 'started' });
      });
    }

    public async assertTransformRowActionMissing(
      transformId: string,
      action: TransformRowActionName
    ) {
      const selector = `transformAction${action}`;
      await retry.tryForTime(60 * 1000, async () => {
        await this.refreshTransformList();

        await this.ensureTransformActionsMenuOpen(transformId);

        await testSubjects.missingOrFail(selector, { timeout: 1000 });
        await this.ensureTransformActionsMenuClosed();
      });
    }

    public async assertTransformRowActionEnabled(
      transformId: string,
      action: TransformRowActionName,
      expectedValue: boolean
    ) {
      const selector = `transformAction${action}`;
      await retry.tryForTime(60 * 1000, async () => {
        await this.refreshTransformList();

        await this.ensureTransformActionsMenuOpen(transformId);

        await testSubjects.existOrFail(selector, { timeout: 1000 });
        const isEnabled = await testSubjects.isEnabled(selector);
        expect(isEnabled).to.eql(
          expectedValue,
          `Expected '${action}' button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
            isEnabled ? 'enabled' : 'disabled'
          }')`
        );

        await this.ensureTransformActionsMenuClosed();
      });
    }

    public async clickTransformRowAction(transformId: string, action: TransformRowActionName) {
      await this.ensureTransformActionsMenuOpen(transformId);
      await testSubjects.click(`transformAction${action}`);
      await testSubjects.missingOrFail(`transformAction${action}`);
    }

    public async waitForTransformsExpandedRowPreviewTabToLoad() {
      await testSubjects.existOrFail('~transformPivotPreview', { timeout: 60 * 1000 });
      await testSubjects.existOrFail('transformPivotPreview loaded', { timeout: 30 * 1000 });
    }

    public async assertTransformsExpandedRowPreviewColumnValues(column: number, values: string[]) {
      await this.waitForTransformsExpandedRowPreviewTabToLoad();
      await ml.commonDataGrid.assertEuiDataGridColumnValues(
        'transformPivotPreview',
        column,
        values
      );
    }

    public async assertTransformDeleteModalExists() {
      await testSubjects.existOrFail('transformDeleteModal', { timeout: 60 * 1000 });
    }

    public async assertTransformDeleteModalNotExists() {
      await testSubjects.missingOrFail('transformDeleteModal', { timeout: 60 * 1000 });
    }

    public async assertTransformReauthorizeModalExists() {
      await testSubjects.existOrFail('transformReauthorizeModal', { timeout: 60 * 1000 });
    }

    public async assertTransformReauthorizeModalNotExists() {
      await testSubjects.missingOrFail('transformReauthorizeModal', { timeout: 60 * 1000 });
    }

    public async assertTransformResetModalExists() {
      await testSubjects.existOrFail('transformResetModal', { timeout: 60 * 1000 });
    }

    public async assertTransformResetModalNotExists() {
      await testSubjects.missingOrFail('transformResetModal', { timeout: 60 * 1000 });
    }

    public async assertTransformStartModalExists() {
      await testSubjects.existOrFail('transformStartModal', { timeout: 60 * 1000 });
    }

    public async assertTransformStartModalNotExists() {
      await testSubjects.missingOrFail('transformStartModal', { timeout: 60 * 1000 });
    }

    public async confirmDeleteTransform() {
      await retry.tryForTime(30 * 1000, async () => {
        await this.assertTransformDeleteModalExists();
        await testSubjects.click('transformDeleteModal > confirmModalConfirmButton');
        await this.assertTransformDeleteModalNotExists();
      });
    }

    public async confirmResetTransform() {
      await retry.tryForTime(30 * 1000, async () => {
        await this.assertTransformResetModalExists();
        await testSubjects.click('transformResetModal > confirmModalConfirmButton');
        await this.assertTransformResetModalNotExists();
      });
    }

    public async assertTransformRowNotExists(transformId: string) {
      await retry.tryForTime(30 * 1000, async () => {
        // If after deletion, and there's no transform left
        const noTransformsFoundMessageExists = await testSubjects.exists(
          'transformNoTransformsFound'
        );

        if (noTransformsFoundMessageExists) {
          return true;
        } else {
          // Checks that the tranform was deleted
          await this.filterWithSearchString(transformId, 0);
        }
      });
    }

    public async confirmReauthorizeTransform() {
      await retry.tryForTime(30 * 1000, async () => {
        await this.assertTransformReauthorizeModalExists();
        await testSubjects.click('transformReauthorizeModal > confirmModalConfirmButton');
        await this.assertTransformReauthorizeModalNotExists();
      });
    }

    public async confirmStartTransform() {
      await retry.tryForTime(30 * 1000, async () => {
        await this.assertTransformStartModalExists();
        await testSubjects.click('transformStartModal > confirmModalConfirmButton');
        await this.assertTransformStartModalNotExists();
      });
    }
  })();
}
