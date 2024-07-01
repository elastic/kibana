/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMitreAttackDescription, getHumanizedDuration } from '../../../../helpers/rules';
import { getMachineLearningRule } from '../../../../objects/rule';

import {
  RISK_SCORE,
  RULES_MANAGEMENT_TABLE,
  RULE_NAME,
  RULE_SWITCH,
  SEVERITY,
} from '../../../../screens/alerts_detection_rules';
import {
  ABOUT_DETAILS,
  ABOUT_RULE_DESCRIPTION,
  ADDITIONAL_LOOK_BACK_DETAILS,
  ANOMALY_SCORE_DETAILS,
  DEFINITION_DETAILS,
  FALSE_POSITIVES_DETAILS,
  removeExternalLinkText,
  MACHINE_LEARNING_JOB_ID,
  // MACHINE_LEARNING_JOB_STATUS,
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
  INTERVAL_ABBR_VALUE,
} from '../../../../screens/rule_details';

import { getDetails } from '../../../../tasks/rule_details';
import { expectNumberOfRules, goToRuleDetailsOf } from '../../../../tasks/alerts_detection_rules';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillDefineMachineLearningRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectMachineLearningRuleType,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { openRuleManagementPageViaBreadcrumbs } from '../../../../tasks/rules_management';
import { CREATE_RULE_URL } from '../../../../urls/navigation';
import { forceStopAndCloseJob } from '../../../../support/machine_learning';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

describe('Machine Learning rules', { tags: ['@ess', '@serverless'] }, () => {
  const expectedUrls = (getMachineLearningRule().references ?? []).join('');
  const expectedFalsePositives = (getMachineLearningRule().false_positives ?? []).join('');
  const expectedTags = (getMachineLearningRule().tags ?? []).join('');
  const expectedMitre = formatMitreAttackDescription(getMachineLearningRule().threat ?? []);
  const expectedJobText = [
    'Unusual Linux Network Activity',
    'Anomalous Process for a Linux Population',
  ].join('');

  before(() => {
    const machineLearningJobIds = ([] as string[]).concat(
      getMachineLearningRule().machine_learning_job_id
    );
    // ensure no ML jobs are started before the suite
    machineLearningJobIds.forEach((jobId) => forceStopAndCloseJob({ jobId }));
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    visit(CREATE_RULE_URL);
  });

  it('Creates and enables a new ml rule', () => {
    const mlRule = getMachineLearningRule();
    selectMachineLearningRuleType();
    fillDefineMachineLearningRuleAndContinue(mlRule);
    fillAboutRuleAndContinue(mlRule);
    fillScheduleRuleAndContinue(mlRule);
    createAndEnableRule();
    openRuleManagementPageViaBreadcrumbs();

    expectNumberOfRules(RULES_MANAGEMENT_TABLE, 1);

    cy.get(RULE_NAME).should('have.text', mlRule.name);
    cy.get(RISK_SCORE).should('have.text', mlRule.risk_score);
    cy.get(SEVERITY).should('have.text', 'Critical');
    cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

    goToRuleDetailsOf(mlRule.name);

    cy.get(RULE_NAME_HEADER).should('contain', `${mlRule.name}`);
    cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', mlRule.description);
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(SEVERITY_DETAILS).should('have.text', 'Critical');
      getDetails(RISK_SCORE_DETAILS).should('have.text', mlRule.risk_score);
      getDetails(REFERENCE_URLS_DETAILS).should((details) => {
        expect(removeExternalLinkText(details.text())).equal(expectedUrls);
      });
      getDetails(FALSE_POSITIVES_DETAILS).should('have.text', expectedFalsePositives);
      getDetails(MITRE_ATTACK_DETAILS).should((mitre) => {
        expect(removeExternalLinkText(mitre.text())).equal(expectedMitre);
      });
      getDetails(TAGS_DETAILS).should('have.text', expectedTags);
    });
    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(ANOMALY_SCORE_DETAILS).should('have.text', mlRule.anomaly_threshold);
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Machine Learning');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
      // With the #1912 ML rule improvement changes we enable jobs on rule creation.
      // Though, in cypress jobs enabling does not work reliably and job can be started or stopped.
      // Thus, we disable next check till we fix the issue with enabling jobs in cypress.
      // Relevant ticket: https://github.com/elastic/security-team/issues/5389
      // cy.get(MACHINE_LEARNING_JOB_STATUS).should('have.text', 'StoppedStopped');
      cy.get(MACHINE_LEARNING_JOB_ID).should('have.text', expectedJobText);
    });
    cy.get(SCHEDULE_DETAILS).within(() => {
      getDetails(RUNS_EVERY_DETAILS)
        .find(INTERVAL_ABBR_VALUE)
        .should('have.text', `${mlRule.interval}`);
      const humanizedDuration = getHumanizedDuration(
        mlRule.from ?? 'now-6m',
        mlRule.interval ?? '5m'
      );
      getDetails(ADDITIONAL_LOOK_BACK_DETAILS)
        .find(INTERVAL_ABBR_VALUE)
        .should('have.text', `${humanizedDuration}`);
    });
  });
});
