/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_TO_RULE_RADIO_LABEL,
  ADD_TO_SHARED_LIST_RADIO_LABEL,
  LINK_TO_SHARED_LIST_RADIO,
  RULE_ACTION_LINK_RULE_SWITCH,
  SHARED_LIST_SWITCH,
} from '../../screens/exceptions';

export const selectAddToRuleRadio = () => {
  cy.get(ADD_TO_RULE_RADIO_LABEL).click();
};

export const selectSharedListToAddExceptionTo = (numListsToCheck = 1) => {
  cy.get(ADD_TO_SHARED_LIST_RADIO_LABEL).click();
  for (let i = 0; i < numListsToCheck; i++) {
    cy.get(SHARED_LIST_SWITCH).eq(i).click();
  }
};

export const linkFirstRuleOnExceptionFlyout = () => {
  cy.get(RULE_ACTION_LINK_RULE_SWITCH).find('button').click();
};

export const linkFirstSharedListOnExceptionFlyout = () => {
  cy.get(LINK_TO_SHARED_LIST_RADIO).click();
  cy.get(RULE_ACTION_LINK_RULE_SWITCH).find('button').click();
};
