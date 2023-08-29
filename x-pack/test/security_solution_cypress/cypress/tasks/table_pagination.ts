/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOADING_SPINNER } from '../screens/loading';
import {
  rowsPerPageSelector,
  tablePageSelector,
  TABLE_PER_PAGE_POPOVER_BTN,
  TABLE_SEARCH_BAR,
  TABLE_SORT_COLUMN_BTN,
} from '../screens/table_pagination';

export const goToTablePage = (pageNumber: number) => {
  cy.get(LOADING_SPINNER).should('not.exist');
  cy.get(tablePageSelector(pageNumber)).last().click({ force: true });
};

export const sortFirstTableColumn = () => {
  cy.get(TABLE_SORT_COLUMN_BTN).first().click();
};

export const expectTablePage = (pageNumber: number) => {
  cy.get(tablePageSelector(pageNumber)).should('have.text', pageNumber);
};

export const setRowsPerPageTo = (rowsCount: number) => {
  cy.get(TABLE_PER_PAGE_POPOVER_BTN).click({ force: true });
  cy.get(rowsPerPageSelector(rowsCount)).click();
  cy.get(rowsPerPageSelector(rowsCount)).should('not.exist');
};

export const searchByTitle = (title: string) => {
  cy.get(LOADING_SPINNER).should('not.exist');
  cy.get(TABLE_PER_PAGE_POPOVER_BTN).should('exist');
  cy.get(TABLE_SEARCH_BAR).click({ force: true });
  // EuiSearchBox needs the "search" event to be triggered, {enter} doesn't work
  cy.get(TABLE_SEARCH_BAR).type(`"${title}"`);
  cy.get(TABLE_SEARCH_BAR).trigger('search');
};

export const expectRowsPerPage = (rowsCount: number) => {
  cy.get(TABLE_PER_PAGE_POPOVER_BTN).contains(`Rows per page: ${rowsCount}`);
};

export const sortByTableColumn = (columnName: string, direction: 'asc' | 'desc' = 'asc') => {
  cy.get(TABLE_SORT_COLUMN_BTN).contains(columnName).click({ force: true });

  if (direction === 'desc') {
    cy.get(TABLE_SORT_COLUMN_BTN).contains(columnName).click({ force: true });
  }
};

export const expectTableSorting = (columnName: string, direction: 'asc' | 'desc') => {
  cy.get(`${TABLE_SORT_COLUMN_BTN}.euiTableHeaderButton-isSorted`)
    .contains(columnName)
    .parents('.euiTableHeaderCell')
    .should('have.attr', 'aria-sort', direction === 'asc' ? 'ascending' : 'descending');
};
