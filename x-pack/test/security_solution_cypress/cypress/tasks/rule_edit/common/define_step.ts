/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertSuppression } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  CUSTOM_QUERY_INPUT,
  DATA_VIEW_COMBO_BOX,
  DATA_VIEW_OPTION,
  DEFINE_INDEX_INPUT,
  RULE_INDICES,
  RULE_INDICES_CLEAR,
} from '../../../screens/rule_creation';
import { ruleFields } from '../../../data/detection_engine';
import { fillAlertSuppression } from '../../rule_creation';

export const editRuleDataViewSelection = (dataView: string) => {
  cy.get(DATA_VIEW_OPTION).click();
  cy.get(DATA_VIEW_COMBO_BOX).type(`${dataView}{downArrow}{enter}`);
};

export const editRuleIndices = (
  indices: string[] = ruleFields.defaultIndexPatterns,
  clear = true
) => {
  if (clear) {
    cy.get(RULE_INDICES_CLEAR).click();
  }

  indices.forEach((index) => {
    cy.get(RULE_INDICES).type(`${index}{enter}`);
  });
};

export const editRuleQuery = (query: string = ruleFields.ruleQuery) => {
  cy.get(CUSTOM_QUERY_INPUT).first().clear();
  cy.get(CUSTOM_QUERY_INPUT).first().type(query);
};

export const confirmEditDefineStepDetails = (rule) => {
  cy.get(CUSTOM_QUERY_INPUT).should('have.value', rule.query);
  cy.get(DEFINE_INDEX_INPUT).should('have.text', rule.index?.join(''));
};

export const editAlertSuppression = (suppression: AlertSuppression) => {
  // TODO: Add clear option for all alert suppresion fields

  fillAlertSuppression(suppression);
};
