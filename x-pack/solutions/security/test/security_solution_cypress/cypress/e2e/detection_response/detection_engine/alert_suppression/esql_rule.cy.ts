/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlRule } from '../../../../objects/rule';
import {
  DEFINITION_DETAILS,
  SUPPRESS_BY_DETAILS,
  SUPPRESS_FOR_DETAILS,
  SUPPRESS_MISSING_FIELD,
} from '../../../../screens/rule_details';
import { getDetails } from '../../../../tasks/rule_details';
import {
  selectEsqlRuleType,
  fillEsqlQueryBar,
  createRuleWithoutEnabling,
  fillAlertSuppressionFields,
  selectAlertSuppressionPerInterval,
  setAlertSuppressionDuration,
  selectDoNotSuppressForMissingFields,
  continueFromDefineStep,
  fillAboutRuleMinimumAndContinue,
  skipScheduleRuleAction,
  interceptEsqlQueryFieldsRequest,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';

import { CREATE_RULE_URL } from '../../../../urls/navigation';

// https://github.com/cypress-io/cypress/issues/22113
// issue is inside monaco editor, used in ES|QL query input
// calling it after visiting page in each tests, seems fixes the issue
// the only other alternative is patching ResizeObserver, which is something I would like to avoid
const workaroundForResizeObserver = () =>
  cy.on('uncaught:exception', (err) => {
    if (err.message.includes('ResizeObserver loop limit exceeded')) {
      return false;
    }
  });

describe(
  'Detection ES|QL - Alert suppression',
  {
    tags: ['@ess', '@serverless'],
  },
  () => {
    const rule = getEsqlRule();

    beforeEach(() => {
      login();
      visit(CREATE_RULE_URL);
    });

    it('shows custom ES|QL field in investigation fields autocomplete and saves it in rule', function () {
      const CUSTOM_ESQL_FIELD = '_custom_agent_name';
      const SUPPRESS_BY_FIELDS = [CUSTOM_ESQL_FIELD, 'agent.type'];

      const queryWithCustomFields = [
        `from auditbeat* metadata _id, _version, _index`,
        `eval ${CUSTOM_ESQL_FIELD} = agent.name`,
        `drop agent.*`,
      ].join(' | ');

      workaroundForResizeObserver();

      selectEsqlRuleType();

      interceptEsqlQueryFieldsRequest(queryWithCustomFields, 'esqlSuppressionFieldsRequest');
      fillEsqlQueryBar(queryWithCustomFields);

      cy.wait('@esqlSuppressionFieldsRequest');
      fillAlertSuppressionFields(SUPPRESS_BY_FIELDS);
      selectAlertSuppressionPerInterval();
      setAlertSuppressionDuration(2, 'h');
      selectDoNotSuppressForMissingFields();
      continueFromDefineStep();

      // ensures details preview works correctly
      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(SUPPRESS_BY_DETAILS).should('have.text', SUPPRESS_BY_FIELDS.join(''));
        getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '2h');
        getDetails(SUPPRESS_MISSING_FIELD).should(
          'have.text',
          'Do not suppress alerts for events with missing fields'
        );
      });

      fillAboutRuleMinimumAndContinue(rule);
      skipScheduleRuleAction();
      createRuleWithoutEnabling();

      // ensures rule details displayed correctly after rule created
      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(SUPPRESS_BY_DETAILS).should('have.text', SUPPRESS_BY_FIELDS.join(''));
        getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '2h');
        getDetails(SUPPRESS_MISSING_FIELD).should(
          'have.text',
          'Do not suppress alerts for events with missing fields'
        );
      });
    });
  }
);
