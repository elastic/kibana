/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

const ROWS_PER_PAGE_SELECTOR = 'tablePaginationPopoverButton';
const PREV_BUTTON_SELECTOR = 'pagination-button-previous';
const NEXT_BUTTON_SELECTOR = 'pagination-button-next';
const TEN_ROWS_SELECTOR = 'tablePagination-10-rows';
const TWENTY_FIVE_ROWS_SELECTOR = 'tablePagination-25-rows';
const FIFTY_ROWS_SELECTOR = 'tablePagination-50-rows';
const BUTTON_ONE_SELECTOR = 'pagination-button-0';
const BUTTON_TWO_SELECTOR = 'pagination-button-1';

export function ObservabilityAlertsPaginationProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  const getPageSizeSelector = async () => {
    return await testSubjects.find(ROWS_PER_PAGE_SELECTOR);
  };

  const getPageSizeSelectorOrFail = async () => {
    return await testSubjects.existOrFail(ROWS_PER_PAGE_SELECTOR);
  };

  const missingPageSizeSelectorOrFail = async () => {
    return await testSubjects.missingOrFail(ROWS_PER_PAGE_SELECTOR);
  };

  const getTenRowsPageSelector = async () => {
    return await testSubjects.find(TEN_ROWS_SELECTOR);
  };

  const getTwentyFiveRowsPageSelector = async () => {
    return await testSubjects.find(TWENTY_FIVE_ROWS_SELECTOR);
  };

  const getFiftyRowsPageSelector = async () => {
    return await testSubjects.find(FIFTY_ROWS_SELECTOR);
  };

  const getPrevPageButton = async () => {
    return await testSubjects.find(PREV_BUTTON_SELECTOR);
  };

  const getPrevPageButtonOrFail = async () => {
    return await testSubjects.existOrFail(PREV_BUTTON_SELECTOR);
  };

  const missingPrevPageButtonOrFail = async () => {
    return await testSubjects.missingOrFail(PREV_BUTTON_SELECTOR);
  };

  const getNextPageButton = async () => {
    return await testSubjects.find(NEXT_BUTTON_SELECTOR);
  };

  const getNextPageButtonOrFail = async () => {
    return await testSubjects.existOrFail(NEXT_BUTTON_SELECTOR);
  };

  const getPaginationButtonOne = async () => {
    return await testSubjects.find(BUTTON_ONE_SELECTOR);
  };

  const getPaginationButtonTwo = async () => {
    return await testSubjects.find(BUTTON_TWO_SELECTOR);
  };

  const goToNextPage = async () => {
    return await (await getNextPageButton()).click();
  };

  const goToPrevPage = async () => {
    return await (await getPrevPageButton()).click();
  };

  const goToFirstPage = async () => {
    await (await getPaginationButtonOne()).click();
  };

  const goToNthPage = async (page: number) => {
    const pageButton = await testSubjects.find(`pagination-button-${page - 1}`);
    await pageButton.click();
  };

  const getPrevButtonDisabledValue = async () => {
    return await (await getPrevPageButton()).getAttribute('disabled');
  };

  return {
    getPageSizeSelector,
    getPageSizeSelectorOrFail,
    missingPageSizeSelectorOrFail,
    getTenRowsPageSelector,
    getTwentyFiveRowsPageSelector,
    getFiftyRowsPageSelector,
    getPrevPageButton,
    getPrevPageButtonOrFail,
    missingPrevPageButtonOrFail,
    getNextPageButton,
    getNextPageButtonOrFail,
    getPaginationButtonOne,
    getPaginationButtonTwo,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    getPrevButtonDisabledValue,
    goToNthPage,
  };
}
