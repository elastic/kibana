/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEW_TERMS_INPUT_CLEAR } from '../../screens/rule_creation';
import { fillNewTermsFields, fillNewTermsHistoryWindowSize } from '../rule_creation';

export const editNewTermsFields = (newTermsFields: string[], clear: boolean = true) => {
  if (clear) {
    cy.get(NEW_TERMS_INPUT_CLEAR).click();
  }
  fillNewTermsFields(newTermsFields);
};

export const editNewTermsHistoryWindowSize = (historyWindow: string) => {
  fillNewTermsHistoryWindowSize(historyWindow);
};
