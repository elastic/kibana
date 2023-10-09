/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RiskScoreMapping,
  SeverityMapping,
  Threat,
} from '@kbn/securitysolution-io-ts-alerting-types';
import {
  QueryRuleCreateProps,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  ADD_FALSE_POSITIVE_BTN,
  ADD_REFERENCE_URL_BTN,
  AUTHOR_INPUT,
  DEFAULT_RISK_SCORE_INPUT,
  FALSE_POSITIVES_DELETE,
  INVESTIGATIONS_INPUT_CLEAR_BUTTON,
  INVESTIGATION_NOTES_TEXTAREA,
  LICENSE_INPUT,
  MITRE_ATTACK_ADD_TACTIC_BUTTON,
  REFERENCE_URLS_DELETE,
  RULE_DESCRIPTION_INPUT,
  RULE_NAME_INPUT,
  SEVERITY_DROPDOWN,
  SEVERITY_OVERRIDE_ROW,
  TAGS_CLEAR_BUTTON,
  TAGS_FIELD,
} from '../../../screens/rule_creation';
import {
  fillAuthor,
  fillCustomInvestigationFields,
  fillDescription,
  fillFalsePositiveExamples,
  fillLicense,
  fillMitre,
  fillNote,
  fillReferenceUrls,
  fillRiskOverride,
  fillRiskScore,
  fillRuleName,
  fillRuleNameOverride,
  fillRuleTags,
  fillSeverity,
  fillSeverityOverride,
  fillTimestampOverride,
} from '../../rule_creation';
import { ruleFields } from '../../../data/detection_engine';
import { ABOUT_EDIT_TAB } from '../../../screens/rule_edit';
import { COMBO_BOX_INPUT } from '../../../screens/common/controls';

export const goToAboutStepTab = () => {
  cy.get(ABOUT_EDIT_TAB).click({ force: true });
};

export const editRuleName = (ruleName: string = ruleFields.ruleName) => {
  cy.get(RULE_NAME_INPUT).clear();
  fillRuleName(ruleName);
  return ruleName;
};

export const editRuleDescription = (description: string = ruleFields.ruleDescription) => {
  cy.get(RULE_DESCRIPTION_INPUT).clear({ force: true });
  fillDescription(description);
  return description;
};

export const editSeverity = (severity: string = ruleFields.ruleSeverity) => {
  fillSeverity(severity);
  return severity;
};

export const editRiskScore = (riskScore: number = ruleFields.riskScore) => {
  fillRiskScore(riskScore);
  return riskScore;
};

export const editRuleTags = (tags: string[] = ruleFields.ruleTags, clear = true) => {
  if (clear) {
    cy.get(TAGS_CLEAR_BUTTON).click();
  }
  fillRuleTags(tags);
  return tags;
};

export const editReferenceUrls = (
  referenceUrls: string[] = ruleFields.referenceUrls,
  clear = true
) => {
  if (clear) {
    cy.get(REFERENCE_URLS_DELETE).each(($el) => cy.wrap($el).click());
  }
  cy.get(ADD_REFERENCE_URL_BTN).click({ force: true });

  fillReferenceUrls(referenceUrls);
  return referenceUrls;
};

export const editFalsePositiveExamples = (
  falsePositives: string[] = ruleFields.falsePositives,
  clear = true
) => {
  if (clear) {
    cy.get(FALSE_POSITIVES_DELETE).each(($el) => cy.wrap($el).click());
  }

  cy.get(ADD_FALSE_POSITIVE_BTN).click();

  fillFalsePositiveExamples(falsePositives);
  return falsePositives;
};

export const editCustomInvestigationFields = (
  fields: string[] = ruleFields.investigationFields.field_names,
  clear = true
) => {
  if (clear) {
    cy.get(INVESTIGATIONS_INPUT_CLEAR_BUTTON).click();
  }
  fillCustomInvestigationFields(fields);
  return fields;
};

export const editNote = (note: string = ruleFields.investigationGuide, clear = true) => {
  if (clear) {
    cy.get(INVESTIGATION_NOTES_TEXTAREA).clear();
  }
  fillNote(note);
  return note;
};

export const editMitre = (mitreAttacks: Threat[] = [ruleFields.threat]) => {
  cy.get(MITRE_ATTACK_ADD_TACTIC_BUTTON).click();

  fillMitre(mitreAttacks);
  return mitreAttacks;
};

export const editAuthors = (authors: string[] = [], clear: boolean = true) => {
  if (clear) {
    cy.get(AUTHOR_INPUT).clear();
  }

  fillAuthor(authors);
  return authors;
};

export const editLicense = (license: string, clear: boolean = true) => {
  if (clear) {
    cy.get(LICENSE_INPUT).clear();
  }

  fillLicense(license);
  return license;
};

export const editSeverityOverride = (severityMapping: SeverityMapping | undefined) => {
  if (severityMapping) {
    [1, 2, 3, 4].forEach((_, i) => {
      cy.get(SEVERITY_OVERRIDE_ROW)
        .eq(i)
        .within(() => {
          cy.get(COMBO_BOX_INPUT).eq(0).type('{backspace}');
          cy.get(COMBO_BOX_INPUT).eq(1).type('{backspace}');
        });
    });
    fillSeverityOverride(severityMapping, false);
  }
};

export const editRiskOverride = (riskMapping: RiskScoreMapping) => {
  fillRiskOverride(riskMapping, false);
};

export const editRuleNameOverride = (ruleNameOverride: string) => {
  fillRuleNameOverride(ruleNameOverride);
};

export const editTimestampOverride = (timestampOverride: string) => {
  fillTimestampOverride(timestampOverride);
};

export const confirmEditAboutStepDetails = (rule: RuleResponse | QueryRuleCreateProps) => {
  cy.get(RULE_NAME_INPUT).invoke('val').should('eql', rule.name);
  cy.get(RULE_DESCRIPTION_INPUT).should('have.text', rule.description);
  cy.get(SEVERITY_DROPDOWN).contains(rule.severity, { matchCase: false });
  cy.get(DEFAULT_RISK_SCORE_INPUT).invoke('val').should('eql', `${rule.risk_score}`);

  if (rule.tags) {
    cy.get(TAGS_FIELD).should('have.text', rule.tags?.join(''));
  }
};
