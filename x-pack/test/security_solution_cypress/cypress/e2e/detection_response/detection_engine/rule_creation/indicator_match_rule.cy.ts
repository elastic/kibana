/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMitreAttackDescription, getHumanizedDuration } from '../../../../helpers/rules';
import {
  getIndexPatterns,
  getNewThreatIndicatorRule,
  getThreatIndexPatterns,
  indicatorRuleMatchingDoc,
} from '../../../../objects/rule';

import {
  ALERT_RISK_SCORE,
  ALERT_RULE_NAME,
  ALERT_SEVERITY,
  ALERTS_COUNT,
} from '../../../../screens/alerts';
import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULE_SWITCH,
  RULES_MANAGEMENT_TABLE,
  SEVERITY,
} from '../../../../screens/alerts_detection_rules';
import {
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  ADDITIONAL_LOOK_BACK_DETAILS,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  FALSE_POSITIVES_DETAILS,
  INDEX_PATTERNS_DETAILS,
  INDICATOR_INDEX_PATTERNS,
  INDICATOR_INDEX_QUERY,
  INDICATOR_MAPPING,
  INDICATOR_PREFIX_OVERRIDE,
  INTERVAL_ABBR_VALUE,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  MITRE_ATTACK_DETAILS,
  REFERENCE_URLS_DETAILS,
  removeExternalLinkText,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
} from '../../../../screens/rule_details';
import { INDICATOR_MATCH_ROW_RENDER, PROVIDER_BADGE } from '../../../../screens/timeline';
import { investigateFirstAlertInTimeline } from '../../../../tasks/alerts';
import {
  checkDuplicatedRule,
  disableAutoRefresh,
  duplicateFirstRule,
  duplicateRuleFromMenu,
  expectNumberOfRules,
  goToRuleDetailsOf,
  selectAllRules,
} from '../../../../tasks/alerts_detection_rules';
import { duplicateSelectedRulesWithExceptions } from '../../../../tasks/rules_bulk_actions';
import { createRule } from '../../../../tasks/api_calls/rules';
import { loadPrepackagedTimelineTemplates } from '../../../../tasks/api_calls/timelines';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillDefineIndicatorMatchRuleAndContinue,
  fillIndexAndIndicatorIndexPattern,
  fillIndicatorMatchRow,
  fillScheduleRuleAndContinue,
  getCustomIndicatorQueryInput,
  getCustomQueryInput,
  getCustomQueryInvalidationText,
  getDefineContinueButton,
  getIndexPatternClearButton,
  getIndexPatternInvalidationText,
  getIndicatorAndButton,
  getIndicatorAtLeastOneInvalidationText,
  getIndicatorDeleteButton,
  getIndicatorIndexComboField,
  getIndicatorIndicatorIndex,
  getIndicatorInvalidationText,
  getIndicatorMappingComboField,
  getIndicatorOrButton,
  getRuleIndexInput,
  getThreatMatchQueryInvalidationText,
  selectIndicatorMatchType,
  waitForAlertsToPopulate,
} from '../../../../tasks/create_new_rule';
import {
  SCHEDULE_INTERVAL_AMOUNT_INPUT,
  SCHEDULE_INTERVAL_UNITS_INPUT,
  SCHEDULE_LOOKBACK_AMOUNT_INPUT,
  SCHEDULE_LOOKBACK_UNITS_INPUT,
} from '../../../../screens/create_new_rule';
import { goBackToRuleDetails } from '../../../../tasks/edit_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import {
  getDetails,
  goBackToRulesTable,
  visitRuleDetailsPage,
  waitForTheRuleToBeExecuted,
} from '../../../../tasks/rule_details';
import { CREATE_RULE_URL } from '../../../../urls/navigation';
import { RULES_MANAGEMENT_URL } from '../../../../urls/rules_management';
import { openRuleManagementPageViaBreadcrumbs } from '../../../../tasks/rules_management';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

const DEFAULT_THREAT_MATCH_QUERY = '@timestamp >= "now-30d/d"';

// Skipping in MKI due to flake
describe('indicator match', { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] }, () => {
  describe('Detection rules, Indicator Match', () => {
    const expectedUrls = getNewThreatIndicatorRule().references?.join('');
    const expectedFalsePositives = getNewThreatIndicatorRule().false_positives?.join('');
    const expectedTags = getNewThreatIndicatorRule().tags?.join('');
    const mitreAttack = getNewThreatIndicatorRule().threat;
    const expectedMitre = formatMitreAttackDescription(mitreAttack ?? []);
    const expectedNumberOfRules = 1;
    const expectedNumberOfAlerts = '1 alert';

    beforeEach(() => {
      cy.task('esArchiverLoad', { archiveName: 'threat_indicator' });
      cy.task('esArchiverLoad', { archiveName: 'suspicious_source_event' });
      deleteAlertsAndRules();
      login();
    });

    describe('Creating new indicator match rules', () => {
      describe('Index patterns', () => {
        beforeEach(() => {
          visit(CREATE_RULE_URL);
          selectIndicatorMatchType();
        });

        it('Contains a predefined index pattern', () => {
          getRuleIndexInput().should('have.text', getIndexPatterns().join(''));
        });

        it('Does NOT show invalidation text on initial page load if indicator index pattern is filled out', () => {
          getDefineContinueButton().click();
          getIndexPatternInvalidationText().should('not.exist');
        });

        it('Shows invalidation text when you try to continue without filling it out', () => {
          getIndexPatternClearButton().click();
          getIndicatorIndicatorIndex().type(`{backspace}{enter}`);
          getDefineContinueButton().click();
          getIndexPatternInvalidationText().should('exist');
        });
      });

      describe('Indicator index patterns', () => {
        beforeEach(() => {
          visit(CREATE_RULE_URL);
          selectIndicatorMatchType();
        });

        it('Contains a predefined index pattern', () => {
          getIndicatorIndicatorIndex().should('have.text', getThreatIndexPatterns().join(''));
        });

        it('Does NOT show invalidation text on initial page load', () => {
          getIndexPatternInvalidationText().should('not.exist');
        });

        it('Shows invalidation text if you try to continue without filling it out', () => {
          getIndicatorIndicatorIndex().type(`{backspace}{enter}`);
          getDefineContinueButton().click();
          getIndexPatternInvalidationText().should('exist');
        });
      });

      describe('custom query input', () => {
        beforeEach(() => {
          visit(CREATE_RULE_URL);
          selectIndicatorMatchType();
        });

        it('Has a default set of *:*', () => {
          getCustomQueryInput().should('have.text', '*:*');
        });

        it('Shows invalidation text if text is removed', () => {
          getCustomQueryInput().type('{selectall}{del}');
          getCustomQueryInvalidationText().should('exist');
        });
      });

      describe('indicator query input', () => {
        beforeEach(() => {
          visit(CREATE_RULE_URL);
          selectIndicatorMatchType();
        });

        it(`Has a default set of ${DEFAULT_THREAT_MATCH_QUERY}`, () => {
          getCustomIndicatorQueryInput().should('have.text', DEFAULT_THREAT_MATCH_QUERY);
        });

        it('Shows invalidation text if text is removed', () => {
          getCustomIndicatorQueryInput().type('{selectall}{del}');
          getThreatMatchQueryInvalidationText().should('exist');
        });
      });

      // FLAKY: https://github.com/elastic/kibana/issues/182669
      describe.skip('Indicator mapping', () => {
        beforeEach(() => {
          const rule = getNewThreatIndicatorRule();
          visit(CREATE_RULE_URL);
          selectIndicatorMatchType();
          if (rule.index) {
            fillIndexAndIndicatorIndexPattern(rule.index, rule.threat_index);
          }
        });

        it('Does NOT show invalidation text on initial page load', () => {
          getIndicatorInvalidationText().should('not.exist');
        });

        it('Shows invalidation text when you try to press continue without filling anything out', () => {
          getDefineContinueButton().click();
          getIndicatorAtLeastOneInvalidationText().should('exist');
        });

        it('Shows invalidation text when the "AND" button is pressed and both the mappings are blank', () => {
          getIndicatorAndButton().click();
          getIndicatorInvalidationText().should('exist');
        });

        it('Shows invalidation text when the "OR" button is pressed and both the mappings are blank', () => {
          getIndicatorOrButton().click();
          getIndicatorInvalidationText().should('exist');
        });

        it('Does NOT show invalidation text when there is a valid "index field" and a valid "indicator index field"', () => {
          fillIndicatorMatchRow({
            indexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].field,
            indicatorIndexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].value,
          });
          getDefineContinueButton().click();
          getIndicatorInvalidationText().should('not.exist');
        });

        it('Shows invalidation text when there is an invalid "index field" and a valid "indicator index field"', () => {
          fillIndicatorMatchRow({
            indexField: 'non-existent-value',
            indicatorIndexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].value,
            validColumns: 'indicatorField',
          });
          getDefineContinueButton().click();
          getIndicatorInvalidationText().should('exist');
        });

        it('Shows invalidation text when there is a valid "index field" and an invalid "indicator index field"', () => {
          fillIndicatorMatchRow({
            indexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].field,
            indicatorIndexField: 'non-existent-value',
            validColumns: 'indexField',
          });
          getDefineContinueButton().click();
          getIndicatorInvalidationText().should('exist');
        });

        it('Deletes the first row when you have two rows. Both rows valid rows of "index fields" and valid "indicator index fields". The second row should become the first row', () => {
          fillIndicatorMatchRow({
            indexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].field,
            indicatorIndexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].value,
          });
          getIndicatorAndButton().click();
          fillIndicatorMatchRow({
            rowNumber: 2,
            indexField: 'agent.name',
            indicatorIndexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].value,
            validColumns: 'indicatorField',
          });
          getIndicatorDeleteButton().click();
          getIndicatorIndexComboField().find('input').should('have.value', 'agent.name');
          getIndicatorMappingComboField()
            .find('input')
            .should('have.value', getNewThreatIndicatorRule().threat_mapping[0].entries[0].value);
          getIndicatorIndexComboField(2).should('not.exist');
          getIndicatorMappingComboField(2).should('not.exist');
        });

        it('Deletes the first row when you have two rows. Both rows have valid "index fields" and invalid "indicator index fields". The second row should become the first row', () => {
          fillIndicatorMatchRow({
            indexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].field,
            indicatorIndexField: 'non-existent-value',
            validColumns: 'indexField',
          });
          getIndicatorAndButton().click();
          fillIndicatorMatchRow({
            rowNumber: 2,
            indexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].field,
            indicatorIndexField: 'second-non-existent-value',
            validColumns: 'indexField',
          });
          getIndicatorDeleteButton().click();
          getIndicatorMappingComboField()
            .find('input')
            .should('have.value', 'second-non-existent-value');
          getIndicatorIndexComboField(2).should('not.exist');
          getIndicatorMappingComboField(2).should('not.exist');
        });

        it('Deletes the first row when you have two rows. Both rows have valid "indicator index fields" and invalid "index fields". The second row should become the first row', () => {
          fillIndicatorMatchRow({
            indexField: 'non-existent-value',
            indicatorIndexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].value,
            validColumns: 'indicatorField',
          });
          getIndicatorAndButton().click();
          fillIndicatorMatchRow({
            rowNumber: 2,
            indexField: 'second-non-existent-value',
            indicatorIndexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].value,
            validColumns: 'indicatorField',
          });
          getIndicatorDeleteButton().click();
          getIndicatorIndexComboField()
            .find('input')
            .should('have.value', 'second-non-existent-value');
          getIndicatorIndexComboField(2).should('not.exist');
          getIndicatorMappingComboField(2).should('not.exist');
        });

        it('Deletes the first row of data but not the UI elements and the text defaults back to the placeholder of Search', () => {
          fillIndicatorMatchRow({
            indexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].field,
            indicatorIndexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].value,
          });
          getIndicatorDeleteButton().click();
          getIndicatorIndexComboField()
            .find('input')
            .should('value', '')
            .should('have.attr', 'placeholder', 'Search');
          getIndicatorMappingComboField()
            .find('input')
            .should('value', '')
            .should('have.attr', 'placeholder', 'Search');
          getIndicatorIndexComboField(2).should('not.exist');
          getIndicatorMappingComboField(2).should('not.exist');
        });

        it('Deletes the second row when you have three rows. The first row is valid data, the second row is invalid data, and the third row is valid data. Third row should shift up correctly', () => {
          fillIndicatorMatchRow({
            indexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].field,
            indicatorIndexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].value,
          });
          getIndicatorAndButton().click();
          fillIndicatorMatchRow({
            rowNumber: 2,
            indexField: 'non-existent-value',
            indicatorIndexField: 'non-existent-value',
            validColumns: 'none',
          });
          getIndicatorAndButton().click();
          fillIndicatorMatchRow({
            rowNumber: 3,
            indexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].field,
            indicatorIndexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].value,
          });
          getIndicatorDeleteButton(2).click();
          getIndicatorIndexComboField(1)
            .find('input')
            .should('value', getNewThreatIndicatorRule().threat_mapping[0].entries[0].field);
          getIndicatorMappingComboField(1)
            .find('input')
            .should('value', getNewThreatIndicatorRule().threat_mapping[0].entries[0].value);
          getIndicatorIndexComboField(2)
            .find('input')
            .should('value', getNewThreatIndicatorRule().threat_mapping[0].entries[0].field);
          getIndicatorMappingComboField(2)
            .find('input')
            .should('value', getNewThreatIndicatorRule().threat_mapping[0].entries[0].value);
          getIndicatorIndexComboField(3).should('not.exist');
          getIndicatorMappingComboField(3).should('not.exist');
        });

        it('Can add two OR rows and delete the second row. The first row has invalid data and the second row has valid data. The first row is deleted and the second row shifts up correctly.', () => {
          fillIndicatorMatchRow({
            indexField: 'non-existent-value-one',
            indicatorIndexField: 'non-existent-value-two',
            validColumns: 'none',
          });
          getIndicatorOrButton().click();
          fillIndicatorMatchRow({
            rowNumber: 2,
            indexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].field,
            indicatorIndexField: getNewThreatIndicatorRule().threat_mapping[0].entries[0].value,
          });
          getIndicatorDeleteButton().click();
          getIndicatorIndexComboField()
            .find('input')
            .should('value', getNewThreatIndicatorRule().threat_mapping[0].entries[0].field);
          getIndicatorMappingComboField()
            .find('input')
            .should('value', getNewThreatIndicatorRule().threat_mapping[0].entries[0].value);
          getIndicatorIndexComboField(2).should('not.exist');
          getIndicatorMappingComboField(2).should('not.exist');
        });
      });

      describe('Schedule', () => {
        it('IM rule has 1h time interval and lookback by default', () => {
          visit(CREATE_RULE_URL);
          selectIndicatorMatchType();
          fillDefineIndicatorMatchRuleAndContinue(getNewThreatIndicatorRule());
          fillAboutRuleAndContinue(getNewThreatIndicatorRule());

          cy.get(SCHEDULE_INTERVAL_AMOUNT_INPUT).invoke('val').should('eql', '1');
          cy.get(SCHEDULE_INTERVAL_UNITS_INPUT).invoke('val').should('eql', 'h');
          cy.get(SCHEDULE_LOOKBACK_AMOUNT_INPUT).invoke('val').should('eql', '5');
          cy.get(SCHEDULE_LOOKBACK_UNITS_INPUT).invoke('val').should('eql', 'm');
        });
      });
    });

    describe('Generating signals', () => {
      it('Creates and enables a new Indicator Match rule', () => {
        const rule = getNewThreatIndicatorRule();
        visit(CREATE_RULE_URL);
        selectIndicatorMatchType();
        fillDefineIndicatorMatchRuleAndContinue(rule);
        fillAboutRuleAndContinue(rule);
        fillScheduleRuleAndContinue(rule);
        createAndEnableRule();
        openRuleManagementPageViaBreadcrumbs();

        cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

        expectNumberOfRules(RULES_MANAGEMENT_TABLE, expectedNumberOfRules);

        cy.get(RULE_NAME).should('have.text', rule.name);
        cy.get(RISK_SCORE).should('have.text', rule.risk_score);
        cy.get(SEVERITY).should('have.text', 'Critical');
        cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

        goToRuleDetailsOf(rule.name);

        cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);
        cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', rule.description);
        cy.get(ABOUT_DETAILS).within(() => {
          getDetails(SEVERITY_DETAILS).should('have.text', 'Critical');
          getDetails(RISK_SCORE_DETAILS).should('have.text', rule.risk_score);
          getDetails(INDICATOR_PREFIX_OVERRIDE).should('have.text', rule.threat_indicator_path);
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
          if (rule.index) {
            getDetails(INDEX_PATTERNS_DETAILS).should('have.text', rule.index.join(''));
          }
          getDetails(CUSTOM_QUERY_DETAILS).should('have.text', '*:*');
          getDetails(RULE_TYPE_DETAILS).should('have.text', 'Indicator Match');
          getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
          getDetails(INDICATOR_INDEX_PATTERNS).should('have.text', rule.threat_index.join(''));
          getDetails(INDICATOR_MAPPING).should(
            'have.text',
            `${rule.threat_mapping[0].entries[0].field} MATCHES ${rule.threat_mapping[0].entries[0].value}`
          );
          getDetails(INDICATOR_INDEX_QUERY).should('have.text', '*:*');
        });

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

        cy.get(ALERTS_COUNT).should('have.text', expectedNumberOfAlerts);
        cy.get(ALERT_RULE_NAME).first().should('have.text', rule.name);
        cy.get(ALERT_SEVERITY).first().should('have.text', rule.severity?.toLowerCase());
        cy.get(ALERT_RISK_SCORE).first().should('have.text', rule.risk_score);
      });

      it('Investigate alert in timeline', () => {
        loadPrepackagedTimelineTemplates();
        createRule(getNewThreatIndicatorRule({ rule_id: 'rule_testing', enabled: true })).then(
          (rule) => visitRuleDetailsPage(rule.body.id)
        );

        waitForAlertsToPopulate();
        investigateFirstAlertInTimeline();

        cy.get(PROVIDER_BADGE).should('have.length', 3);
        cy.get(PROVIDER_BADGE).should(
          'have.text',
          `threat.enrichments.matched.atomic: "${
            indicatorRuleMatchingDoc.atomic
          }"threat.enrichments.matched.type: "indicator_match_rule"threat.enrichments.matched.field: "${
            getNewThreatIndicatorRule().threat_mapping[0].entries[0].field
          }"`
        );

        cy.get(INDICATOR_MATCH_ROW_RENDER).should(
          'have.text',
          `${getNewThreatIndicatorRule().threat_mapping[0].entries[0].field}matched${
            indicatorRuleMatchingDoc.atomic
          }indicator_match_ruleprovided` + ` byAbuseCH malware`
        );
      });
    });

    describe('Duplicates the indicator rule', () => {
      const TESTED_RULE_DATA = getNewThreatIndicatorRule({
        name: 'Indicator rule duplicate test',
        rule_id: 'rule_testing',
        enabled: false,
      });

      describe('on rule editing page', () => {
        beforeEach(() => {
          createRule(TESTED_RULE_DATA);
          visit(RULES_MANAGEMENT_URL);
          disableAutoRefresh();
        });

        it('Allows the rule to be duplicated from the table', () => {
          duplicateFirstRule();
          goBackToRuleDetails();
          goBackToRulesTable();
          checkDuplicatedRule(TESTED_RULE_DATA.name);
        });

        it("Allows the rule to be duplicated from the table's bulk actions", () => {
          selectAllRules();
          duplicateSelectedRulesWithExceptions();
          checkDuplicatedRule(`${TESTED_RULE_DATA.name} [Duplicate]`);
        });
      });

      describe('on rule details page', () => {
        beforeEach(() => {
          createRule(getNewThreatIndicatorRule(TESTED_RULE_DATA)).then((rule) =>
            visitRuleDetailsPage(rule.body.id)
          );
        });

        it('Allows the rule to be duplicated', () => {
          duplicateRuleFromMenu();
          goBackToRuleDetails();
          goBackToRulesTable();
          checkDuplicatedRule(`${TESTED_RULE_DATA.name} [Duplicate]`);
        });
      });
    });
  });
});
