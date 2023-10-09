/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryRuleCreateProps,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { DEFINITION_DETAILS, RULE_TYPE_DETAILS } from '../../screens/rule_details';
import { getDetails } from './common_tasks';
import {
  checkDataViewDetails,
  checkQueryDetails,
  checkRuleDetailsRuleIndex,
  confirmAlertSuppressionDetails,
  confirmCommonRuleDetailsDefinition,
} from './definition_section';

export const checkCustomQueryRuleTypeDetails = () => {
  cy.get(DEFINITION_DETAILS).within(() => {
    getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
  });
};

export const confirmCustomQueryRuleDetailsDefinition = (
  rule: RuleResponse | QueryRuleCreateProps
) => {
  if ('data_view_id' in rule && rule.data_view_id) {
    checkDataViewDetails(rule.data_view_id);
  } else {
    if ('index' in rule) {
      checkRuleDetailsRuleIndex(rule.index);
    }
  }

  checkCustomQueryRuleTypeDetails();
  confirmCommonRuleDetailsDefinition(rule);
  if ('query' in rule) {
    checkQueryDetails(rule.query);
  }
  if ('alert_suppression' in rule && rule.alert_suppression) {
    confirmAlertSuppressionDetails(rule.alert_suppression);
  }
};
