/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_FILTER_FORM_FIELD_INPUT,
  ADD_FILTER_FORM_OPERATOR_FIELD,
  GLOBAL_SEARCH_BAR_EDIT_FILTER_MENU_ITEM,
  GLOBAL_SEARCH_BAR_FILTER_ITEM,
} from '../../../../screens/search_bar';
import { getExistingRule, getEditedRule } from '../../../../objects/rule';

import {
  ACTIONS_NOTIFY_WHEN_BUTTON,
  ACTIONS_SUMMARY_BUTTON,
} from '../../../../screens/common/rule_actions';
import {
  CUSTOM_QUERY_INPUT,
  DEFINE_INDEX_INPUT,
  DEFAULT_RISK_SCORE_INPUT,
  RULE_DESCRIPTION_INPUT,
  RULE_NAME_INPUT,
  SCHEDULE_INTERVAL_AMOUNT_INPUT,
  SCHEDULE_INTERVAL_UNITS_INPUT,
  SEVERITY_DROPDOWN,
  TAGS_CLEAR_BUTTON,
  TAGS_FIELD,
} from '../../../../screens/create_new_rule';
import {
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  INDEX_PATTERNS_DETAILS,
  INVESTIGATION_NOTES_TOGGLE,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
} from '../../../../screens/rule_details';

import { createRule } from '../../../../tasks/api_calls/rules';
import { deleteAlertsAndRules, deleteConnectors } from '../../../../tasks/api_calls/common';
import { addEmailConnectorAndRuleAction } from '../../../../tasks/common/rule_actions';
import {
  fillAboutRule,
  goToAboutStepTab,
  goToActionsStepTab,
  goToScheduleStepTab,
} from '../../../../tasks/create_new_rule';
import { saveEditedRule, visitEditRulePage } from '../../../../tasks/edit_rule';
import { login } from '../../../../tasks/login';
import { getDetails } from '../../../../tasks/rule_details';

describe('Custom query rules', { tags: ['@ess', '@serverless'] }, () => {
  const rule = getEditedRule();
  const expectedEditedtags = rule.tags?.join('');
  const expectedEditedIndexPatterns = rule.index;

  beforeEach(() => {
    deleteConnectors();
    deleteAlertsAndRules();
    login();
  });

  context('Basics', () => {
    beforeEach(() => {
      createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then((createdRule) => {
        visitEditRulePage(createdRule.body.id);
      });
    });

    it('Allows a rule to be edited', () => {
      const existingRule = getExistingRule();

      // expect define step to populate
      cy.get(CUSTOM_QUERY_INPUT).should('have.value', existingRule.query);

      cy.get(DEFINE_INDEX_INPUT).should('have.text', existingRule.index?.join(''));

      goToAboutStepTab();

      // expect about step to populate
      cy.get(RULE_NAME_INPUT).invoke('val').should('eql', existingRule.name);
      cy.get(RULE_DESCRIPTION_INPUT).should('have.text', existingRule.description);
      cy.get(TAGS_FIELD).should('have.text', existingRule.tags?.join(''));
      cy.get(SEVERITY_DROPDOWN).should('have.text', 'High');
      cy.get(DEFAULT_RISK_SCORE_INPUT).invoke('val').should('eql', `${existingRule.risk_score}`);

      goToScheduleStepTab();

      // expect schedule step to populate
      const interval = existingRule.interval;
      const intervalParts = interval != null && interval.match(/[0-9]+|[a-zA-Z]+/g);
      if (intervalParts) {
        const [amount, unit] = intervalParts;
        cy.get(SCHEDULE_INTERVAL_AMOUNT_INPUT).invoke('val').should('eql', amount);
        cy.get(SCHEDULE_INTERVAL_UNITS_INPUT).invoke('val').should('eql', unit);
      } else {
        throw new Error('Cannot assert scheduling info on a rule without an interval');
      }

      goToActionsStepTab();

      addEmailConnectorAndRuleAction('test@example.com', 'Subject');

      cy.get(ACTIONS_SUMMARY_BUTTON).should('have.text', 'Summary of alerts');
      cy.get(ACTIONS_NOTIFY_WHEN_BUTTON).should('have.text', 'Per rule run');

      goToAboutStepTab();
      cy.get(TAGS_CLEAR_BUTTON).click();
      fillAboutRule(getEditedRule());

      cy.intercept('GET', '/api/detection_engine/rules?id*').as('getRule');

      saveEditedRule();

      cy.wait('@getRule').then(({ response }) => {
        cy.wrap(response?.statusCode).should('eql', 200);
        // ensure that editing rule does not modify max_signals
        cy.wrap(response?.body.max_signals).should('eql', existingRule.max_signals);
      });

      cy.get(RULE_NAME_HEADER).should('contain', `${getEditedRule().name}`);
      cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', getEditedRule().description);
      cy.get(ABOUT_DETAILS).within(() => {
        getDetails(SEVERITY_DETAILS).should('have.text', 'Medium');
        getDetails(RISK_SCORE_DETAILS).should('have.text', `${getEditedRule().risk_score}`);
        getDetails(TAGS_DETAILS).should('have.text', expectedEditedtags);
      });
      cy.get(INVESTIGATION_NOTES_TOGGLE).click();
      cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', getEditedRule().note);
      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(INDEX_PATTERNS_DETAILS).should(
          'have.text',
          expectedEditedIndexPatterns?.join('')
        );
        getDetails(CUSTOM_QUERY_DETAILS).should('have.text', getEditedRule().query);
        getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
        getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
      });
      if (getEditedRule().interval) {
        cy.get(SCHEDULE_DETAILS).within(() => {
          getDetails(RUNS_EVERY_DETAILS).should('have.text', getEditedRule().interval);
        });
      }
    });
  });

  context('With filters', () => {
    beforeEach(() => {
      createRule(
        getExistingRule({
          rule_id: 'rule1',
          enabled: true,
          filters: [
            {
              meta: {
                disabled: false,
                negate: false,
                alias: null,
                index: expectedEditedIndexPatterns?.join(','),
                key: 'host.name',
                field: 'host.name',
                type: 'exists',
                value: 'exists',
              },
              query: {
                exists: {
                  field: 'host.name',
                },
              },
              $state: {
                store: 'appState',
              },
            },
          ],
        })
      ).then((createdRule) => {
        visitEditRulePage(createdRule.body.id);
      });
    });

    it('Filter properly stores index information', () => {
      // Check that filter exists on rule edit page
      cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('have.text', 'host.name: exists');

      // Edit the filter
      cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).click();
      cy.get(GLOBAL_SEARCH_BAR_EDIT_FILTER_MENU_ITEM).click();

      // Check that correct values are propagated in the filter editing dialog
      cy.get(ADD_FILTER_FORM_FIELD_INPUT).should('have.value', 'host.name');
      cy.get(ADD_FILTER_FORM_OPERATOR_FIELD).should('have.value', 'exists');
    });
  });
});
