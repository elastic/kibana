/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule, getSavedQueryRule } from '../../../../objects/rule';

import { LOAD_QUERY_DYNAMICALLY_CHECKBOX } from '../../../../screens/create_new_rule';
import { TOASTER } from '../../../../screens/alerts_detection_rules';
import {
  SAVED_QUERY_NAME_DETAILS,
  SAVED_QUERY_DETAILS,
  DEFINE_RULE_PANEL_PROGRESS,
  CUSTOM_QUERY_DETAILS,
} from '../../../../screens/rule_details';

import { editFirstRule } from '../../../../tasks/alerts_detection_rules';
import { createSavedQuery, deleteSavedQueries } from '../../../../tasks/api_calls/saved_queries';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  selectAndLoadSavedQuery,
  getCustomQueryInput,
  checkLoadQueryDynamically,
  uncheckLoadQueryDynamically,
} from '../../../../tasks/create_new_rule';
import { saveEditedRule, visitEditRulePage } from '../../../../tasks/edit_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { assertDetailsNotExist, getDetails } from '../../../../tasks/rule_details';
import { createRule } from '../../../../tasks/api_calls/rules';
import { RULES_MANAGEMENT_URL } from '../../../../urls/rules_management';

const savedQueryName = 'custom saved query';
const savedQueryQuery = 'process.name: test';

describe('Saved query rules, rule edit', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    deleteSavedQueries();
  });

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
      createRule(getSavedQueryRule({ saved_id: response.body.id, query: undefined })).then((rule) =>
        visitEditRulePage(rule.body.id)
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

  context('Non existent saved query', () => {
    const FAILED_TO_LOAD_ERROR = 'Failed to load the saved query';

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

    // https://github.com/elastic/kibana/issues/187623
    it(
      'Allows to update saved_query rule with non-existent query',
      { tags: ['@skipInServerlessMKI'] },
      () => {
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
      }
    );
  });
});
