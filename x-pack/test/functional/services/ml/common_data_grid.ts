/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { chunk } from 'lodash';
import type { ProvidedType } from '@kbn/test';
import type { FtrProviderContext } from '../../ftr_provider_context';

export interface SetValueOptions {
  clearWithKeyboard?: boolean;
  enforceDataTestSubj?: boolean;
  typeCharByChar?: boolean;
}

export type MlCommonDataGrid = ProvidedType<typeof MachineLearningCommonDataGridProvider>;

export function MachineLearningCommonDataGridProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return {
    async parseEuiDataGrid(tableSubj: string, maxColumnsToParse?: number) {
      const table = await testSubjects.find(`~${tableSubj}`);
      const $ = await table.parseDomContent();

      // Get the content of each cell and divide them up into rows.
      // Virtualized cells outside the view area are not present in the DOM until they
      // are scroilled into view, so we're limiting the number of parsed columns.
      // To determine row and column of a cell, we're utilizing the screen reader
      // help text, which enumerates the rows and columns 1-based.
      const cells = $.findTestSubjects('dataGridRowCell')
        .toArray()
        .map((cell) => {
          const cellText = $(cell).text();
          const pattern = /^(.*)Row: (\d+); Column: (\d+)$/;
          const matches = cellText.match(pattern);
          expect(matches).to.not.eql(null, `Cell text should match pattern '${pattern}'`);
          return { text: matches![1], row: Number(matches![2]), column: Number(matches![3]) };
        })
        .filter((cell) =>
          maxColumnsToParse !== undefined ? cell?.column <= maxColumnsToParse : false
        )
        .sort(function (a, b) {
          return a.row - b.row || a.column - b.column;
        })
        .map((cell) => cell.text);

      const rows = maxColumnsToParse !== undefined ? chunk(cells, maxColumnsToParse) : cells;
      return rows;
    },

    async assertDataGridColumnValues(
      tableSubj: string,
      column: number,
      expectedColumnValues: string[]
    ) {
      await retry.tryForTime(20 * 1000, async () => {
        // get a 2D array of rows and cell values
        // only parse columns up to the one we want to assert
        const rows = await this.parseEuiDataGrid(tableSubj, column + 1);

        // reduce the rows data to an array of unique values in the specified column
        const uniqueColumnValues = rows
          .map((row) => row[column])
          .flat()
          .filter((v, i, a) => a.indexOf(v) === i);

        uniqueColumnValues.sort();
        // check if the returned unique value matches the supplied filter value
        expect(uniqueColumnValues).to.eql(
          expectedColumnValues,
          `Unique EuiDataGrid column values should be '${expectedColumnValues.join()}' (got ${uniqueColumnValues.join()})`
        );
      });
    },
  };
}
