/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  RiskScoreMapping,
  SeverityMapping,
  Threat,
  ThreatSubtechnique,
  ThreatTechnique,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { ruleFields } from '../../../data/detection_engine';
import { COMBO_BOX_INPUT } from '../../../screens/common/controls';
import {
  ABOUT_CONTINUE_BTN,
  ADD_FALSE_POSITIVE_BTN,
  ADD_REFERENCE_URL_BTN,
  ADVANCED_SETTINGS_BTN,
  AUTHOR_INPUT,
  DEFAULT_RISK_SCORE_INPUT,
  FALSE_POSITIVES_INPUT,
  INVESTIGATIONS_INPUT,
  INVESTIGATION_NOTES_TEXTAREA,
  LICENSE_INPUT,
  MITRE_ATTACK_ADD_SUBTECHNIQUE_BUTTON,
  MITRE_ATTACK_ADD_TACTIC_BUTTON,
  MITRE_ATTACK_ADD_TECHNIQUE_BUTTON,
  MITRE_ATTACK_SUBTECHNIQUE_DROPDOWN,
  MITRE_ATTACK_TACTIC_DROPDOWN,
  MITRE_ATTACK_TECHNIQUE_DROPDOWN,
  MITRE_TACTIC,
  REFERENCE_URLS_INPUT,
  RISK_MAPPING_OVERRIDE_OPTION,
  RISK_OVERRIDE,
  RULE_DESCRIPTION_INPUT,
  RULE_NAME_INPUT,
  RULE_NAME_OVERRIDE,
  RULE_TIMESTAMP_OVERRIDE,
  SEVERITY_DROPDOWN,
  SEVERITY_MAPPING_OVERRIDE_OPTION,
  SEVERITY_OVERRIDE_ROW,
  TAGS_INPUT,
} from '../../../screens/rule_creation';

/** Returns the continue button on the step of about */
export const getAboutContinueButton = () => cy.get(ABOUT_CONTINUE_BTN);

export const fillRuleName = (ruleName: string = ruleFields.ruleName) => {
  cy.get(RULE_NAME_INPUT).type(ruleName, { force: true });
  return ruleName;
};

export const fillDescription = (description: string = ruleFields.ruleDescription) => {
  cy.get(RULE_DESCRIPTION_INPUT).type(description, { force: true });

  return description;
};

export const fillSeverity = (severity: string = ruleFields.ruleSeverity) => {
  cy.get(SEVERITY_DROPDOWN).click({ force: true });
  cy.get(`#${severity.toLowerCase()}`).click();
  return severity;
};

export const fillRiskScore = (riskScore: number = ruleFields.riskScore) => {
  cy.get(DEFAULT_RISK_SCORE_INPUT).type(`{selectall}${riskScore}`, { force: true });
  return riskScore;
};

export const fillRuleTags = (tags: string[] = ruleFields.ruleTags) => {
  tags.forEach((tag) => {
    cy.get(TAGS_INPUT).type(`${tag}{enter}`, { force: true });
  });
  return tags;
};

/*
 * ADVANCED SETTINGS
 */

export const expandAdvancedSettings = () => {
  cy.get(ADVANCED_SETTINGS_BTN).click({ force: true });
};

export const fillMitre = (mitreAttacks: Threat[] = [ruleFields.threat]) => {
  let techniqueIndex = 0;
  let subtechniqueInputIndex = 0;
  mitreAttacks.forEach((mitre, tacticIndex) => {
    cy.get(MITRE_ATTACK_TACTIC_DROPDOWN).eq(tacticIndex).click({ force: true });
    cy.contains(MITRE_TACTIC, `${mitre.tactic.name} (${mitre.tactic.id})`).click();

    if (mitre.technique) {
      mitre.technique.forEach((technique) => {
        cy.get(MITRE_ATTACK_ADD_TECHNIQUE_BUTTON).eq(tacticIndex).click({ force: true });
        cy.get(MITRE_ATTACK_TECHNIQUE_DROPDOWN).eq(techniqueIndex).click({ force: true });
        cy.contains(MITRE_TACTIC, `${technique.name} (${technique.id})`).click();
        if (technique.subtechnique) {
          technique.subtechnique.forEach((subtechnique) => {
            cy.get(MITRE_ATTACK_ADD_SUBTECHNIQUE_BUTTON).eq(techniqueIndex).click({ force: true });
            cy.get(MITRE_ATTACK_SUBTECHNIQUE_DROPDOWN)
              .eq(subtechniqueInputIndex)
              .click({ force: true });
            cy.contains(MITRE_TACTIC, `${subtechnique.name} (${subtechnique.id})`).click();
            subtechniqueInputIndex++;
          });
          techniqueIndex++;
        }
      });
    }

    cy.get(MITRE_ATTACK_ADD_TACTIC_BUTTON).click({ force: true });
  });
  return mitreAttacks;
};

export const fillThreat = (threat: Threat = ruleFields.threat) => {
  cy.get(MITRE_ATTACK_TACTIC_DROPDOWN).first().click({ force: true });
  cy.contains(MITRE_TACTIC, threat.tactic.name).click();
  return threat;
};

export const fillThreatTechnique = (technique: ThreatTechnique = ruleFields.threatTechnique) => {
  cy.get(MITRE_ATTACK_ADD_TECHNIQUE_BUTTON).first().click({ force: true });
  cy.get(MITRE_ATTACK_TECHNIQUE_DROPDOWN).first().click({ force: true });
  cy.contains(MITRE_TACTIC, technique.name).click();
  return technique;
};

export const fillThreatSubtechnique = (
  subtechnique: ThreatSubtechnique = ruleFields.threatSubtechnique
) => {
  cy.get(MITRE_ATTACK_ADD_SUBTECHNIQUE_BUTTON).first().click({ force: true });
  cy.get(MITRE_ATTACK_SUBTECHNIQUE_DROPDOWN).first().click({ force: true });
  cy.contains(MITRE_TACTIC, subtechnique.name).click();
  return subtechnique;
};

export const fillFalsePositiveExamples = (falsePositives: string[] = ruleFields.falsePositives) => {
  falsePositives.forEach((falsePositive, index) => {
    cy.get(FALSE_POSITIVES_INPUT).eq(index).clear({ force: true });
    cy.get(FALSE_POSITIVES_INPUT).eq(index).type(falsePositive, { force: true });
    cy.get(ADD_FALSE_POSITIVE_BTN).click({ force: true });
  });
  return falsePositives;
};

export const fillNote = (note: string = ruleFields.investigationGuide) => {
  cy.get(INVESTIGATION_NOTES_TEXTAREA).type(note, { force: true });

  return note;
};

export const fillReferenceUrls = (referenceUrls: string[] = ruleFields.referenceUrls) => {
  referenceUrls.forEach((url, index) => {
    cy.get(REFERENCE_URLS_INPUT).eq(index).clear({ force: true });
    cy.get(REFERENCE_URLS_INPUT).eq(index).type(url, { force: true });

    cy.get(ADD_REFERENCE_URL_BTN).click({ force: true });
  });
  return referenceUrls;
};

export const fillCustomInvestigationFields = (
  fields: string[] = ruleFields.investigationFields.field_names
) => {
  fields.forEach((field) => {
    cy.get(INVESTIGATIONS_INPUT).type(`${field}{downArrow}{enter}`, { force: true });
  });
  return fields;
};

export const fillAuthor = (authors: string[] = ruleFields.author) => {
  authors.forEach((author) => {
    cy.get(AUTHOR_INPUT).type(`${author}{enter}`);
  });
  return authors;
};

export const fillLicense = (license: string = ruleFields.license) => {
  cy.get(LICENSE_INPUT).type(`${license}{enter}`);

  return license;
};

/*
 * GENERAL
 */

export const fillAboutRule = (rule: RuleCreateProps) => {
  fillRuleName(rule.name);
  fillDescription(rule.description);

  if (rule.severity) {
    fillSeverity(rule.severity);
  }
  if (rule.risk_score) {
    fillRiskScore(rule.risk_score);
  }
  if (rule.tags) {
    fillRuleTags(rule.tags);
  }

  expandAdvancedSettings();

  if (rule.references) {
    fillReferenceUrls(rule.references);
  }

  if (rule.false_positives) {
    fillFalsePositiveExamples(rule.false_positives);
  }

  if (rule.threat) {
    fillMitre(rule.threat);
  }

  if (rule.investigation_fields) {
    fillCustomInvestigationFields(rule.investigation_fields.field_names);
  }

  if (rule.note) {
    fillNote(rule.note);
  }

  if (rule.author) {
    fillAuthor(rule.author);
  }

  if (rule.license) {
    fillLicense(rule.license);
  }
};

export const fillSeverityOverride = (
  severityMapping: SeverityMapping | undefined,
  check: boolean = true
) => {
  if (severityMapping) {
    if (check) {
      cy.get(SEVERITY_MAPPING_OVERRIDE_OPTION).click();
    }
    severityMapping.forEach((severity, i) => {
      cy.get(SEVERITY_OVERRIDE_ROW)
        .eq(i)
        .within(() => {
          cy.get(COMBO_BOX_INPUT).eq(0).type(`${severity.field}{enter}`);
          cy.get(COMBO_BOX_INPUT).eq(1).type(`${severity.value}{enter}`);
        });
    });
  }
};

export const fillRiskOverride = (
  riskMapping: RiskScoreMapping | undefined,
  check: boolean = true
) => {
  if (riskMapping) {
    if (check) {
      cy.get(RISK_MAPPING_OVERRIDE_OPTION).click();
    }
    const field = riskMapping[0].field;
    cy.get(RISK_OVERRIDE).within(() => {
      cy.get(COMBO_BOX_INPUT).type(`${field}{enter}`);
    });
  }
};

export const fillRuleNameOverride = (ruleNameOverride: string | undefined) => {
  if (ruleNameOverride) {
    cy.get(RULE_NAME_OVERRIDE).within(() => {
      cy.get(COMBO_BOX_INPUT).type(`${ruleNameOverride}{downArrow}{enter}`);
    });
  }
};

export const fillTimestampOverride = (timestampOverride: string | undefined) => {
  if (timestampOverride) {
    cy.get(RULE_TIMESTAMP_OVERRIDE).within(() => {
      cy.get(COMBO_BOX_INPUT).type(`${timestampOverride}{enter}`);
    });
  }
};

export const fillAboutRuleWithOverrideAndContinue = (rule: RuleCreateProps) => {
  fillRuleName(rule.name);
  fillDescription(rule.description);

  fillSeverity(rule.severity);
  fillSeverityOverride(rule.severity_mapping);

  fillRiskScore(rule.risk_score);
  fillRiskOverride(rule.risk_score_mapping);

  if (rule.tags) {
    fillRuleTags(rule.tags);
  }

  expandAdvancedSettings();

  if (rule.references) {
    fillReferenceUrls(rule.references);
  }
  if (rule.false_positives) {
    fillFalsePositiveExamples(rule.false_positives);
  }
  if (rule.threat) {
    fillMitre(rule.threat);
  }
  if (rule.note) {
    fillNote(rule.note);
  }

  fillRuleNameOverride(rule.rule_name_override);
  fillTimestampOverride(rule.timestamp_override);

  getAboutContinueButton().should('exist').click({ force: true });
};

export const fillAboutRuleMinimumAndContinue = (rule: RuleCreateProps) => {
  fillRuleName(rule.name);
  fillDescription(rule.description);
  fillSeverity(rule.severity);
  fillRiskScore(rule.risk_score);
  getAboutContinueButton().should('exist').click();
};

export const fillAboutRuleAndContinue = (rule: RuleCreateProps) => {
  fillAboutRule(rule);
  getAboutContinueButton().should('exist').click({ force: true });
};
