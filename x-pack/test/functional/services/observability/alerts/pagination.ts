/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

const ALERTS_ROWS_PER_PAGE_SELECTOR = 'tablePaginationPopoverButton';
const ALERTS_PAGINATION_BUTTON_PREVIOUS = 'pagination-button-previous';
const ALERTS_PAGINATION_BUTTON_NEXT = 'pagination-button-next';
const ALERTS_PAGINATION_TEN_ROWS = 'tablePagination-10-rows';
const ALERTS_PAGINATION_TWENTY_FIVE_ROWS = 'tablePagination-25-rows';
const ALERTS_PAGINATION_FIFTY_ROWS = 'tablePagination-50-rows';
const ALERTS_PAGINATION_BUTTON_ONE = 'pagination-button-0';
const ALERTS_PAGINATION_BUTTON_TWO = 'pagination-button-1';

export function ObservabilityAlertsPaginationProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  const getPageSizeSelector = async () => {
    return await testSubjects.find(ALERTS_ROWS_PER_PAGE_SELECTOR);
  };

  const getPageSizeSelectorOrFail = async () => {
    return await testSubjects.existOrFail(ALERTS_ROWS_PER_PAGE_SELECTOR);
  };

  const missingPageSizeSelectorOrFail = async () => {
    return await testSubjects.missingOrFail(ALERTS_ROWS_PER_PAGE_SELECTOR);
  };

  const getTenRowsPageSelector = async () => {
    return await testSubjects.find(ALERTS_PAGINATION_TEN_ROWS);
  };

  const getTwentyFiveRowsPageSelector = async () => {
    return await testSubjects.find(ALERTS_PAGINATION_TWENTY_FIVE_ROWS);
  };

  const getFiftyRowsPageSelector = async () => {
    return await testSubjects.find(ALERTS_PAGINATION_FIFTY_ROWS);
  };

  const getPrevPageButton = async () => {
    return await testSubjects.find(ALERTS_PAGINATION_BUTTON_PREVIOUS);
  };

  const getPrevPageButtonOrFail = async () => {
    return await testSubjects.existOrFail(ALERTS_PAGINATION_BUTTON_PREVIOUS);
  };

  const missingPrevPageButtonOrFail = async () => {
    return await testSubjects.missingOrFail(ALERTS_ROWS_PER_PAGE_SELECTOR);
  };

  const getNextPageButton = async () => {
    return await testSubjects.find(ALERTS_PAGINATION_BUTTON_NEXT, 20000);
  };

  const getNextPageButtonOrFail = async () => {
    return await testSubjects.existOrFail(ALERTS_PAGINATION_BUTTON_NEXT);
  };

  const getPaginationButtonOne = async () => {
    return await testSubjects.find(ALERTS_PAGINATION_BUTTON_ONE);
  };

  const getPaginationButtonTwo = async () => {
    return await testSubjects.find(ALERTS_PAGINATION_BUTTON_TWO);
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
  };
}
