/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EqlRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { ruleFields } from '../../data/detection_engine';
import {
  DEFINITION_DETAILS,
  EQL_QUERY_DETAILS,
  RULE_TYPE_DETAILS,
} from '../../screens/rule_details';
import { getDetails } from './common_tasks';
import { confirmCommonRuleDetailsDefinition } from './definition_section';

export const checkEQLRuleTypeDetails = () => {
  cy.get(DEFINITION_DETAILS).within(() => {
    getDetails(RULE_TYPE_DETAILS).should('have.text', 'Event Correlation');
  });
};

export const checkEQLQueryDetails = (query: string = ruleFields.ruleQuery) => {
  cy.get(DEFINITION_DETAILS).within(() => {
    getDetails(EQL_QUERY_DETAILS).should('have.text', query);
  });
};

export const confirmEQLRuleDetailsDefinition = (rule: EqlRuleCreateProps) => {
  confirmCommonRuleDetailsDefinition(rule);
  checkEQLRuleTypeDetails();
  checkEQLQueryDetails(rule.query);
};
