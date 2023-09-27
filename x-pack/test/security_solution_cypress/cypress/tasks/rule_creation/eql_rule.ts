/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EqlRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine/model';
import {
  DEFINE_CONTINUE_BUTTON,
  EQL_QUERY_INPUT,
  EQL_QUERY_VALIDATION_SPINNER,
  EQL_TYPE,
  PREVIEW_HISTOGRAM,
  RULES_CREATION_FORM,
  RULES_CREATION_PREVIEW_BUTTON,
  RULES_CREATION_PREVIEW_REFRESH_BUTTON,
} from '../../screens/create_new_rule';
import { TOAST_ERROR } from '../../screens/shared';

export const selectEqlRuleType = () => {
  cy.get(EQL_TYPE).click({ force: true });
};

export const fillDefineEqlRuleAndContinue = (rule: EqlRuleCreateProps) => {
  cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).should('exist');
  cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).should('be.visible');
  cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).type(rule.query);
  cy.get(RULES_CREATION_FORM).find(EQL_QUERY_VALIDATION_SPINNER).should('not.exist');
  cy.get(RULES_CREATION_PREVIEW_BUTTON).should('not.be.disabled').click({ force: true });
  cy.get(RULES_CREATION_PREVIEW_REFRESH_BUTTON).should('not.be.disabled').click({ force: true });
  cy.get(PREVIEW_HISTOGRAM)
    .invoke('text')
    .then((text) => {
      if (text !== 'Rule Preview') {
        cy.get(RULES_CREATION_PREVIEW_REFRESH_BUTTON).click({ force: true });
        cy.get(PREVIEW_HISTOGRAM).should('contain.text', 'Rule Preview');
      }
    });
  cy.get(TOAST_ERROR).should('not.exist');

  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });
};
