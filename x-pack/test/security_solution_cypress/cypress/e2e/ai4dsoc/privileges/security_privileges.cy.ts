/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { selectAllSpaces } from '../../../tasks/select_all_spaces';
import { CUSTOM_ROLES_URL } from '../../../urls/navigation';

describe('Custom role creation', { tags: '@serverless' }, () => {
  beforeEach(() => {
    login('admin');
    visit(CUSTOM_ROLES_URL);
  });

  describe('Security privileges', () => {
    it('should not show `Timelines` and `Notes` sub-privilege', () => {
      selectAllSpaces();
      // should not have timeline/notes sub-privileges
      cy.get(`[data-test-subj="featureCategory_securitySolution_securitySolutionTimeline"]`).should(
        'not.exist'
      );
      cy.get(`[data-test-subj="featureCategory_securitySolution_securitySolutionNotes"]`).should(
        'not.exist'
      );
    });
  });
});
