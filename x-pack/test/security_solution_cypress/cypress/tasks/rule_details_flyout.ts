/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILTER_INPUT, TABLE_TAB } from '../screens/rule_details_flyout';

export const openTable = (): void => {
  cy.get(TABLE_TAB).click();
};

export const filterBy = (value: string): void => {
  cy.get(FILTER_INPUT).type(value);
};
