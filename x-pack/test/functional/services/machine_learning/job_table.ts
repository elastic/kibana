/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobTableProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return new (class MlJobTable {
    public async parseJobTable() {
      const table = await testSubjects.find('mlJobListTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('row').toArray()) {
        const $tr = $(tr);

        const $description = $tr.findTestSubject('description').find('.euiTableCellContent__text');
        const $jobGroups = $description.findTestSubjects('jobGroup');
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
            .findTestSubject('id')
            .find('.euiTableCellContent__text')
            .text()
            .trim(),
          description: $description
            .text()
            .replace(/(&nbsp;$)/g, '')
            .trim(),
          jobGroups,
          recordCount: $tr
            .findTestSubject('rcordCount')
            .find('.euiTableCellContent__text')
            .text()
            .trim(),
          memoryStatus: $tr
            .findTestSubject('memoryStatus')
            .find('.euiTableCellContent__text')
            .text()
            .trim(),
          jobState: $tr
            .findTestSubject('jobState')
            .find('.euiTableCellContent__text')
            .text()
            .trim(),
          datafeedState: $tr
            .findTestSubject('datafeedState')
            .find('.euiTableCellContent__text')
            .text()
            .trim(),
          latestTimestamp: $tr
            .findTestSubject('latestTimestamp')
            .find('.euiTableCellContent__text')
            .text()
            .trim(),
        });
      }

      return rows;
    }

    public async parseJobCounts(jobId: string) {
      return await this.withDetailsOpen(jobId, async () => {
        // click counts tab
        await testSubjects.click(this.detailsSelector(jobId, 'tab-counts'));

        const countsTable = await testSubjects.find(
          this.detailsSelector(jobId, 'details-counts counts')
        );
        const modelSizeStatsTable = await testSubjects.find(
          this.detailsSelector(jobId, 'details-counts modelSizeStats')
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
      const row = `mlJobListTable row-${jobId}`;
      return !subSelector ? row : `${row} ${subSelector}`;
    }

    public detailsSelector(jobId: string, subSelector?: string) {
      const row = `mlJobListTable details-${jobId}`;
      return !subSelector ? row : `${row} ${subSelector}`;
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
          await testSubjects.click(this.rowSelector(jobId, 'detailsToggle'));
        }

        await testSubjects.existOrFail(this.detailsSelector(jobId));
      });
    }

    public async ensureDetailsClosed(jobId: string) {
      await retry.try(async () => {
        if (await testSubjects.exists(this.detailsSelector(jobId))) {
          await testSubjects.click(this.rowSelector(jobId, 'detailsToggle'));
          await testSubjects.missingOrFail(this.detailsSelector(jobId));
        }
      });
    }
  })();
}
