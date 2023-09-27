/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertSuppression,
  QueryRuleCreateProps,
  RuleCreateProps,
} from '@kbn/security-solution-plugin/common/api/detection_engine/model';

import {
  APPLY_SELECTED_SAVED_QUERY_BUTTON,
  CUSTOM_QUERY_INPUT,
  DEFINE_CONTINUE_BUTTON,
  IMPORT_QUERY_FROM_SAVED_TIMELINE_LINK,
  LOAD_QUERY_DYNAMICALLY_CHECKBOX,
  LOAD_SAVED_QUERIES_LIST_BUTTON,
  QUERY_BAR,
  savedQueryByName,
  SHOW_QUERY_BAR_BUTTON,
  DATA_VIEW_COMBO_BOX,
  DATA_VIEW_OPTION,
  RULE_INDICES,
  ALERTS_INDEX_BUTTON,
  ALERT_SUPPRESSION_FIELDS,
  ALERT_SUPPRESSION_TOGGLE,
  ALERT_SUPPRESSION_MISSING_FIELDS,
  TIMELINE_TEMPLATE,
  TIMELINE_TEMPLATE_INPUT,
  RULE_INDICES_CLEAR,
} from '../../../screens/create_new_rule';
import { TIMELINE } from '../../../screens/timelines';

// called after import rule from saved timeline
// if alerts index is created, it is included in the timeline
// to be consistent in multiple test runs, remove it if it's there
export const removeAlertsIndex = () => {
  cy.get(RULE_INDICES).then(($body) => {
    if ($body.find(ALERTS_INDEX_BUTTON).length > 0) {
      cy.get(ALERTS_INDEX_BUTTON).click();
    }
  });
};

export const importSavedQuery = (timelineId: string) => {
  cy.get(IMPORT_QUERY_FROM_SAVED_TIMELINE_LINK).click();
  cy.get(TIMELINE(timelineId)).click();
  cy.get(CUSTOM_QUERY_INPUT).should('not.be.empty');
  removeAlertsIndex();
};

export const fillTimelineTemplate = (rule: RuleCreateProps) => {
  cy.get(TIMELINE_TEMPLATE).click();
  cy.get(TIMELINE_TEMPLATE_INPUT).type(`${rule.timeline_title}{enter}`);
};

export const fillDefineCustomRule = (rule: QueryRuleCreateProps) => {
  if (rule.data_view_id !== undefined) {
    cy.get(DATA_VIEW_OPTION).click();
    cy.get(DATA_VIEW_COMBO_BOX).type(`${rule.data_view_id}{enter}`);
  } else {
    cy.get(RULE_INDICES_CLEAR).click();

    rule.index?.forEach((ind) => {
      cy.get(RULE_INDICES).type(`${ind}{enter}`);
    });
  }
  cy.get(CUSTOM_QUERY_INPUT)
    .first()
    .type(rule.query || '');
};

export const fillDefineCustomRuleAndContinue = (rule: QueryRuleCreateProps) => {
  fillDefineCustomRule(rule);
  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });
};

/** Returns the continue button on the step of define */
export const getDefineContinueButton = () => cy.get(DEFINE_CONTINUE_BUTTON);

export const selectAndLoadSavedQuery = (queryName: string, queryValue: string) => {
  cy.get(QUERY_BAR).find(SHOW_QUERY_BAR_BUTTON).click();

  cy.get(LOAD_SAVED_QUERIES_LIST_BUTTON).click();
  cy.get(savedQueryByName(queryName)).click();
  cy.get(APPLY_SELECTED_SAVED_QUERY_BUTTON).click();

  cy.get(CUSTOM_QUERY_INPUT).should('have.value', queryValue);
};

export const checkLoadQueryDynamically = () => {
  cy.get(LOAD_QUERY_DYNAMICALLY_CHECKBOX).click({ force: true });
  cy.get(LOAD_QUERY_DYNAMICALLY_CHECKBOX).should('be.checked');
};

export const uncheckLoadQueryDynamically = () => {
  cy.get(LOAD_QUERY_DYNAMICALLY_CHECKBOX).click({ force: true });
  cy.get(LOAD_QUERY_DYNAMICALLY_CHECKBOX).should('not.be.checked');
};

/*
 * ALERT SUPPRESSION
 */

export const fillAlertSuppression = (suppression: AlertSuppression) => {
  suppression.group_by.forEach((field) => {
    cy.get(ALERT_SUPPRESSION_FIELDS).type(`${field}{downarrow}{enter}`);
  });

  cy.get(ALERT_SUPPRESSION_TOGGLE).click();

  cy.get(
    `${ALERT_SUPPRESSION_MISSING_FIELDS} label[for="${suppression.missing_fields_strategy}"]`
  ).click();
};
