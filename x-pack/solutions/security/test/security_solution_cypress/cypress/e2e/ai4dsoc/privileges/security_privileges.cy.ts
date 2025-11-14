/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_FEATURE,
  CASES_FEATURE,
  ELASTIC_AI_ASSISTANT_FEATURE,
  MACHINE_LEARNING_FEATURE,
  NOTES_FEATURE,
  SECURITY_FEATURE,
  SECURITY_FEATURE_DESCRIPTION,
  SECURITY_SUB_FEATURE_TABLE,
  SIEM_MIGRATIONS_FEATURE,
  SOC_MANAGEMENT_SUB_FEATURE,
  TIMELINE_FEATURE,
} from '../../../screens/custom_roles/assign_to_space_flyout';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { selectAllSpaces } from '../../../tasks/select_all_spaces';
import { CUSTOM_ROLES_URL } from '../../../urls/navigation';

describe(
  'Custom role creation',
  {
    tags: ['@serverless'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'complete' },
          { product_line: 'ai_soc', product_tier: 'search_ai_lake' },
        ],
      },
    },
  },
  () => {
  beforeEach(() => {
    login('admin');
    visit(CUSTOM_ROLES_URL);
  });

  describe('Security privileges', () => {
    it('should only show `Security` SOC Management sub-privilege', () => {
      selectAllSpaces();
      // should only SOC Management Security sub-privilege
      cy.get(SECURITY_FEATURE).should('exist');
      cy.get(SECURITY_FEATURE_DESCRIPTION).should('exist');
      cy.get(SECURITY_FEATURE).click();
      cy.get(`${SECURITY_FEATURE} button.euiAccordion__arrow`).should('exist');
      cy.get(SOC_MANAGEMENT_SUB_FEATURE).should('exist');
      // the first item is the customize sub-privilege toggle
      cy.get(`${SECURITY_SUB_FEATURE_TABLE} > div`).should('have.length', 2);
    });

    it('should not show `Timelines` and `Notes` features', () => {
      selectAllSpaces();
      // should not have Timeline/Notes sub-privileges
      cy.get(TIMELINE_FEATURE).should('not.exist');
      cy.get(NOTES_FEATURE).should('not.exist');
    });

    it('should not show `Siem Migration` feature', () => {
      selectAllSpaces();
      // should not have Siem Migration sub-privileges
      cy.get(SIEM_MIGRATIONS_FEATURE).should('not.exist');
    });

    it('should show `Cases`, `Machine Learning`, `Elastic AI Assistant` and `Attack discovery` features', () => {
      selectAllSpaces();
      // should have Cases sub-privilege
      cy.get(CASES_FEATURE).should('exist');
      // should have Machine Learning sub-privilege
      cy.get(MACHINE_LEARNING_FEATURE).should('exist');
      // should have Elastic AI Assistant sub-privilege
      cy.get(ELASTIC_AI_ASSISTANT_FEATURE).should('exist');
      // should have Attack Discovery sub-privilege
      cy.get(ATTACK_DISCOVERY_FEATURE).should('exist');
    });
  });
});
