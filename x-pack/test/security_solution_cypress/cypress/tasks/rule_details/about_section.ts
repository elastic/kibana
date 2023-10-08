/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EqlRuleCreateProps,
  NewTermsRuleCreateProps,
  QueryRuleCreateProps,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  RiskScoreMapping,
  SeverityMapping,
  Threat,
} from '@kbn/securitysolution-io-ts-alerting-types';
import {
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  AUTHOR_DETAILS,
  BUILDING_BLOCK_DETAILS,
  BUILDING_BLOCK_TEXT_DETAILS,
  FALSE_POSITIVES_DETAILS,
  INVESTIGATION_FIELDS_DETAILS,
  INVESTIGATION_NOTES_TOGGLE,
  REFERENCE_URLS_DETAILS,
  removeExternalLinkText,
  RISK_SCORE_DETAILS,
  RISK_SCORE_OVERRIDE_DETAILS,
  RULE_DETAILS_TOGGLE,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  THREAT_SUBTECHNIQUE,
  THREAT_TACTIC,
  THREAT_TECHNIQUE,
  TIMESTAMP_OVERRIDE_DETAILS,
  LICENSE_DETAILS,
  RULE_NAME_OVERRIDE_DETAILS,
} from '../../screens/rule_details';
import { getDetails } from '.';
import { ruleFields } from '../../data/detection_engine';

export const checkRuleDetailsRuleDescription = (description: string) => {
  cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', description);
};

export const checkRuleDetailsRuleNote = (note: string = ruleFields.ruleDescription) => {
  cy.get(INVESTIGATION_NOTES_TOGGLE).click();
  cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', note);
  cy.get(RULE_DETAILS_TOGGLE).click();
};

export const checkRuleDetailsRuleAuthor = (author: string[] = ruleFields.author) => {
  cy.get(ABOUT_DETAILS).within(() => {
    getDetails(AUTHOR_DETAILS).should('have.text', author.join(''));
  });
};

export const checkRuleDetailsRuleLicense = (license: string = ruleFields.license) => {
  cy.get(ABOUT_DETAILS).within(() => {
    getDetails(LICENSE_DETAILS).should('have.text', license);
  });
};

export const checkRuleDetailsRuleSeverity = (severity: string) => {
  cy.get(ABOUT_DETAILS).within(() => {
    getDetails(SEVERITY_DETAILS)
      .invoke('text')
      .then((text) => {
        cy.wrap(text.toLowerCase()).should('equal', severity);
      });
  });
};

export const checkRuleDetailsRuleSeverityOverride = (
  severityMapping: SeverityMapping | undefined
) => {
  if (severityMapping) {
    severityMapping.forEach((mapping) => {
      cy.get(`[data-test-subj="severityOverrideDetails-${mapping.severity}"`).contains(
        `${mapping.field}:${mapping.value}${mapping.severity}`,
        { matchCase: false }
      );
    });
  }
};

export const checkRuleDetailsRuleRiskScore = (riskScore: number) => {
  cy.get(ABOUT_DETAILS).within(() => {
    getDetails(RISK_SCORE_DETAILS).should('have.text', riskScore);
  });
};

export const checkRuleDetailsRuleRiskScoreOverride = (
  riskScoreMapping: RiskScoreMapping | undefined
) => {
  if (riskScoreMapping) {
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(RISK_SCORE_OVERRIDE_DETAILS).should(
        'have.text',
        `${riskScoreMapping[0].field}kibana.alert.risk_score`
      );
    });
  }
};

export const checkRuleDetailsBuildingBlockType = (buildingBlockType: string | undefined) => {
  if (buildingBlockType === 'default') {
    cy.get(ABOUT_DETAILS).within(() => {
      cy.get(ABOUT_DETAILS).within(() => {
        getDetails(BUILDING_BLOCK_DETAILS).should('have.text', BUILDING_BLOCK_TEXT_DETAILS);
      });
    });
  }
};

export const checkRuleDetailsRuleReferences = (references: string[] = ruleFields.referenceUrls) => {
  cy.get(ABOUT_DETAILS).within(() => {
    getDetails(REFERENCE_URLS_DETAILS).should((details) => {
      expect(removeExternalLinkText(details.text())).equal(references.join(''));
    });
  });
};

export const checkRuleDetailsRuleFalsePositives = (
  falsePositives: string[] = ruleFields.falsePositives
) => {
  cy.get(ABOUT_DETAILS).within(() => {
    getDetails(FALSE_POSITIVES_DETAILS).should('have.text', falsePositives.join(''));
  });
};

export const checkRuleDetailsRuleInvestigationFields = (
  investigationFields: string[] = ruleFields.investigationFields.field_names
) => {
  cy.get(ABOUT_DETAILS).within(() => {
    getDetails(INVESTIGATION_FIELDS_DETAILS).should('have.text', investigationFields.join(''));
  });
};

export const checkRuleDetailsRuleTimestampOverride = (timestampOverride: string | undefined) => {
  if (timestampOverride) {
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(TIMESTAMP_OVERRIDE_DETAILS).should('have.text', timestampOverride);
    });
  }
};

export const checkRuleDetailsRuleNameOverride = (nameOverride: string | undefined) => {
  if (nameOverride) {
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(RULE_NAME_OVERRIDE_DETAILS).should('have.text', nameOverride);
    });
  }
};

export const checkRuleDetailsRuleTags = (tags: string[]) => {
  cy.get(ABOUT_DETAILS).within(() => {
    getDetails(TAGS_DETAILS).should('have.text', tags.join(''));
  });
};

export const checkRuleDetailsRuleMitre = (threats: Threat[] = [ruleFields.threat]) => {
  threats.forEach((attack) => {
    const tactic = attack.tactic;

    cy.get(THREAT_TACTIC).should('contain', `${tactic.name} (${tactic.id})`);

    if (attack.technique) {
      attack.technique.forEach((threatTechnique) => {
        cy.get(THREAT_TECHNIQUE).should(
          'contain',
          `${threatTechnique.name} (${threatTechnique.id})`
        );

        if (threatTechnique.subtechnique) {
          threatTechnique.subtechnique.forEach((threatSubtechnique) => {
            cy.get(THREAT_SUBTECHNIQUE).should(
              'contain',
              `${threatSubtechnique.name} (${threatSubtechnique.id})`
            );
          });
        }
      });
    }
  });
};

export const confirmRuleDetailsAbout = (
  rule: RuleResponse | QueryRuleCreateProps | EqlRuleCreateProps | NewTermsRuleCreateProps
) => {
  checkRuleDetailsRuleDescription(rule.description);

  checkRuleDetailsRuleSeverity(rule.severity);
  checkRuleDetailsRuleSeverityOverride(rule.severity_mapping);

  checkRuleDetailsRuleRiskScore(rule.risk_score);
  checkRuleDetailsRuleRiskScoreOverride(rule.risk_score_mapping);

  if (rule.tags && rule.tags.length) {
    checkRuleDetailsRuleTags(rule.tags);
  }

  if (rule.references && rule.references.length) {
    checkRuleDetailsRuleReferences(rule.references);
  }

  if (rule.false_positives && rule.false_positives.length) {
    checkRuleDetailsRuleFalsePositives(rule.false_positives);
  }

  if (rule.investigation_fields) {
    checkRuleDetailsRuleInvestigationFields(rule.investigation_fields.field_names);
  }

  if (rule.note) {
    checkRuleDetailsRuleNote(rule.note);
  }

  checkRuleDetailsRuleTimestampOverride(rule.timestamp_override);
  checkRuleDetailsRuleNameOverride(rule.rule_name_override);

  if (rule.author && rule.author.length) {
    checkRuleDetailsRuleAuthor(rule.author);
  }

  if (rule.license) {
    checkRuleDetailsRuleLicense(rule.license);
  }

  checkRuleDetailsBuildingBlockType(rule.building_block_type);

  if (rule.threat && rule.threat.length) {
    checkRuleDetailsRuleMitre(rule.threat);
  }
};
