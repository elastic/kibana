/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILTER_INPUT } from '../screens/alerts_details';

export const filterBy = (value: string) => {
  cy.get(FILTER_INPUT).type(value);
};
