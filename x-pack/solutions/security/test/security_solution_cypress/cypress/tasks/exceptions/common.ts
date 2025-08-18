/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_ITEM_VIEWER_CONTAINER, FIELD_INPUT } from '../../screens/exceptions';

export const assertNumberOfExceptionItemsExists = (numberOfItems: number) => {
  cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', numberOfItems);
};

export const expectToContainItem = (container: string, itemName: string) => {
  cy.log(`Expecting exception items table to contain '${itemName}'`);
  cy.get(container).should('include.text', itemName);
};

export const assertExceptionItemsExists = (container: string, itemNames: string[]) => {
  for (const itemName of itemNames) {
    expectToContainItem(container, itemName);
  }
};

export const searchExceptionEntryFieldWithPrefix = (fieldPrefix: string, index = 0) => {
  cy.get(FIELD_INPUT).eq(index).click({ force: true });
  cy.get(FIELD_INPUT).eq(index).type(fieldPrefix);
};
