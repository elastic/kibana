/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const selectAllSpaces = (): void => {
  cy.get('[data-test-subj="addSpacePrivilegeButton"]').click();

  // select space
  cy.get('[data-test-subj="spaceSelectorComboBox"]').click();
  cy.get('[data-test-subj="spaceSelectorComboBox"]').type('* All Spaces');
  cy.get('[data-test-subj="spaceSelectorComboBox"]').type('{enter}');

  // expand security privileges
  cy.get('[data-test-subj="featureCategory_securitySolution"]').click();
};
