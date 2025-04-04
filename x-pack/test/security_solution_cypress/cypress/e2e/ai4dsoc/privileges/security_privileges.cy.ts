/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_SUB_PRIVILEGE,
  CASES_SUB_PRIVILEGE,
  ELASTIC_AI_ASSISTANT_SUB_PRIVILEGE,
  MACHINE_LEARNING_SUB_PRIVILEGE,
  NOTES_SUB_PRIVILEGE,
  SECURITY_SUB_PRIVILEGE,
  TIMELINE_SUB_PRIVILEGE,
} from '../../../screens/custom_roles/assign_to_space_flyout';
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
    it('should not show `Security` sub-privilege', () => {
      selectAllSpaces();
      // should not have Security sub-privileges
      cy.get(SECURITY_SUB_PRIVILEGE).should('not.exist');
    });

    it('should not show `Timelines` and `Notes` sub-privilege', () => {
      selectAllSpaces();
      // should not have Timeline/Notes sub-privileges
      cy.get(TIMELINE_SUB_PRIVILEGE).should('not.exist');
      cy.get(NOTES_SUB_PRIVILEGE).should('not.exist');
    });

    it('should show `Cases`, `Machine Learning`, `Elastic AI Assistant` and `Attack discovery`', () => {
      selectAllSpaces();
      // should have Cases sub-privilege
      cy.get(CASES_SUB_PRIVILEGE).should('exist');
      // should have Machine Learning sub-privilege
      cy.get(MACHINE_LEARNING_SUB_PRIVILEGE).should('exist');
      // should have Elastic AI Assistant sub-privilege
      cy.get(ELASTIC_AI_ASSISTANT_SUB_PRIVILEGE).should('exist');
      // should have Attack Discovery sub-privilege
      cy.get(ATTACK_DISCOVERY_SUB_PRIVILEGE).should('exist');
    });
  });
});
