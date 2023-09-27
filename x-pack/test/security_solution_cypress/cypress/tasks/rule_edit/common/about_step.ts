/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Threat } from '@kbn/securitysolution-io-ts-alerting-types';
import {
  DEFAULT_RISK_SCORE_INPUT,
  FALSE_POSITIVES_DELETE,
  INVESTIGATIONS_INPUT_CLEAR_BUTTON,
  INVESTIGATION_NOTES_TEXTAREA,
  REFERENCE_URLS_DELETE,
  RULE_DESCRIPTION_INPUT,
  RULE_NAME_INPUT,
  SEVERITY_DROPDOWN,
  TAGS_CLEAR_BUTTON,
  TAGS_FIELD,
} from '../../../screens/create_new_rule';
import {
  fillCustomInvestigationFields,
  fillDescription,
  fillFalsePositiveExamples,
  fillMitre,
  fillNote,
  fillReferenceUrls,
  fillRiskScore,
  fillRuleName,
  fillRuleTags,
  fillSeverity,
} from '../../rule_creation';

export const editRuleName = (ruleName: string) => {
  cy.get(RULE_NAME_INPUT).clear();
  fillRuleName(ruleName);
  return ruleName;
};

export const editRuleDescription = (description: string) => {
  cy.get(RULE_DESCRIPTION_INPUT).clear({ force: true });
  fillDescription(description);
  return description;
};

export const editSeverity = (severity: string) => {
  fillSeverity(severity);
  return severity;
};

export const editRiskScore = (riskScore: number) => {
  fillRiskScore(riskScore);
  return riskScore;
};

export const editRuleTags = (tags: string[], clear = true) => {
  if (clear) {
    cy.get(TAGS_CLEAR_BUTTON).click();
  }
  fillRuleTags(tags);
  return tags;
};

export const editReferenceUrls = (referenceUrls: string[], clear = true) => {
  if (clear) {
    cy.get(REFERENCE_URLS_DELETE).each(($el) => cy.wrap($el).click());
  }
  fillReferenceUrls(referenceUrls);
  return referenceUrls;
};

export const editFalsePositiveExamples = (falsePositives: string[], clear = true) => {
  if (clear) {
    cy.get(FALSE_POSITIVES_DELETE).each(($el) => cy.wrap($el).click());
  }
  fillFalsePositiveExamples(falsePositives);
  return falsePositives;
};

export const editCustomInvestigationFields = (fields: string[], clear = true) => {
  if (clear) {
    cy.get(INVESTIGATIONS_INPUT_CLEAR_BUTTON).click();
  }
  fillCustomInvestigationFields(fields);
  return fields;
};

export const editNote = (note: string, clear = true) => {
  if (clear) {
    cy.get(INVESTIGATION_NOTES_TEXTAREA).clear({ force: true });
  }
  fillNote(note);
  return note;
};

export const editMitre = (mitreAttacks: Threat[]) => {
  fillMitre(mitreAttacks);
  return mitreAttacks;
};

export const confirmEditAboutStepDetails = (rule) => {
  cy.get(RULE_NAME_INPUT).invoke('val').should('eql', rule.name);
  cy.get(RULE_DESCRIPTION_INPUT).should('have.text', rule.description);
  cy.get(SEVERITY_DROPDOWN).contains(rule.severity, { matchCase: false });
  cy.get(DEFAULT_RISK_SCORE_INPUT).invoke('val').should('eql', `${rule.risk_score}`);

  if (rule.tags) {
    cy.get(TAGS_FIELD).should('have.text', rule.tags?.join(''));
  }
};
