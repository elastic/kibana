/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';


const selectSpaces = (): void => {
  cy.get('[data-test-subj="addSpacePrivilegeButton"]').click();
  cy.get('[data-test-subj="spaceSelectorComboBox"]').click();

  // select space
  cy.get('[data-test-subj="spaceSelectorComboBox"]').should('be.visible');
  cy.get('[data-test-subj="spaceSelectorComboBox"]').type('Default').type('{enter}');

  // expand security privileges
  cy.get('[data-test-subj="featureCategory_securitySolution"]').should('be.visible');
  cy.get('[data-test-subj="featureCategory_securitySolution"]').click();
}

const verifyNonExistentSubPrivilege = (privilege: string): void => {
  cy.get(`[data-test-subj="featureCategory_securitySolution_${privilege}"]`).should('not.exist');
}

describe('Custom role creation', { tags: '@serverless' }, () => {
  beforeEach(() => {
    login('admin');
    visit('app/management/security/roles/edit');
  });

  describe('Security privileges', () => {
    it('should not show `Timelines` and `Notes` sub-privilege', () => {
      selectSpaces();
      // should not have timeline/notes sub-privileges
      verifyNonExistentSubPrivilege('securitySolutionTimeline');
      verifyNonExistentSubPrivilege('securitySolutionNotes');
    });
  });

});
