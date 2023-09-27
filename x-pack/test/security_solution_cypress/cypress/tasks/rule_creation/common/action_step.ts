/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Actions } from '../../../objects/types';
import {
  INDEX_SELECTOR,
  CREATE_ACTION_CONNECTOR_BTN,
  EMAIL_ACTION_BTN,
} from '../../../screens/common/rule_actions';
import { ACTIONS_EDIT_TAB } from '../../../screens/create_new_rule';
import { fillIndexConnectorForm, fillEmailConnectorForm } from '../../common/rule_actions';

export const goToActionsStepTab = () => {
  cy.get(ACTIONS_EDIT_TAB).click({ force: true });
};

export const fillRuleAction = (actions: Actions) => {
  actions.connectors.forEach((connector) => {
    switch (connector.type) {
      case 'index':
        cy.get(INDEX_SELECTOR).click();
        cy.get(CREATE_ACTION_CONNECTOR_BTN).click();
        fillIndexConnectorForm(connector);
        break;
      case 'email':
        cy.get(EMAIL_ACTION_BTN).click();
        cy.get(CREATE_ACTION_CONNECTOR_BTN).click();
        fillEmailConnectorForm(connector);
        break;
    }
  });
};
