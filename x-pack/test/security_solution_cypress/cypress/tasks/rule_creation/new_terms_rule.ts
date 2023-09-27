/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewTermsRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine/model';
import { convertHistoryStartToSize } from '../../helpers/rules';
import { EUI_FILTER_SELECT_ITEM } from '../../screens/common/controls';
import {
  CUSTOM_QUERY_INPUT,
  DEFINE_CONTINUE_BUTTON,
  INPUT,
  NEW_TERMS_HISTORY_SIZE,
  NEW_TERMS_HISTORY_TIME_TYPE,
  NEW_TERMS_INPUT_AREA,
  NEW_TERMS_TYPE,
} from '../../screens/create_new_rule';

export const selectNewTermsRuleType = () => {
  cy.get(NEW_TERMS_TYPE).click({ force: true });
};

export const fillDefineNewTermsRuleAndContinue = (rule: NewTermsRuleCreateProps) => {
  cy.get(CUSTOM_QUERY_INPUT)
    .first()
    .type(rule.query || '');
  cy.get(NEW_TERMS_INPUT_AREA).find(INPUT).click();
  cy.get(NEW_TERMS_INPUT_AREA).find(INPUT).type(rule.new_terms_fields[0], { delay: 35 });

  cy.get(EUI_FILTER_SELECT_ITEM).click();
  // eslint-disable-next-line cypress/unsafe-to-chain-command
  cy.focused().type('{esc}'); // Close combobox dropdown so next inputs can be interacted with
  const historySize = convertHistoryStartToSize(rule.history_window_start);
  const historySizeNumber = historySize.slice(0, historySize.length - 1);
  const historySizeType = historySize.charAt(historySize.length - 1);
  cy.get(NEW_TERMS_INPUT_AREA).find(NEW_TERMS_HISTORY_SIZE).type('{selectAll}');
  cy.get(NEW_TERMS_INPUT_AREA).find(NEW_TERMS_HISTORY_SIZE).type(historySizeNumber);
  cy.get(NEW_TERMS_INPUT_AREA).find(NEW_TERMS_HISTORY_TIME_TYPE).select(historySizeType);
  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });
};
