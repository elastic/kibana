/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewTermsRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine/model';
import { convertHistoryStartToSize } from '../../helpers/rules';
import {
  DEFINE_CONTINUE_BUTTON,
  INPUT,
  NEW_TERMS_HISTORY_SIZE,
  NEW_TERMS_HISTORY_TIME_TYPE,
  NEW_TERMS_INPUT_AREA,
  NEW_TERMS_TYPE,
} from '../../screens/rule_creation';
import { fillRulCustomQuery } from './common/define_step';

export const selectNewTermsRuleType = () => {
  cy.get(NEW_TERMS_TYPE).click({ force: true });
};

export const fillNewTermsFields = (newTermsFields: string[]) => {
  newTermsFields.forEach((term) => {
    cy.get(NEW_TERMS_INPUT_AREA).find(INPUT).click();
    cy.get(NEW_TERMS_INPUT_AREA).find(INPUT).type(`${term}{downArrow}{enter}`, { delay: 35 });
  });
};

export const fillNewTermsHistoryWindowSize = (historyWindow: string) => {
  const historySize = convertHistoryStartToSize(historyWindow);
  const historySizeNumber = historySize.slice(0, historySize.length - 1);
  const historySizeType = historySize.charAt(historySize.length - 1);
  cy.get(NEW_TERMS_INPUT_AREA).find(NEW_TERMS_HISTORY_SIZE).type('{selectAll}');
  cy.get(NEW_TERMS_INPUT_AREA).find(NEW_TERMS_HISTORY_SIZE).type(historySizeNumber);
  cy.get(NEW_TERMS_INPUT_AREA).find(NEW_TERMS_HISTORY_TIME_TYPE).select(historySizeType);
};

export const fillDefineNewTermsRuleAndContinue = (rule: NewTermsRuleCreateProps) => {
  fillRulCustomQuery(rule.query);
  fillNewTermsFields(rule.new_terms_fields);
  fillNewTermsHistoryWindowSize(rule.history_window_start);
  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });
};
