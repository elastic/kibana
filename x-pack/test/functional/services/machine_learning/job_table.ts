/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobTableProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');

  return new (class MlJobTable {
    public async parseJobTable() {
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
          jobGroups.push(
            $(el)
              .text()
              .trim()
          );

          // remove this element from $description so it doesn't pollute it's text value
          $(el).remove();
        }

        rows.push({
          id: $tr
            .findTestSubject('mlJobListColumnId')
            .find('.euiTableCellContent')
            .text()
            .trim(),
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
          latestTimestamp: $tr
            .findTestSubject('mlJobListColumnLatestTimestamp')
            .find('.euiTableCellContent')
            .text()
            .trim(),
        });
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
            const [name, value] = $(row)
              .find('td')
              .toArray();

            vars[
              $(name)
                .text()
                .trim()
            ] = $(value)
              .text()
              .trim();
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
      await retry.try(async () => {
        if (!(await testSubjects.exists(this.detailsSelector(jobId)))) {
          await testSubjects.click(this.rowSelector(jobId, 'mlJobListRowDetailsToggle'));
        }

        await testSubjects.existOrFail(this.detailsSelector(jobId));
      });
    }

    public async ensureDetailsClosed(jobId: string) {
      await retry.try(async () => {
        if (await testSubjects.exists(this.detailsSelector(jobId))) {
          await testSubjects.click(this.rowSelector(jobId, 'mlJobListRowDetailsToggle'));
          await testSubjects.missingOrFail(this.detailsSelector(jobId));
        }
      });
    }

    public async waitForJobsToLoad() {
      await retry.waitFor(
        'jobs table to exist',
        async () => await testSubjects.exists('~mlJobListTable')
      );

      await retry.waitFor(
        'jobs table to be done loading',
        async () => await testSubjects.exists('mlJobListTable loaded')
      );
    }

    public async filterWithSearchString(filter: string) {
      await this.waitForJobsToLoad();
      const searchBar = await testSubjects.find('mlJobListSearchBar');
      const searchBarInput = await searchBar.findByTagName('input');
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);
    }

    public async assertJobRowFields(jobId: string, expectedRow: object) {
      const rows = await this.parseJobTable();
      const jobRow = rows.filter(row => row.id === jobId)[0];
      expect(jobRow).to.eql(expectedRow);
    }

    public async assertJobRowDetailsCounts(
      jobId: string,
      expectedCounts: object,
      expectedModelSizeStats: object
    ) {
      const countDetails = await this.parseJobCounts(jobId);
      const counts = countDetails.counts;

      // fields that have changing values are only validated
      // to be present and then removed so they don't make
      // the object validation fail
      expect(counts).to.have.property('last_data_time');
      delete counts.last_data_time;

      expect(counts).to.eql(expectedCounts);

      const modelSizeStats = countDetails.modelSizeStats;

      // fields that have changing values are only validated
      // to be present and then removed so they don't make
      // the object validation fail
      expect(modelSizeStats).to.have.property('log_time');
      delete modelSizeStats.log_time;
      expect(modelSizeStats).to.have.property('model_bytes');
      delete modelSizeStats.model_bytes;

      expect(modelSizeStats).to.eql(expectedModelSizeStats);
    }

    public async clickActionsMenu(jobId: string) {
      await testSubjects.click(this.rowSelector(jobId, 'euiCollapsedItemActionsButton'));
      if (!(await find.existsByDisplayedByCssSelector('[class~=euiContextMenuPanel]'))) {
        throw new Error(`expected euiContextMenuPanel to exist`);
      }
    }

    public async clickCloneJobAction(jobId: string) {
      await this.clickActionsMenu(jobId);
      await testSubjects.click('mlActionButtonCloneJob');
      await testSubjects.existOrFail('~mlPageJobWizard');
    }
  })();
}
