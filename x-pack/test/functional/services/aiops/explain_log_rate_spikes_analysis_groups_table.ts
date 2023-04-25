/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function ExplainLogRateSpikesAnalysisGroupsTableProvider({
  getService,
}: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const browser = getService('browser');

  return new (class AnalysisTable {
    public async assertSpikeAnalysisTableExists() {
      await testSubjects.existOrFail(`aiopsSpikeAnalysisGroupsTable`);
    }

    public async assertExpandRowButtonExists() {
      await testSubjects.existOrFail('aiopsSpikeAnalysisGroupsTableRowExpansionButton');
    }

    public async expandRow() {
      await testSubjects.click('aiopsSpikeAnalysisGroupsTableRowExpansionButton');
      await testSubjects.existOrFail('aiopsSpikeAnalysisTable');
    }

    public async parseAnalysisTable() {
      const table = await testSubjects.find('~aiopsSpikeAnalysisGroupsTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~aiopsSpikeAnalysisGroupsTableRow').toArray()) {
        const $tr = $(tr);

        const rowObject: {
          group: any;
          docCount: string;
        } = {
          group: $tr
            .findTestSubject('aiopsSpikeAnalysisGroupsTableColumnGroup')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          docCount: $tr
            .findTestSubject('aiopsSpikeAnalysisGroupsTableColumnDocCount')
            .find('.euiTableCellContent')
            .text()
            .trim(),
        };

        rows.push(rowObject);
      }

      return rows;
    }

    public rowSelector(rowId: string, subSelector?: string) {
      const row = `~aiopsSpikeAnalysisGroupsTable > ~row-${rowId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async ensureActionsMenuOpen(rowId: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.ensureActionsMenuClosed();

        if (!(await find.existsByCssSelector('.euiContextMenuPanel', 1000))) {
          await testSubjects.click(this.rowSelector(rowId, 'euiCollapsedItemActionsButton'));
          expect(await find.existsByCssSelector('.euiContextMenuPanel', 1000)).to.eql(
            true,
            'Actions popover should exist'
          );
        }
      });
    }

    public async ensureActionsMenuClosed() {
      await retry.tryForTime(30 * 1000, async () => {
        await browser.pressKeys(browser.keys.ESCAPE);
        expect(await find.existsByCssSelector('.euiContextMenuPanel', 1000)).to.eql(
          false,
          'Actions popover should not exist'
        );
      });
    }

    public async assertRowActions(rowId: string) {
      await this.ensureActionsMenuOpen(rowId);

      await testSubjects.existOrFail('aiopsTableActionButtonCopyToClipboard enabled');
      await testSubjects.existOrFail('aiopsTableActionButtonDiscover enabled');
      await testSubjects.existOrFail('aiopsTableActionButtonLogPatternAnalysis enabled');

      await this.ensureActionsMenuClosed();
    }

    public async clickRowAction(rowId: string, action: string) {
      await this.ensureActionsMenuOpen(rowId);
      await testSubjects.click(`aiopsTableActionButton${action} enabled`);
      await testSubjects.missingOrFail(`aiopsTableActionButton${action} enabled`);
    }
  })();
}
