/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleFields } from '../../../data/detection_engine';
import {
  getNewRule,
  getExistingRule,
  getEditedRule,
  getNewOverrideRule,
} from '../../../objects/rule';
import { getTimeline } from '../../../objects/timeline';
import { ALERTS_COUNT, ALERT_GRID_CELL } from '../../../screens/alerts';

import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULES_MANAGEMENT_TABLE,
  RULE_SWITCH,
  SEVERITY,
} from '../../../screens/alerts_detection_rules';
import {
  ACTIONS_NOTIFY_WHEN_BUTTON,
  ACTIONS_SUMMARY_BUTTON,
} from '../../../screens/common/rule_actions';
import {
  ABOUT_CONTINUE_BTN,
  ABOUT_EDIT_BUTTON,
  CUSTOM_QUERY_INPUT,
  DEFINE_CONTINUE_BUTTON,
  DEFINE_EDIT_BUTTON,
  DEFINE_INDEX_INPUT,
  DEFAULT_RISK_SCORE_INPUT,
  RULE_DESCRIPTION_INPUT,
  RULE_NAME_INPUT,
  SCHEDULE_INTERVAL_AMOUNT_INPUT,
  SCHEDULE_INTERVAL_UNITS_INPUT,
  SCHEDULE_CONTINUE_BUTTON,
  SEVERITY_DROPDOWN,
  TAGS_CLEAR_BUTTON,
  TAGS_FIELD,
} from '../../../screens/create_new_rule';
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
  REFERENCE_URLS_DETAILS,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
  THREAT_TACTIC,
  THREAT_TECHNIQUE,
  THREAT_SUBTECHNIQUE,
} from '../../../screens/rule_details';

import {
  deleteFirstRule,
  deleteRuleFromDetailsPage,
  expectManagementTableRules,
  getRulesManagementTableRows,
  goToRuleDetailsOf,
  selectRulesByName,
} from '../../../tasks/alerts_detection_rules';
import { deleteSelectedRules } from '../../../tasks/rules_bulk_actions';
import { createRule, findAllRules } from '../../../tasks/api_calls/rules';
import { createTimeline } from '../../../tasks/api_calls/timelines';
import { deleteAlertsAndRules, deleteConnectors } from '../../../tasks/common';
import { addEmailConnectorAndRuleAction } from '../../../tasks/common/rule_actions';
import {
  createAndEnableRule,
  expandAdvancedSettings,
  fillAboutRule,
  fillDescription,
  fillFalsePositiveExamples,
  fillFrom,
  fillNote,
  fillReferenceUrls,
  fillRiskScore,
  fillRuleName,
  fillRuleTags,
  fillSeverity,
  fillThreat,
  fillThreatSubtechnique,
  fillThreatTechnique,
  goToAboutStepTab,
  goToActionsStepTab,
  goToScheduleStepTab,
  importSavedQuery,
  waitForAlertsToPopulate,
} from '../../../tasks/create_new_rule';
import { saveEditedRule } from '../../../tasks/edit_rule';
import {
  login,
  visit,
  visitSecurityDetectionRulesPage,
  visitWithoutDateRange,
} from '../../../tasks/login';
import { enablesRule, getDetails, waitForTheRuleToBeExecuted } from '../../../tasks/rule_details';
import { ruleDetailsUrl, ruleEditUrl, RULE_CREATION } from '../../../urls/navigation';

describe('Custom query rules', { tags: ['@ess', '@brokenInServerless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
  });

  describe('Custom detection rules creation', () => {
    beforeEach(() => {
      createTimeline(getTimeline())
        .then((response) => {
          return response.body.data.persistTimeline.timeline.savedObjectId;
        })
        .as('timelineId');
      login();
    });

    it('Creates and enables a new rule', function () {
      visit(RULE_CREATION);

      cy.log('Filling define section');
      importSavedQuery(this.timelineId);
      cy.get(DEFINE_CONTINUE_BUTTON).click();

      cy.log('Filling about section');
      fillRuleName('Test Rule');
      fillDescription();
      fillSeverity();
      fillRiskScore();
      fillRuleTags();
      expandAdvancedSettings();
      fillReferenceUrls();
      fillFalsePositiveExamples();
      fillThreat();
      fillThreatTechnique();
      fillThreatSubtechnique();
      fillNote();
      cy.get(ABOUT_CONTINUE_BTN).click();

      cy.log('Filling schedule section');
      fillFrom();

      // expect define step to repopulate
      cy.get(DEFINE_EDIT_BUTTON).click();
      cy.get(CUSTOM_QUERY_INPUT).should('have.value', ruleFields.ruleQuery);
      cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click();

      // expect about step to populate
      cy.get(ABOUT_EDIT_BUTTON).click();
      cy.get(RULE_NAME_INPUT).invoke('val').should('eql', ruleFields.ruleName);
      cy.get(ABOUT_CONTINUE_BTN).should('exist').click();
      cy.get(SCHEDULE_CONTINUE_BUTTON).click();

      createAndEnableRule();

      cy.log('Asserting we have a new rule created');
      cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

      cy.log('Asserting rule view in rules list');
      expectManagementTableRules(['Test Rule']);
      cy.get(RULE_NAME).should('have.text', ruleFields.ruleName);
      cy.get(RISK_SCORE).should('have.text', ruleFields.riskScore);
      cy.get(SEVERITY)
        .invoke('text')
        .then((text) => {
          cy.wrap(text.toLowerCase()).should('equal', ruleFields.ruleSeverity);
        });
      cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

      goToRuleDetailsOf(ruleFields.ruleName);

      cy.log('Asserting rule details');
      cy.get(RULE_NAME_HEADER).should('contain', ruleFields.ruleName);
      cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', ruleFields.ruleDescription);
      cy.get(ABOUT_DETAILS).within(() => {
        getDetails(SEVERITY_DETAILS)
          .invoke('text')
          .then((text) => {
            cy.wrap(text.toLowerCase()).should('equal', ruleFields.ruleSeverity);
          });
        getDetails(RISK_SCORE_DETAILS).should('have.text', ruleFields.riskScore);
        getDetails(REFERENCE_URLS_DETAILS).should((details) => {
          expect(removeExternalLinkText(details.text())).equal(ruleFields.referenceUrls.join(''));
        });
        getDetails(FALSE_POSITIVES_DETAILS).should('have.text', ruleFields.falsePositives.join(''));
        getDetails(TAGS_DETAILS).should('have.text', ruleFields.ruleTags.join(''));
      });
      cy.get(THREAT_TACTIC).should(
        'contain',
        `${ruleFields.threat.tactic.name} (${ruleFields.threat.tactic.id})`
      );
      cy.get(THREAT_TECHNIQUE).should(
        'contain',
        `${ruleFields.threatTechnique.name} (${ruleFields.threatTechnique.id})`
      );
      cy.get(THREAT_SUBTECHNIQUE).should(
        'contain',
        `${ruleFields.threatSubtechnique.name} (${ruleFields.threatSubtechnique.id})`
      );
      cy.get(INVESTIGATION_NOTES_TOGGLE).click();
      cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', INVESTIGATION_NOTES_MARKDOWN);
      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(INDEX_PATTERNS_DETAILS).should('have.text', 'auditbeat-*');
        getDetails(CUSTOM_QUERY_DETAILS).should('have.text', ruleFields.ruleQuery);
        getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
        getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
      });
      cy.get(SCHEDULE_DETAILS).within(() => {
        getDetails(RUNS_EVERY_DETAILS).should('have.text', ruleFields.ruleInterval);
        getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should('have.text', ruleFields.ruleIntervalFrom);
      });

      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();

      cy.log('Asserting that alerts have been generated after the creation');
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .should('match', /^[1-9].+$/); // Any number of alerts
      cy.get(ALERT_GRID_CELL).contains(ruleFields.ruleName);
    });
  });

  describe('Custom detection rules deletion and edition', () => {
    context('Deletion', () => {
      const TESTED_RULE_DATA = getNewRule({
        rule_id: 'rule1',
        name: 'New Rule Test',
        enabled: false,
        max_signals: 500,
      });

      beforeEach(() => {
        createRule(TESTED_RULE_DATA);
        createRule(
          getNewOverrideRule({
            rule_id: 'rule2',
            name: 'Override Rule',
            enabled: false,
            max_signals: 500,
          })
        );
        createRule(getExistingRule({ rule_id: 'rule3', name: 'Rule 1', enabled: false }));
        login();
        visitSecurityDetectionRulesPage();
      });

      it('Deletes one rule', () => {
        getRulesManagementTableRows().then((rules) => {
          const initialNumberOfRules = rules.length;
          const expectedNumberOfRulesAfterDeletion = initialNumberOfRules - 1;

          findAllRules().then(({ body }) => {
            const numberOfRules = body.data.length;
            expect(numberOfRules).to.eql(initialNumberOfRules);
          });

          deleteFirstRule();

          getRulesManagementTableRows().should('have.length', expectedNumberOfRulesAfterDeletion);
          findAllRules().then(({ body }) => {
            const numberOfRules = body.data.length;
            expect(numberOfRules).to.eql(expectedNumberOfRulesAfterDeletion);
          });
          cy.get(CUSTOM_RULES_BTN).should(
            'have.text',
            `Custom rules (${expectedNumberOfRulesAfterDeletion})`
          );
        });
      });

      it('Deletes more than one rule', () => {
        getRulesManagementTableRows().then((rules) => {
          const rulesToDelete = [TESTED_RULE_DATA.name, 'Override Rule'] as const;
          const initialNumberOfRules = rules.length;
          const numberOfRulesToBeDeleted = 2;
          const expectedNumberOfRulesAfterDeletion =
            initialNumberOfRules - numberOfRulesToBeDeleted;

          selectRulesByName(rulesToDelete);
          deleteSelectedRules();

          getRulesManagementTableRows()
            .first()
            .within(() => {
              cy.get(RULE_SWITCH).should('not.exist');
            });

          getRulesManagementTableRows().should('have.length', expectedNumberOfRulesAfterDeletion);
          findAllRules().then(({ body }) => {
            const numberOfRules = body.data.length;
            expect(numberOfRules).to.eql(expectedNumberOfRulesAfterDeletion);
          });
          getRulesManagementTableRows()
            .first()
            .within(() => {
              cy.get(RULE_SWITCH).should('exist');
            });
          cy.get(CUSTOM_RULES_BTN).should(
            'have.text',
            `Custom rules (${expectedNumberOfRulesAfterDeletion})`
          );
        });
      });

      it('Deletes one rule from detail page', () => {
        getRulesManagementTableRows().then((rules) => {
          const initialNumberOfRules = rules.length;
          const expectedNumberOfRulesAfterDeletion = initialNumberOfRules - 1;

          goToRuleDetailsOf(TESTED_RULE_DATA.name);
          cy.intercept('POST', '/api/detection_engine/rules/_bulk_delete').as('deleteRule');

          deleteRuleFromDetailsPage();

          // @ts-expect-error update types
          cy.waitFor('@deleteRule').then(() => {
            cy.get(RULES_MANAGEMENT_TABLE).should('exist');
            getRulesManagementTableRows().should('have.length', expectedNumberOfRulesAfterDeletion);
            findAllRules().then(({ body }) => {
              const numberOfRules = body.data.length;
              expect(numberOfRules).to.eql(expectedNumberOfRulesAfterDeletion);
            });
            cy.get(CUSTOM_RULES_BTN).should(
              'have.text',
              `Custom rules (${expectedNumberOfRulesAfterDeletion})`
            );
          });
        });
      });
    });

    context('Edition', () => {
      const editedRuleData = getEditedRule();
      const expectedEditedTags = editedRuleData.tags?.join('');
      const expectedEditedIndexPatterns = editedRuleData.index;

      describe('on rule details page', () => {
        beforeEach(() => {
          deleteConnectors();
          login();
          createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then((rule) =>
            visitWithoutDateRange(ruleDetailsUrl(rule.body.id))
          );
        });

        it('Only modifies rule active status on enable/disable', () => {
          enablesRule();

          cy.intercept('GET', `/api/detection_engine/rules?id=*`).as('fetchRuleDetails');

          cy.wait('@fetchRuleDetails').then(({ response }) => {
            cy.wrap(response?.statusCode).should('eql', 200);

            cy.wrap(response?.body.max_signals).should('eql', getExistingRule().max_signals);
            cy.wrap(response?.body.enabled).should('eql', false);
          });
        });
      });

      describe('on rule editing page', () => {
        beforeEach(() => {
          deleteConnectors();
          login();
          createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then((rule) =>
            visitWithoutDateRange(ruleEditUrl(rule.body.id))
          );
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
          cy.get(DEFAULT_RISK_SCORE_INPUT)
            .invoke('val')
            .should('eql', `${existingRule.risk_score}`);

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
            getDetails(TAGS_DETAILS).should('have.text', expectedEditedTags);
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
    });
  });
});
