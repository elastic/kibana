/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASES_CONNECTOR_GROUP_BY_ALERT_FIELD_OPTIONS_LIST,
  CASES_CONNECTOR_GROUP_BY_ALERT_FIELD_SELECTOR,
} from '../../../../screens/common/rule_actions';
import { RULE_NAME_HEADER } from '../../../../screens/rule_details';
import { getIndexConnector } from '../../../../objects/connector';
import { getSimpleCustomQueryRule } from '../../../../objects/rule';

import { goToRuleDetailsOf } from '../../../../tasks/alerts_detection_rules';
import {
  deleteIndex,
  waitForNewDocumentToBeIndexed,
} from '../../../../tasks/api_calls/elasticsearch';
import {
  deleteAlertsAndRules,
  deleteConnectors,
  deleteDataView,
} from '../../../../tasks/api_calls/common';
import {
  createAndEnableRule,
  createCasesAction,
  fillAboutRuleAndContinue,
  fillDefineCustomRuleAndContinue,
  fillRuleAction,
  fillRuleActionFilters,
  fillScheduleRuleAndContinue,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { openRuleManagementPageViaBreadcrumbs } from '../../../../tasks/rules_management';
import { CREATE_RULE_URL } from '../../../../urls/navigation';

// TODO: https://github.com/elastic/kibana/issues/161539
describe(
  'Rule actions during detection rule creation',
  { tags: ['@ess', '@serverless', '@skipInServerless'] },
  () => {
    const indexConnector = getIndexConnector();

    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      deleteConnectors();
      deleteIndex(indexConnector.index);
      deleteDataView(indexConnector.index);
    });

    const rule = getSimpleCustomQueryRule();
    const actions = { connectors: [indexConnector] };
    const index = actions.connectors[0].index;
    const initialNumberOfDocuments = 0;
    const expectedJson = JSON.parse(actions.connectors[0].document);

    it('Indexes a new document after the index action is triggered', function () {
      visit(CREATE_RULE_URL);
      fillDefineCustomRuleAndContinue(rule);
      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      fillRuleAction(actions);
      createAndEnableRule();
      openRuleManagementPageViaBreadcrumbs();

      goToRuleDetailsOf(rule.name);

      /* When the rule is executed, the action is triggered. We wait for the new document to be indexed */
      waitForNewDocumentToBeIndexed(index, initialNumberOfDocuments);

      /* We assert that the new indexed document is the one set on the index action */
      cy.request({
        method: 'GET',
        url: `${Cypress.env('ELASTICSEARCH_URL')}/${index}/_search`,
        headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
      }).then((response) => {
        expect(response.body.hits.hits[0]._source).to.deep.equal(expectedJson);
      });
    });

    it('Allows adding alerts filters for the action', function () {
      visit(CREATE_RULE_URL);
      fillDefineCustomRuleAndContinue(rule);
      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      fillRuleAction(actions);

      // Fill out action filters
      const alertsFilter = {
        timeframe: {
          days: [1, 3],
          timezone: 'CET',
          hours: {
            start: '08:30',
            end: '15:30',
          },
        },
        query: {
          kql: 'process.name : *',
        },
      };
      fillRuleActionFilters(alertsFilter);

      // Create the rule
      createAndEnableRule();

      // UI redirects to rule creation page of a created rule
      cy.get(RULE_NAME_HEADER).should('contain', rule.name);
    });

    it('Forwards the correct rule type id to the Cases system action', () => {
      cy.intercept('GET', '/internal/data_views/fields*').as('getAlertsFields');
      visit(CREATE_RULE_URL);
      fillDefineCustomRuleAndContinue(rule);
      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      createCasesAction();

      cy.wait('@getAlertsFields', { timeout: 10000 });
      cy.get(CASES_CONNECTOR_GROUP_BY_ALERT_FIELD_SELECTOR).within(() => {
        cy.get('[data-test-subj=comboBoxToggleListButton]').click();
      });
      cy.get(CASES_CONNECTOR_GROUP_BY_ALERT_FIELD_OPTIONS_LIST).should('be.visible');
      cy.get(`${CASES_CONNECTOR_GROUP_BY_ALERT_FIELD_OPTIONS_LIST} button[role=option]`).then(
        ($items) => $items.length > 0
      );
    });
  }
);
