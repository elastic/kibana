/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule, getSavedQueryRule } from '../../../objects/rule';

import {
  DEFINE_CONTINUE_BUTTON,
  LOAD_QUERY_DYNAMICALLY_CHECKBOX,
  QUERY_BAR,
} from '../../../screens/create_new_rule';
import { TOASTER } from '../../../screens/alerts_detection_rules';
import {
  RULE_NAME_HEADER,
  SAVED_QUERY_NAME_DETAILS,
  SAVED_QUERY_DETAILS,
  SAVED_QUERY_FILTERS_DETAILS,
  DEFINE_RULE_PANEL_PROGRESS,
  CUSTOM_QUERY_DETAILS,
} from '../../../screens/rule_details';

import { editFirstRule, goToRuleDetailsOf } from '../../../tasks/alerts_detection_rules';
import { createSavedQuery, deleteSavedQueries } from '../../../tasks/api_calls/saved_queries';
import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectAndLoadSavedQuery,
  getCustomQueryInput,
  checkLoadQueryDynamically,
  uncheckLoadQueryDynamically,
} from '../../../tasks/create_new_rule';
import { saveEditedRule, visitEditRulePage } from '../../../tasks/edit_rule';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  assertDetailsNotExist,
  getDetails,
  visitRuleDetailsPage,
} from '../../../tasks/rule_details';
import { createRule } from '../../../tasks/api_calls/rules';
import { CREATE_RULE_URL } from '../../../urls/navigation';
import { RULES_MANAGEMENT_URL } from '../../../urls/rules_management';
import { openRuleManagementPageViaBreadcrumbs } from '../../../tasks/rules_management';

const savedQueryName = 'custom saved query';
const savedQueryQuery = 'process.name: test';
const savedQueryFilterKey = 'testAgent.value';

// TODO: https://github.com/elastic/kibana/issues/161539
describe('Saved query rules', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  describe('Custom saved_query detection rule creation', () => {
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
      cy.intercept('POST', '/api/detection_engine/rules').as('savedQueryRule');
      createAndEnableRule();
      openRuleManagementPageViaBreadcrumbs();

      cy.wait('@savedQueryRule').then(({ response }) => {
        // created rule should have saved_query type
        cy.wrap(response?.body.type).should('equal', 'saved_query');
      });

      goToRuleDetailsOf(rule.name);

      cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);

      cy.get(DEFINE_RULE_PANEL_PROGRESS).should('not.exist');

      getDetails(SAVED_QUERY_NAME_DETAILS).should('contain', savedQueryName);
      getDetails(SAVED_QUERY_DETAILS).should('contain', savedQueryQuery);
      getDetails(SAVED_QUERY_FILTERS_DETAILS).should('contain', savedQueryFilterKey);
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

      describe('on rule editing page', () => {
        beforeEach(() => {
          createRule(
            getSavedQueryRule({
              saved_id: 'non-existent',
              query: undefined,
            })
          ).then((rule) => visitEditRulePage(rule.body.id));
        });

        it('Shows validation error on rule edit when saved query can not be loaded', function () {
          cy.get(TOASTER).should('contain', FAILED_TO_LOAD_ERROR);
        });

        it('Allows to update saved_query rule with non-existent query', () => {
          cy.get(LOAD_QUERY_DYNAMICALLY_CHECKBOX).should('exist');

          cy.intercept('PUT', '/api/detection_engine/rules').as('editedRule');
          saveEditedRule();

          cy.wait('@editedRule').then(({ response }) => {
            // updated rule type shouldn't change
            cy.wrap(response?.body.type).should('equal', 'saved_query');
          });

          cy.get(DEFINE_RULE_PANEL_PROGRESS).should('not.exist');

          assertDetailsNotExist(SAVED_QUERY_NAME_DETAILS);
          assertDetailsNotExist(SAVED_QUERY_DETAILS);
        });
      });
    });

    context('Editing', () => {
      it('Allows to update query rule as saved_query rule type', () => {
        createSavedQuery(savedQueryName, savedQueryQuery);
        createRule(getNewRule()).then((rule) => visitEditRulePage(rule.body.id));

        selectAndLoadSavedQuery(savedQueryName, savedQueryQuery);
        checkLoadQueryDynamically();

        cy.intercept('PUT', '/api/detection_engine/rules').as('editedRule');
        saveEditedRule();

        cy.wait('@editedRule').then(({ response }) => {
          // updated rule should be saved as saved_query type once Load query dynamically checkbox was checked
          cy.wrap(response?.body.type).should('equal', 'saved_query');
        });

        cy.get(DEFINE_RULE_PANEL_PROGRESS).should('not.exist');

        getDetails(SAVED_QUERY_NAME_DETAILS).should('contain', savedQueryName);
        getDetails(SAVED_QUERY_DETAILS).should('contain', savedQueryQuery);
      });

      it('Allows to update saved_query rule as query rule type', () => {
        const expectedCustomTestQuery = 'random test query';
        createSavedQuery(savedQueryName, savedQueryQuery).then((response) => {
          cy.log(JSON.stringify(response.body, null, 2));
          createRule(getSavedQueryRule({ saved_id: response.body.id, query: undefined })).then(
            (rule) => visitEditRulePage(rule.body.id)
          );
        });

        // query input should be disabled and has value of saved query
        getCustomQueryInput().should('have.value', savedQueryQuery).should('be.disabled');

        // after unchecking Load Query Dynamically checkbox, query input becomes enabled, type custom query
        uncheckLoadQueryDynamically();
        getCustomQueryInput().should('be.enabled').clear().type(expectedCustomTestQuery);

        cy.intercept('PUT', '/api/detection_engine/rules').as('editedRule');
        saveEditedRule();

        cy.wait('@editedRule').then(({ response }) => {
          // updated rule should be saved as query type once Load query dynamically checkbox was unchecked
          cy.wrap(response?.body.type).should('equal', 'query');
        });

        getDetails(CUSTOM_QUERY_DETAILS).should('contain', expectedCustomTestQuery);
      });

      it('Allows to update saved_query rule with non-existent query by adding custom query', () => {
        const expectedCustomTestQuery = 'random test query';
        createRule(getSavedQueryRule({ saved_id: 'non-existent', query: undefined })).then((rule) =>
          visitEditRulePage(rule.body.id)
        );

        uncheckLoadQueryDynamically();

        // type custom query, ensure Load dynamically checkbox is absent, as rule can't be saved win non valid saved query
        getCustomQueryInput().type(expectedCustomTestQuery);
        cy.get(LOAD_QUERY_DYNAMICALLY_CHECKBOX).should('not.visible');

        cy.intercept('PUT', '/api/detection_engine/rules').as('editedRule');
        saveEditedRule();

        cy.wait('@editedRule').then(({ response }) => {
          // updated rule should be saved as query type once Load query dynamically checkbox was unchecked
          cy.wrap(response?.body.type).should('equal', 'query');
        });

        getDetails(CUSTOM_QUERY_DETAILS).should('contain', expectedCustomTestQuery);
      });

      it('Allows to update saved_query rule with non-existent query by selecting another saved query', () => {
        createSavedQuery(savedQueryName, savedQueryQuery);
        createRule(getSavedQueryRule({ saved_id: 'non-existent', query: undefined })).then((rule) =>
          visitEditRulePage(rule.body.id)
        );

        visit(RULES_MANAGEMENT_URL);

        editFirstRule();
        uncheckLoadQueryDynamically();

        // select another saved query, edit query input, which later should be dismissed once Load query dynamically checkbox checked
        selectAndLoadSavedQuery(savedQueryName, savedQueryQuery);
        getCustomQueryInput().type('AND this part wil be dismissed');

        checkLoadQueryDynamically();
        getCustomQueryInput().should('have.value', savedQueryQuery);

        cy.intercept('PUT', '/api/detection_engine/rules').as('editedRule');
        saveEditedRule();

        cy.wait('@editedRule').then(({ response }) => {
          // updated rule type shouldn't change
          cy.wrap(response?.body.type).should('equal', 'saved_query');
        });

        cy.get(DEFINE_RULE_PANEL_PROGRESS).should('not.exist');

        getDetails(SAVED_QUERY_NAME_DETAILS).should('contain', savedQueryName);
        getDetails(SAVED_QUERY_DETAILS).should('contain', savedQueryQuery);
      });
    });
  });
});
