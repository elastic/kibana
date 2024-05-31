/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMitreAttackDescription, getHumanizedDuration } from '../../../../helpers/rules';
import { getDataViewRule } from '../../../../objects/rule';
import { ALERTS_COUNT, ALERT_GRID_CELL } from '../../../../screens/alerts';

import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULE_SWITCH,
  SEVERITY,
} from '../../../../screens/alerts_detection_rules';
import {
  ABOUT_CONTINUE_BTN,
  RULE_DESCRIPTION_INPUT,
  RULE_NAME_INPUT,
} from '../../../../screens/create_new_rule';

import {
  ADDITIONAL_LOOK_BACK_DETAILS,
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  FALSE_POSITIVES_DETAILS,
  removeExternalLinkText,
  INDEX_PATTERNS_DETAILS,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  MITRE_ATTACK_DETAILS,
  REFERENCE_URLS_DETAILS,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
  DATA_VIEW_DETAILS,
  EDIT_RULE_SETTINGS_LINK,
  INTERVAL_ABBR_VALUE,
} from '../../../../screens/rule_details';
import { GLOBAL_SEARCH_BAR_FILTER_ITEM } from '../../../../screens/search_bar';

import {
  getRulesManagementTableRows,
  goToRuleDetailsOf,
} from '../../../../tasks/alerts_detection_rules';
import {
  deleteAlertsAndRules,
  deleteDataView,
  postDataView,
} from '../../../../tasks/api_calls/common';
import {
  createAndEnableRule,
  createRuleWithoutEnabling,
  fillAboutRuleAndContinue,
  fillDefineCustomRule,
  fillDefineCustomRuleAndContinue,
  fillScheduleRuleAndContinue,
  openAddFilterPopover,
  waitForAlertsToPopulate,
} from '../../../../tasks/create_new_rule';

import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { openRuleManagementPageViaBreadcrumbs } from '../../../../tasks/rules_management';
import { getDetails, waitForTheRuleToBeExecuted } from '../../../../tasks/rule_details';
import { fillAddFilterForm } from '../../../../tasks/search_bar';

import { CREATE_RULE_URL } from '../../../../urls/navigation';

describe('Custom query rules', { tags: ['@ess', '@serverless'] }, () => {
  describe('Custom detection rules creation with data views', () => {
    const rule = getDataViewRule();
    const expectedUrls = rule.references?.join('');
    const expectedFalsePositives = rule.false_positives?.join('');
    const expectedTags = rule.tags?.join('');
    const mitreAttack = rule.threat;
    const expectedMitre = formatMitreAttackDescription(mitreAttack ?? []);
    const expectedNumberOfRules = 1;

    beforeEach(() => {
      if (rule.data_view_id != null) {
        postDataView(rule.data_view_id);
      }
      deleteAlertsAndRules();
      login();
    });

    afterEach(() => {
      if (rule.data_view_id != null) {
        deleteDataView(rule.data_view_id);
      }
    });

    it('Creates and enables a new rule', function () {
      visit(CREATE_RULE_URL);
      fillDefineCustomRuleAndContinue(rule);
      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      createAndEnableRule();
      openRuleManagementPageViaBreadcrumbs();

      cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

      getRulesManagementTableRows().should('have.length', expectedNumberOfRules);
      cy.get(RULE_NAME).should('have.text', rule.name);
      cy.get(RISK_SCORE).should('have.text', rule.risk_score);
      cy.get(SEVERITY).should('have.text', 'High');
      cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

      goToRuleDetailsOf(rule.name);

      cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);
      cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', rule.description);
      cy.get(ABOUT_DETAILS).within(() => {
        getDetails(SEVERITY_DETAILS).should('have.text', 'High');
        getDetails(RISK_SCORE_DETAILS).should('have.text', rule.risk_score);
        getDetails(REFERENCE_URLS_DETAILS).should((details) => {
          expect(removeExternalLinkText(details.text())).equal(expectedUrls);
        });
        getDetails(FALSE_POSITIVES_DETAILS).should('have.text', expectedFalsePositives);
        getDetails(MITRE_ATTACK_DETAILS).should((mitre) => {
          expect(removeExternalLinkText(mitre.text())).equal(expectedMitre);
        });
        getDetails(TAGS_DETAILS).should('have.text', expectedTags);
      });
      cy.get(INVESTIGATION_NOTES_TOGGLE).click();
      cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', INVESTIGATION_NOTES_MARKDOWN);
      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(DATA_VIEW_DETAILS).should('have.text', rule.data_view_id);
        getDetails(CUSTOM_QUERY_DETAILS).should('have.text', rule.query);
        getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
        getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
      });
      cy.get(DEFINITION_DETAILS).should('not.contain', INDEX_PATTERNS_DETAILS);
      cy.get(SCHEDULE_DETAILS).within(() => {
        getDetails(RUNS_EVERY_DETAILS)
          .find(INTERVAL_ABBR_VALUE)
          .should('have.text', `${rule.interval}`);
        const humanizedDuration = getHumanizedDuration(
          rule.from ?? 'now-6m',
          rule.interval ?? '5m'
        );
        getDetails(ADDITIONAL_LOOK_BACK_DETAILS)
          .find(INTERVAL_ABBR_VALUE)
          .should('have.text', `${humanizedDuration}`);
      });

      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();

      cy.get(ALERTS_COUNT)
        .invoke('text')
        .should('match', /^[1-9].+$/);
      cy.get(ALERT_GRID_CELL).contains(rule.name);
    });

    it('Creates and edits a new rule with a data view', function () {
      visit(CREATE_RULE_URL);
      fillDefineCustomRuleAndContinue(rule);
      cy.get(RULE_NAME_INPUT).clear();
      cy.get(RULE_NAME_INPUT).type(rule.name);
      cy.get(RULE_DESCRIPTION_INPUT).clear();
      cy.get(RULE_DESCRIPTION_INPUT).type(rule.description);

      cy.get(ABOUT_CONTINUE_BTN).should('exist').click();

      fillScheduleRuleAndContinue(rule);
      createRuleWithoutEnabling();
      openRuleManagementPageViaBreadcrumbs();

      goToRuleDetailsOf(rule.name);

      cy.get(EDIT_RULE_SETTINGS_LINK).click();

      cy.get(RULE_NAME_HEADER).should('contain', 'Edit rule settings');
    });

    it('Adds filter on define step', () => {
      visit(CREATE_RULE_URL);
      fillDefineCustomRule(rule);
      openAddFilterPopover();
      fillAddFilterForm({
        key: 'host.name',
        operator: 'exists',
      });
      // Check that newly added filter exists
      cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('have.text', 'host.name: exists');
    });
  });
});
