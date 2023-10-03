/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { COMBO_BOX_INPUT } from '../../screens/common/controls';
import {
  DEFINE_CONTINUE_BUTTON,
  ESQL_QUERY_BAR,
  ESQL_QUERY_BAR_INPUT_AREA,
  ESQL_TYPE,
  RULE_NAME_OVERRIDE_FOR_ESQL,
} from '../../screens/create_new_rule';
import {
  expandAdvancedSettings,
  fillDescription,
  fillRuleName,
  getAboutContinueButton,
} from './common/about_step';

export const selectEsqlRuleType = () => {
  cy.get(ESQL_TYPE).click();
};

export const clearEsqlQueryBar = () => {
  // monaco editor under the hood is quite complex in matter to clear it
  // underlying textarea holds just the last character of query displayed in search bar
  // in order to clear it - it requires to select all text within editor and type in it
  cy.get(ESQL_QUERY_BAR_INPUT_AREA).type(Cypress.platform === 'darwin' ? '{cmd}a' : '{ctrl}a');
};
export const fillEsqlQueryBar = (query: string) => {
  cy.get(ESQL_QUERY_BAR_INPUT_AREA).type(query);
};

export const fillDefineEsqlRuleAndContinue = (rule: EsqlRuleCreateProps) => {
  cy.get(ESQL_QUERY_BAR).contains('ES|QL query');
  fillEsqlQueryBar(rule.query);

  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click();
};

export const fillOverrideEsqlRuleName = (value: string) => {
  cy.get(RULE_NAME_OVERRIDE_FOR_ESQL).within(() => {
    cy.get(COMBO_BOX_INPUT).type(`${value}{enter}`);
  });
};

/**
 * fills only required(name, description) and specific to ES|QL(rule name override) fields on about page
 */
export const fillAboutSpecificEsqlRuleAndContinue = (rule: EsqlRuleCreateProps) => {
  fillRuleName(rule.name);
  fillDescription(rule.description);

  expandAdvancedSettings();
  // this field defined to be returned in rule query
  fillOverrideEsqlRuleName(rule.rule_name_override ?? '');
  getAboutContinueButton().click();
};
