/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewTermsRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { convertHistoryStartToSize } from '../../helpers/rules';
import {
  DEFINITION_DETAILS,
  NEW_TERMS_FIELDS_DETAILS,
  NEW_TERMS_HISTORY_WINDOW_DETAILS,
  RULE_TYPE_DETAILS,
} from '../../screens/rule_details';
import { getDetails } from './common_tasks';
import { checkQueryDetails, confirmCommonRuleDetailsDefinition } from './definition_section';

export const checkNewTermsRuleTypeDetails = () => {
  cy.get(DEFINITION_DETAILS).within(() => {
    getDetails(RULE_TYPE_DETAILS).should('have.text', 'New Terms');
  });
};

export const checkNewTermsRuleFieldDetails = (newTermsFields: string[]) => {
  cy.get(DEFINITION_DETAILS).within(() => {
    getDetails(NEW_TERMS_FIELDS_DETAILS).should('have.text', newTermsFields.join(''));
  });
};

export const checkNewTermsRuleHistoryWindowDetails = (newTermsFields: string) => {
  cy.get(DEFINITION_DETAILS).within(() => {
    getDetails(NEW_TERMS_HISTORY_WINDOW_DETAILS).should(
      'have.text',
      convertHistoryStartToSize(newTermsFields)
    );
  });
};

export const confirmNewTermsRuleDetailsDefinition = (rule: NewTermsRuleCreateProps) => {
  confirmCommonRuleDetailsDefinition(rule);
  checkNewTermsRuleTypeDetails();
  checkQueryDetails(rule.query);
  checkNewTermsRuleFieldDetails(rule.new_terms_fields);
  checkNewTermsRuleHistoryWindowDetails(rule.history_window_start);
};
