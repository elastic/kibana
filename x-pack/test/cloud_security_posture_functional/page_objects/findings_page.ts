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
const FINDINGS_NAME_COLUMN_TESTID = 'tableHeaderCell_rule.name_5';
const getNameColumnTestId = (index: string) => `findings_table_cell_rule.name_id-${index}`;

// Defined in archive file
const getNameColumnText = (index: string) => `Rule ${index}`;

// Defined in Security Solution plugin
const SECURITY_SOLUTION_APP_NAME = 'securitySolution';

export function FindingsPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

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

  const assertNameColumnCellValue = async (index: string) => {
    const text = await testSubjects.getVisibleText(getNameColumnTestId(index));
    expect(text).to.be(getNameColumnText(index));
  };

  /**
   * Note: column name values are defined in the archive file
   */
  const assertNameColumnSorting = async (direction: 'asc' | 'desc') => {
    if (direction === 'asc') {
      await testSubjects.missingOrFail(getNameColumnTestId('11')); // page 2
      await assertNameColumnCellValue('00');
      await assertNameColumnCellValue('09');
    } else if (direction === 'desc') {
      await testSubjects.missingOrFail(getNameColumnTestId('00')); // page 1
      await assertNameColumnCellValue('11');
      await assertNameColumnCellValue('02');
    }
  };

  const toggleNameColumnSorting = async () => {
    const id = FINDINGS_NAME_COLUMN_TESTID;
    const element = await testSubjects.find(id);
    const currentSort = await element.getAttribute('aria-sort');
    if (currentSort === 'none') await testSubjects.click(id); // a click is needed to focus on Eui column header
    await testSubjects.click(id);
  };

  return {
    assertPageIndex,
    goToPageIndex,
    assertPageSize,
    changePageSize,
    navigateToFindingsPage,
    toggleNameColumnSorting,
    assertNameColumnSorting,
  };
}
