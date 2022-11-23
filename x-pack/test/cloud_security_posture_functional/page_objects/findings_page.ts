/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

// Defined in EUI
const getEuiPaginationText = (size: 10 | 25) => `Rows per page: ${size}`;
const getEuiPaginationRowTestId = (size: 10 | 25) => `tablePagination-${size}-rows`;
const getEuiPaginationButtonTestId = (index: number) => `pagination-button-${index}`;
const EUI_PAGINATION_BUTTON = 'tablePaginationPopoverButton';

// Defined in CSP plugin
const FINDINGS_ROUTE = 'cloud_security_posture/findings';
const FINDINGS_TABLE_TESTID = 'findings_table';
const getCellSelector = (columnIndex: number) =>
  `tbody tr td:nth-child(${columnIndex + 1}) div[data-test-subj="filter_cell_value"]`;

// Defined in Security Solution plugin
const SECURITY_SOLUTION_APP_NAME = 'securitySolution';

export function FindingsPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  const getColumnIndex = async (columnName: string) => {
    const table = await testSubjects.find(FINDINGS_TABLE_TESTID);
    const headers = await table.findAllByCssSelector('thead tr :is(th,td)');
    const headerIndexes = await Promise.all(headers.map((header) => header.getVisibleText()));
    const columnIndex = headerIndexes.findIndex((i) => i === columnName);

    expect(columnIndex).to.be.greaterThan(-1);

    return [columnIndex, headers[columnIndex]] as [
      number,
      Awaited<ReturnType<typeof testSubjects.find>>
    ];
  };

  const getFilterColumnValues = async (columnName: string) => {
    const table = await testSubjects.find(FINDINGS_TABLE_TESTID);
    const [columnIndex] = await getColumnIndex(columnName);
    const columnCells = await table.findAllByCssSelector(getCellSelector(columnIndex));
    return await Promise.all(columnCells.map((h) => h.getVisibleText()));
  };

  const navigateToFindingsPage = async () => {
    await PageObjects.common.navigateToUrl(SECURITY_SOLUTION_APP_NAME, FINDINGS_ROUTE, {
      shouldUseHashForSubUrl: false,
    });
  };

  const goToPageIndex = async (index: number) => {
    await testSubjects.click(getEuiPaginationButtonTestId(index));
  };

  const assertPageIndex = async (index: number) => {
    const isSelected = await testSubjects.getAttribute(
      getEuiPaginationButtonTestId(index),
      'aria-current'
    );
    expect(isSelected).to.be('true');
  };

  const changePageSize = async (size: 10 | 25) => {
    await testSubjects.click(EUI_PAGINATION_BUTTON);
    await testSubjects.click(getEuiPaginationRowTestId(size));
  };

  const assertPageSize = async (size: 10 | 25) => {
    const text = await testSubjects.getVisibleText(EUI_PAGINATION_BUTTON);
    expect(text).to.be(getEuiPaginationText(size));
  };

  const assertColumnSorting = async (columnName: string, direction: 'asc' | 'desc') => {
    const values = (await getFilterColumnValues(columnName)).filter(Boolean);

    expect(values).to.not.be.empty();

    const sorted = values
      .slice()
      .sort((a, b) => (direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a)));

    values.every((value, i) => expect(value).to.be(sorted[i]));
  };

  const toggleColumnSorting = async (columnName: string, direction: 'asc' | 'desc') => {
    const [_, element] = await getColumnIndex(columnName);

    const currentSort = await element.getAttribute('aria-sort');

    if (currentSort === 'none') {
      // a click is needed to focus on Eui column header
      await element.click();

      // default is ascending
      if (direction === 'desc') {
        const [, nonStaleElement] = await getColumnIndex(columnName);
        await nonStaleElement.click();
      }
    }

    if (
      (currentSort === 'ascending' && direction === 'desc') ||
      (currentSort === 'descending' && direction === 'asc')
    ) {
      // Without getting the element again, the click throws an error (stale element reference)
      const [, nonStaleElement] = await getColumnIndex(columnName);

      await nonStaleElement.click();
    }
  };

  return {
    assertColumnSorting,
    assertPageIndex,
    goToPageIndex,
    assertPageSize,
    changePageSize,
    navigateToFindingsPage,
    toggleColumnSorting,
  };
}
