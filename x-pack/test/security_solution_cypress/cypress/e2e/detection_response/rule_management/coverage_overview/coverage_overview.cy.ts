/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDuplicateTechniqueThreatData,
  getMockThreatData,
} from '@kbn/security-solution-plugin/public/detections/mitre/mitre_tactics_techniques';
import { Threat } from '@kbn/securitysolution-io-ts-alerting-types';
import {
  COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON,
  COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES,
  COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES,
  COVERAGE_OVERVIEW_TACTIC_DISABLED_STATS,
  COVERAGE_OVERVIEW_TACTIC_ENABLED_STATS,
  COVERAGE_OVERVIEW_TACTIC_PANEL,
  COVERAGE_OVERVIEW_TECHNIQUE_TITLE,
} from '../../../../screens/rules_coverage_overview';
import { createRule } from '../../../../tasks/api_calls/rules';
import { visit } from '../../../../tasks/navigation';
import { RULES_COVERAGE_OVERVIEW_URL } from '../../../../urls/rules_management';
import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import { getNewRule } from '../../../../objects/rule';
import {
  createAndInstallMockedPrebuiltRules,
  preventPrebuiltRulesPackageInstallation,
} from '../../../../tasks/api_calls/prebuilt_rules';
import {
  deleteAlertsAndRules,
  deletePrebuiltRulesAssets,
} from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import {
  enableAllDisabledRules,
  filterCoverageOverviewBySearchBar,
  openTechniquePanelByName,
  selectCoverageOverviewActivityFilterOption,
  selectCoverageOverviewSourceFilterOption,
} from '../../../../tasks/rules_coverage_overview';

// Mitre data used in base case tests
const EnabledPrebuiltRuleMitreData = getMockThreatData()[0];
const DisabledPrebuiltRuleMitreData = getMockThreatData()[1];
const EnabledCustomRuleMitreData = getMockThreatData()[2];
const DisabledCustomRuleMitreData = getMockThreatData()[3];

// Mitre data used for duplicate technique tests
const DuplicateTechniqueMitreData1 = getDuplicateTechniqueThreatData()[0];
const DuplicateTechniqueMitreData2 = getDuplicateTechniqueThreatData()[1];

const MockEnabledPrebuiltRuleThreat: Threat = {
  framework: 'MITRE ATT&CK',
  tactic: {
    name: EnabledPrebuiltRuleMitreData.tactic.name,
    id: EnabledPrebuiltRuleMitreData.tactic.id,
    reference: EnabledPrebuiltRuleMitreData.tactic.reference,
  },
  technique: [
    {
      id: EnabledPrebuiltRuleMitreData.technique.id,
      reference: EnabledPrebuiltRuleMitreData.technique.reference,
      name: EnabledPrebuiltRuleMitreData.technique.name,
      subtechnique: [
        {
          id: EnabledPrebuiltRuleMitreData.subtechnique.id,
          name: EnabledPrebuiltRuleMitreData.subtechnique.name,
          reference: EnabledPrebuiltRuleMitreData.subtechnique.reference,
        },
      ],
    },
    {
      name: EnabledPrebuiltRuleMitreData.technique.name,
      id: EnabledPrebuiltRuleMitreData.technique.id,
      reference: EnabledPrebuiltRuleMitreData.technique.reference,
      subtechnique: [],
    },
  ],
};

const MockDisabledPrebuiltRuleThreat: Threat = {
  framework: 'MITRE ATT&CK',
  tactic: {
    name: DisabledPrebuiltRuleMitreData.tactic.name,
    id: DisabledPrebuiltRuleMitreData.tactic.id,
    reference: DisabledPrebuiltRuleMitreData.tactic.reference,
  },
  technique: [
    {
      id: DisabledPrebuiltRuleMitreData.technique.id,
      reference: DisabledPrebuiltRuleMitreData.technique.reference,
      name: DisabledPrebuiltRuleMitreData.technique.name,
      subtechnique: [
        {
          id: DisabledPrebuiltRuleMitreData.subtechnique.id,
          name: DisabledPrebuiltRuleMitreData.subtechnique.name,
          reference: DisabledPrebuiltRuleMitreData.subtechnique.reference,
        },
      ],
    },
  ],
};

const MockEnabledCustomRuleThreat: Threat = {
  framework: 'MITRE ATT&CK',
  tactic: {
    name: EnabledCustomRuleMitreData.tactic.name,
    id: EnabledCustomRuleMitreData.tactic.id,
    reference: EnabledCustomRuleMitreData.tactic.reference,
  },
  technique: [
    {
      id: EnabledCustomRuleMitreData.technique.id,
      reference: EnabledCustomRuleMitreData.technique.reference,
      name: EnabledCustomRuleMitreData.technique.name,
      subtechnique: [
        {
          id: EnabledCustomRuleMitreData.subtechnique.id,
          name: EnabledCustomRuleMitreData.subtechnique.name,
          reference: EnabledCustomRuleMitreData.subtechnique.reference,
        },
      ],
    },
  ],
};

const MockDisabledCustomRuleThreat: Threat = {
  framework: 'MITRE ATT&CK',
  tactic: {
    name: DisabledCustomRuleMitreData.tactic.name,
    id: DisabledCustomRuleMitreData.tactic.id,
    reference: DisabledCustomRuleMitreData.tactic.reference,
  },
  technique: [
    {
      id: DisabledCustomRuleMitreData.technique.id,
      reference: DisabledCustomRuleMitreData.technique.reference,
      name: DisabledCustomRuleMitreData.technique.name,
    },
  ],
};

const MockCustomRuleDuplicateTechniqueThreat1: Threat = {
  framework: 'MITRE ATT&CK',
  tactic: {
    name: DuplicateTechniqueMitreData1.tactic.name,
    id: DuplicateTechniqueMitreData1.tactic.id,
    reference: DuplicateTechniqueMitreData1.tactic.reference,
  },
  technique: [
    {
      id: DuplicateTechniqueMitreData1.technique.id,
      reference: DuplicateTechniqueMitreData1.technique.reference,
      name: DuplicateTechniqueMitreData1.technique.name,
    },
  ],
};

const MockCustomRuleDuplicateTechniqueThreat2: Threat = {
  framework: 'MITRE ATT&CK',
  tactic: {
    name: DuplicateTechniqueMitreData2.tactic.name,
    id: DuplicateTechniqueMitreData2.tactic.id,
    reference: DuplicateTechniqueMitreData2.tactic.reference,
  },
  technique: [
    {
      id: DuplicateTechniqueMitreData2.technique.id,
      reference: DuplicateTechniqueMitreData2.technique.reference,
      name: DuplicateTechniqueMitreData2.technique.name,
    },
  ],
};

const prebuiltRules = [
  createRuleAssetSavedObject({
    name: `Enabled prebuilt rule`,
    rule_id: `enabled_prebuilt_rule`,
    enabled: true,
    threat: [MockEnabledPrebuiltRuleThreat],
  }),
  createRuleAssetSavedObject({
    name: `Disabled prebuilt rule`,
    rule_id: `disabled_prebuilt_rule`,
    enabled: false,
    threat: [MockDisabledPrebuiltRuleThreat],
  }),
];

describe('Coverage overview', { tags: ['@ess', '@serverless'] }, () => {
  describe('base cases', () => {
    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      deletePrebuiltRulesAssets();
      preventPrebuiltRulesPackageInstallation();
      createAndInstallMockedPrebuiltRules(prebuiltRules);
      createRule(
        getNewRule({
          rule_id: 'enabled_custom_rule',
          enabled: true,
          name: 'Enabled custom rule',
          threat: [MockEnabledCustomRuleThreat],
        })
      );
      createRule(
        getNewRule({
          rule_id: 'disabled_custom_rule',
          name: 'Disabled custom rule',
          enabled: false,
          threat: [MockDisabledCustomRuleThreat],
        })
      );
      visit(RULES_COVERAGE_OVERVIEW_URL);
    });

    it('technique panel renders custom and prebuilt rule data on page load', () => {
      openTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name);
      cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled prebuilt rule');
      cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
        .contains('Enabled custom rule')
        .should('not.exist');
      cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
        .contains('Disabled prebuilt rule')
        .should('not.exist');
      cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
        .contains('Disabled custom rule')
        .should('not.exist');
      cy.get(COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON).should('be.disabled');
    });

    describe('filtering tests', () => {
      it('filters for all data', () => {
        selectCoverageOverviewActivityFilterOption('Disabled rules');

        openTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled prebuilt rule');

        openTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled prebuilt rule');

        openTechniquePanelByName(EnabledCustomRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled custom rule');

        openTechniquePanelByName(DisabledCustomRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled custom rule');
      });

      it('filters for disabled and prebuilt rules', () => {
        selectCoverageOverviewActivityFilterOption('Enabled rules'); // Disables default filter
        selectCoverageOverviewActivityFilterOption('Disabled rules');
        selectCoverageOverviewSourceFilterOption('Custom rules'); // Disables default filter

        openTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
          .contains('Enabled prebuilt rule')
          .should('not.exist');

        openTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled prebuilt rule');

        openTechniquePanelByName(EnabledCustomRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
          .contains('Enabled custom rule')
          .should('not.exist');

        openTechniquePanelByName(DisabledCustomRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
          .contains('Disabled custom rule')
          .should('not.exist');
      });

      it('filters for only prebuilt rules', () => {
        selectCoverageOverviewActivityFilterOption('Disabled rules');
        selectCoverageOverviewSourceFilterOption('Custom rules'); // Disables default filter

        openTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled prebuilt rule');

        openTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled prebuilt rule');

        openTechniquePanelByName(EnabledCustomRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
          .contains('Enabled custom rule')
          .should('not.exist');

        openTechniquePanelByName(DisabledCustomRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
          .contains('Disabled custom rule')
          .should('not.exist');
      });

      it('filters for only custom rules', () => {
        selectCoverageOverviewActivityFilterOption('Disabled rules');
        selectCoverageOverviewSourceFilterOption('Elastic rules'); // Disables default filter

        openTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
          .contains('Enabled prebuilt rule')
          .should('not.exist');

        openTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
          .contains('Disabled prebuilt rule')
          .should('not.exist');

        openTechniquePanelByName(EnabledCustomRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled custom rule');

        openTechniquePanelByName(DisabledCustomRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled custom rule');
      });

      it('filters for search term', () => {
        filterCoverageOverviewBySearchBar('Enabled custom rule'); // Disables default filter

        openTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
          .contains('Enabled prebuilt rule')
          .should('not.exist');

        openTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
          .contains('Disabled prebuilt rule')
          .should('not.exist');

        openTechniquePanelByName(EnabledCustomRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled custom rule');

        openTechniquePanelByName(DisabledCustomRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
          .contains('Disabled custom rule')
          .should('not.exist');
      });
    });

    it('enables all disabled rules', () => {
      selectCoverageOverviewActivityFilterOption('Disabled rules');
      openTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);
      enableAllDisabledRules();

      // Should now render all rules in "enabled" section
      openTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);
      cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Disabled prebuilt rule');

      // Shouldn't render the rules in "disabled" section
      cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
        .contains('Disabled prebuilt rule')
        .should('not.exist');
      cy.get(COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON).should('be.disabled');
    });
  });

  describe('with rules that have identical mitre techniques that belong to multiple tactics', () => {
    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      deletePrebuiltRulesAssets();
      createRule(
        getNewRule({
          rule_id: 'duplicate_technique_rule_1',
          enabled: true,
          name: 'Rule with tactic 1',
          threat: [MockCustomRuleDuplicateTechniqueThreat1],
        })
      );
      createRule(
        getNewRule({
          rule_id: 'duplicate_technique_rule_2',
          name: 'Rule with tactic 2',
          enabled: false,
          threat: [MockCustomRuleDuplicateTechniqueThreat2],
        })
      );
      visit(RULES_COVERAGE_OVERVIEW_URL);
    });

    it('technique panels render unique rule data', () => {
      selectCoverageOverviewActivityFilterOption('Disabled rules');

      // Open duplicated technique panel under first tactic
      cy.get(COVERAGE_OVERVIEW_TECHNIQUE_TITLE(DuplicateTechniqueMitreData1.technique.id))
        .first()
        .click();
      cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
        .contains('Rule with tactic 1')
        .should('not.exist');
      cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Rule with tactic 2');

      // Open duplicated technique panel under second tactic
      cy.get(COVERAGE_OVERVIEW_TECHNIQUE_TITLE(DuplicateTechniqueMitreData2.technique.id))
        .last()
        .click();
      cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Rule with tactic 1');
      cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
        .contains('Rule with tactic 2')
        .should('not.exist');
    });

    it('tactic panels render correct rule stats', () => {
      selectCoverageOverviewActivityFilterOption('Disabled rules');

      // Validate rule count stats for first tactic
      cy.get(COVERAGE_OVERVIEW_TACTIC_PANEL)
        .contains(DuplicateTechniqueMitreData1.tactic.name)
        .get(COVERAGE_OVERVIEW_TACTIC_ENABLED_STATS)
        .contains('0');

      cy.get(COVERAGE_OVERVIEW_TACTIC_PANEL)
        .contains(DuplicateTechniqueMitreData1.tactic.name)
        .get(COVERAGE_OVERVIEW_TACTIC_DISABLED_STATS)
        .contains('1');

      // Validate rule count stats for second tactic
      cy.get(COVERAGE_OVERVIEW_TACTIC_PANEL)
        .contains(DuplicateTechniqueMitreData2.tactic.name)
        .get(COVERAGE_OVERVIEW_TACTIC_ENABLED_STATS)
        .contains('1');

      cy.get(COVERAGE_OVERVIEW_TACTIC_PANEL)
        .contains(DuplicateTechniqueMitreData2.tactic.name)
        .get(COVERAGE_OVERVIEW_TACTIC_DISABLED_STATS)
        .contains('0');
    });
  });
});
