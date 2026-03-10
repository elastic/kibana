/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSavedQueryRule } from '../../../../objects/rule';

import { DEFINE_CONTINUE_BUTTON, QUERY_BAR } from '../../../../screens/create_new_rule';
import { TOASTER } from '../../../../screens/alerts_detection_rules';
import { RULE_NAME_HEADER } from '../../../../screens/rule_details';

import { createSavedQuery, deleteSavedQueries } from '../../../../tasks/api_calls/saved_queries';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  fillAboutRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectAndLoadSavedQuery,
  getCustomQueryInput,
  checkLoadQueryDynamically,
  createRuleWithoutEnabling,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { visitRuleDetailsPage } from '../../../../tasks/rule_details';
import { createRule } from '../../../../tasks/api_calls/rules';
import { CREATE_RULE_URL } from '../../../../urls/navigation';

const savedQueryName = 'custom saved query';
const savedQueryQuery = 'process.name: test';
const savedQueryFilterKey = 'testAgent.value';

describe('Saved query rules - Rule Creation', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    deleteSavedQueries();
  });

  it('Creates saved query rule', function () {
    const rule = getSavedQueryRule();
    createSavedQuery(savedQueryName, savedQueryQuery, savedQueryFilterKey);
    visit(CREATE_RULE_URL);

    selectAndLoadSavedQuery(savedQueryName, savedQueryQuery);

    // edit loaded saved query
    getCustomQueryInput()
      .type(' AND random query')
      .should('have.value', [savedQueryQuery, ' AND random query'].join(''));

    // when clicking load query dynamically checkbox, saved query should be shown in query input and input should be disabled
    checkLoadQueryDynamically();
    getCustomQueryInput().should('have.value', savedQueryQuery).should('be.disabled');
    cy.get(QUERY_BAR).should('contain', savedQueryFilterKey);

    cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click();

    fillAboutRuleAndContinue(rule);
    fillScheduleRuleAndContinue(rule);
    createRuleWithoutEnabling();

    cy.log('Asserting we have a new rule created');
    cy.get(RULE_NAME_HEADER).should('contain', rule.name);
  });

  context('Non existent saved query', () => {
    const FAILED_TO_LOAD_ERROR = 'Failed to load the saved query';

    describe('on rule details page', () => {
      beforeEach(() => {
        createRule(
          getSavedQueryRule({
            saved_id: 'non-existent',
            query: undefined,
          })
        ).then((rule) => visitRuleDetailsPage(rule.body.id));
      });

      it('Shows error toast on details page when saved query can not be loaded', function () {
        cy.get(TOASTER).should('contain', FAILED_TO_LOAD_ERROR);
      });
    });
  });
});
