/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLACK_ACTION_BTN,
  SLACK_ACTION_MESSAGE_TEXTAREA,
  EMAIL_ACTION_BTN,
  CREATE_ACTION_CONNECTOR_BTN,
  SAVE_ACTION_CONNECTOR_BTN,
  EMAIL_ACTION_TO_INPUT,
  EMAIL_ACTION_SUBJECT_INPUT,
  CONNECTOR_NAME_INPUT,
  EMAIL_CONNECTOR_SERVICE_SELECTOR,
  EMAIL_CONNECTOR_FROM_INPUT,
  EMAIL_CONNECTOR_HOST_INPUT,
  EMAIL_CONNECTOR_PORT_INPUT,
  EMAIL_CONNECTOR_USER_INPUT,
  EMAIL_CONNECTOR_PASSWORD_INPUT,
  FORM_VALIDATION_ERROR,
  JSON_EDITOR,
  ACTIONS_SUMMARY_BUTTON,
  ACTIONS_NOTIFY_WHEN_BUTTON,
  ACTIONS_THROTTLE_INPUT,
  ACTIONS_THROTTLE_UNIT_INPUT,
  ACTIONS_SUMMARY_ALERT_BUTTON,
  ACTIONS_SUMMARY_FOR_EACH_ALERT_BUTTON,
  ACTIONS_NOTIFY_CUSTOM_FREQUENCY_BUTTON,
  actionFormSelector,
  ACTIONS_NOTIFY_PER_RULE_RUN_BUTTON,
  INDEX_CONNECTOR_COMBO_BOX_INPUT,
  CREATE_NEW_EMAIL_CONNECTOR,
} from '../../screens/common/rule_actions';
import { COMBO_BOX_SELECTION } from '../../screens/common/controls';
import type { EmailConnector, IndexConnector } from '../../objects/connector';
import { getEmailConnector, getIndexConnector } from '../../objects/connector';
import { CLOUD_SERVERLESS } from '../../env_var_names_constants';

export const addSlackRuleAction = (message: string) => {
  cy.get(SLACK_ACTION_BTN).click();
  cy.get(SLACK_ACTION_MESSAGE_TEXTAREA).clear();
  cy.get(SLACK_ACTION_MESSAGE_TEXTAREA).type(message);
};

export const assertSlackRuleAction = (message: string, position: number = 0) => {
  cy.get(SLACK_ACTION_MESSAGE_TEXTAREA).eq(position).should('have.value', message);
};

export const fillEmailConnectorForm = (connector: EmailConnector = getEmailConnector()) => {
  cy.get(CONNECTOR_NAME_INPUT).type(connector.name);
  cy.get(EMAIL_CONNECTOR_SERVICE_SELECTOR).select(connector.service);
  cy.get(EMAIL_CONNECTOR_FROM_INPUT).type(connector.from);
  cy.get(EMAIL_CONNECTOR_HOST_INPUT).type(connector.host);
  cy.get(EMAIL_CONNECTOR_PORT_INPUT).type(connector.port);
  cy.get(EMAIL_CONNECTOR_USER_INPUT).type(connector.user);
  cy.get(EMAIL_CONNECTOR_PASSWORD_INPUT).type(connector.password);
};

export const createEmailConnector = () => {
  // In cloud there is a default connector for email already created, in that case the selector we need to use is different.
  const CREATE_CONNECTOR_ELEMENT = Cypress.env(CLOUD_SERVERLESS)
    ? CREATE_NEW_EMAIL_CONNECTOR
    : CREATE_ACTION_CONNECTOR_BTN;
  cy.get(CREATE_CONNECTOR_ELEMENT).click();
  fillEmailConnectorForm();
  cy.get(SAVE_ACTION_CONNECTOR_BTN).click();
};

export const fillEmailRuleActionForm = (email: string, subject: string) => {
  cy.get(EMAIL_ACTION_TO_INPUT).type(email);
  cy.get(EMAIL_ACTION_SUBJECT_INPUT).type(subject);
};

export const addEmailConnectorAndRuleAction = (email: string, subject: string) => {
  cy.get(EMAIL_ACTION_BTN).click();
  createEmailConnector();
  fillEmailRuleActionForm(email, subject);

  cy.get(FORM_VALIDATION_ERROR).should('not.exist');
};

export const assertEmailRuleAction = (email: string, subject: string) => {
  cy.get(EMAIL_ACTION_TO_INPUT).contains(email);
  cy.get(EMAIL_ACTION_SUBJECT_INPUT).should('have.value', subject);
};

export const fillIndexConnectorForm = (connector: IndexConnector = getIndexConnector()) => {
  cy.get(CONNECTOR_NAME_INPUT).type(connector.name);
  cy.get(INDEX_CONNECTOR_COMBO_BOX_INPUT).type(connector.index);

  cy.get(COMBO_BOX_SELECTION).click({ force: true });

  cy.get(SAVE_ACTION_CONNECTOR_BTN).click();
  cy.get(SAVE_ACTION_CONNECTOR_BTN).should('not.exist');
  cy.get(JSON_EDITOR).should('be.visible');
  cy.get(JSON_EDITOR).click();
  cy.get(JSON_EDITOR).type(connector.document, {
    parseSpecialCharSequences: false,
  });
};

export interface RuleActionCustomFrequency {
  throttle?: number;
  throttleUnit?: 's' | 'm' | 'h' | 'd';
}

export const pickSummaryOfAlertsOption = (index = 0) => {
  cy.get(actionFormSelector(index)).find(ACTIONS_SUMMARY_BUTTON).click();
  cy.get(ACTIONS_SUMMARY_ALERT_BUTTON).click();
};
export const pickForEachAlertOption = (index = 0) => {
  cy.get(actionFormSelector(index)).find(ACTIONS_SUMMARY_BUTTON).click();
  cy.get(ACTIONS_SUMMARY_FOR_EACH_ALERT_BUTTON).click();
};

export const pickCustomFrequencyOption = (
  { throttle = 1, throttleUnit = 'h' }: RuleActionCustomFrequency,
  index = 0
) => {
  cy.get(actionFormSelector(index)).find(ACTIONS_NOTIFY_WHEN_BUTTON).click();
  cy.get(ACTIONS_NOTIFY_CUSTOM_FREQUENCY_BUTTON).click();
  cy.get(actionFormSelector(index)).within(() => {
    cy.get(ACTIONS_THROTTLE_INPUT).type(`{selectAll}${throttle}`);
    cy.get(ACTIONS_THROTTLE_UNIT_INPUT).select(throttleUnit);
  });
};

export const pickPerRuleRunFrequencyOption = (index = 0) => {
  cy.get(actionFormSelector(index)).find(ACTIONS_NOTIFY_WHEN_BUTTON).click();
  cy.get(ACTIONS_NOTIFY_PER_RULE_RUN_BUTTON).click();
};

export const assertSelectedSummaryOfAlertsOption = (index = 0) => {
  cy.get(actionFormSelector(index))
    .find(ACTIONS_SUMMARY_BUTTON)
    .should('have.text', 'Summary of alerts');
};

export const assertSelectedForEachAlertOption = (index = 0) => {
  cy.get(actionFormSelector(index))
    .find(ACTIONS_SUMMARY_BUTTON)
    .should('have.text', 'For each alert');
};

export const assertSelectedCustomFrequencyOption = (
  { throttle = 1, throttleUnit = 'h' }: RuleActionCustomFrequency,
  index = 0
) => {
  cy.get(actionFormSelector(index)).within(() => {
    cy.get(ACTIONS_NOTIFY_WHEN_BUTTON).should('have.text', 'Custom frequency');
    cy.get(ACTIONS_THROTTLE_INPUT).should('have.value', throttle);
    cy.get(ACTIONS_THROTTLE_UNIT_INPUT).should('have.value', throttleUnit);
  });
};

export const assertSelectedPerRuleRunFrequencyOption = (index = 0) => {
  cy.get(actionFormSelector(index))
    .find(ACTIONS_NOTIFY_WHEN_BUTTON)
    .should('have.text', 'Per rule run');
};
