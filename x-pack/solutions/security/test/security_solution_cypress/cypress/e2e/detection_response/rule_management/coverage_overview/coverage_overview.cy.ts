/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDuplicateTechniqueThreatData,
  getMockThreatData,
} from '@kbn/security-solution-plugin/common/detection_engine/mitre/mitre_tactics_techniques';
import type { Threat } from '@kbn/securitysolution-io-ts-alerting-types';
import {
  COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON,
  COVERAGE_OVERVIEW_INVALID_MITRE_BADGE,
  COVERAGE_OVERVIEW_INVALID_MITRE_CALLOUT,
  COVERAGE_OVERVIEW_INVALID_MITRE_MODAL,
  COVERAGE_OVERVIEW_INVALID_MITRE_MODAL_CLOSE_BUTTON,
  COVERAGE_OVERVIEW_INVALID_MITRE_VIEW_BUTTON,
  COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES,
  COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES,
  COVERAGE_OVERVIEW_TACTIC_DISABLED_STATS,
  COVERAGE_OVERVIEW_TACTIC_ENABLED_STATS,
  COVERAGE_OVERVIEW_TACTIC_PANEL,
} from '../../../../screens/rules_coverage_overview';
import { createRule } from '../../../../tasks/api_calls/rules';
import { visit } from '../../../../tasks/navigation';
import { RULES_COVERAGE_OVERVIEW_URL } from '../../../../urls/rules_management';
import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import { getCustomQueryRuleParams, getNewRule } from '../../../../objects/rule';
import {
  createAndInstallMockedPrebuiltRules,
  installMockPrebuiltRulesPackage,
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
  toggleTechniquePanelByName,
  toggleTechniquePanelByNameAndTacticId,
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

// A technique ID that is not present in the bundled MITRE ATT&CK dataset (e.g.
// removed or renumbered in a version bump), used to exercise the "invalid MITRE
// mappings" callout.
const INVALID_MITRE_TECHNIQUE_ID = 'T9999';

const MockInvalidMitreRuleThreat: Threat = {
  framework: 'MITRE ATT&CK',
  tactic: {
    name: EnabledCustomRuleMitreData.tactic.name,
    id: EnabledCustomRuleMitreData.tactic.id,
    reference: EnabledCustomRuleMitreData.tactic.reference,
  },
  technique: [
    {
      id: INVALID_MITRE_TECHNIQUE_ID,
      name: 'Removed Technique',
      reference: `https://attack.mitre.org/techniques/${INVALID_MITRE_TECHNIQUE_ID}/`,
      subtechnique: [],
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

// https://github.com/elastic/kibana/issues/179052
describe(
  'Coverage overview',
  {
    tags: ['@ess', '@serverless', '@skipInServerless'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'mitreAttackUpdatesUIEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    before(() => {
      installMockPrebuiltRulesPackage();
    });

    describe('base cases', () => {
      beforeEach(() => {
        login();
        deleteAlertsAndRules();
        deletePrebuiltRulesAssets();
        preventPrebuiltRulesPackageInstallation();
        createAndInstallMockedPrebuiltRules(prebuiltRules);
        createRule(
          getCustomQueryRuleParams({
            rule_id: 'enabled_custom_rule',
            enabled: true,
            name: 'Enabled custom rule',
            threat: [MockEnabledCustomRuleThreat],
          })
        );
        createRule(
          getCustomQueryRuleParams({
            rule_id: 'disabled_custom_rule',
            name: 'Disabled custom rule',
            enabled: false,
            threat: [MockDisabledCustomRuleThreat],
          })
        );
        visit(RULES_COVERAGE_OVERVIEW_URL);
      });

      it('technique panel renders custom and prebuilt rule data on page load', () => {
        toggleTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name);
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
          selectCoverageOverviewActivityFilterOption('Disabled rules'); // Activates disabled rules filter as it's off by default on page load

          toggleTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled prebuilt rule');
          toggleTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name); // Close opened panel so it doesn't cover other panels and lead to flaky tests

          toggleTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled prebuilt rule');
          toggleTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);

          toggleTechniquePanelByName(EnabledCustomRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled custom rule');
          toggleTechniquePanelByName(EnabledCustomRuleMitreData.technique.name);

          toggleTechniquePanelByName(DisabledCustomRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled custom rule');
          toggleTechniquePanelByName(DisabledCustomRuleMitreData.technique.name);
        });

        it('filters for disabled and prebuilt rules', () => {
          selectCoverageOverviewActivityFilterOption('Enabled rules'); // Disables default filter
          selectCoverageOverviewActivityFilterOption('Disabled rules'); // Activates disabled rules filter as it's off by default on page load
          selectCoverageOverviewSourceFilterOption('Custom rules'); // Disables default filter

          toggleTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
            .contains('Enabled prebuilt rule')
            .should('not.exist');
          toggleTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name); // Close opened panel so it doesn't cover other panels and lead to flaky tests

          toggleTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled prebuilt rule');
          toggleTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);

          toggleTechniquePanelByName(EnabledCustomRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
            .contains('Enabled custom rule')
            .should('not.exist');
          toggleTechniquePanelByName(EnabledCustomRuleMitreData.technique.name);

          toggleTechniquePanelByName(DisabledCustomRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
            .contains('Disabled custom rule')
            .should('not.exist');
          toggleTechniquePanelByName(DisabledCustomRuleMitreData.technique.name);
        });

        it('filters for only prebuilt rules', () => {
          selectCoverageOverviewActivityFilterOption('Disabled rules'); // Activates disabled rules filter as it's off by default on page load
          selectCoverageOverviewSourceFilterOption('Custom rules'); // Disables default filter

          toggleTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled prebuilt rule');
          toggleTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name); // Close opened panel so it doesn't cover other panels and lead to flaky tests

          toggleTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled prebuilt rule');
          toggleTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);

          toggleTechniquePanelByName(EnabledCustomRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
            .contains('Enabled custom rule')
            .should('not.exist');
          toggleTechniquePanelByName(EnabledCustomRuleMitreData.technique.name);

          toggleTechniquePanelByName(DisabledCustomRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
            .contains('Disabled custom rule')
            .should('not.exist');
          toggleTechniquePanelByName(DisabledCustomRuleMitreData.technique.name);
        });

        it('filters for only custom rules', () => {
          selectCoverageOverviewActivityFilterOption('Disabled rules'); // Activates disabled rules filter as it's off by default on page load
          selectCoverageOverviewSourceFilterOption('Elastic rules'); // Disables default filter

          toggleTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
            .contains('Enabled prebuilt rule')
            .should('not.exist');
          toggleTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name); // Close opened panel so it doesn't cover other panels and lead to flaky tests

          toggleTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
            .contains('Disabled prebuilt rule')
            .should('not.exist');
          toggleTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);

          toggleTechniquePanelByName(EnabledCustomRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled custom rule');
          toggleTechniquePanelByName(EnabledCustomRuleMitreData.technique.name);

          toggleTechniquePanelByName(DisabledCustomRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled custom rule');
          toggleTechniquePanelByName(DisabledCustomRuleMitreData.technique.name);
        });

        it('filters for search term', () => {
          filterCoverageOverviewBySearchBar('Enabled custom rule'); // Disables default filter

          toggleTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
            .contains('Enabled prebuilt rule')
            .should('not.exist');
          toggleTechniquePanelByName(EnabledPrebuiltRuleMitreData.technique.name); // Close opened panel so it doesn't cover other panels and lead to flaky tests

          toggleTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
            .contains('Disabled prebuilt rule')
            .should('not.exist');
          toggleTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);

          toggleTechniquePanelByName(EnabledCustomRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled custom rule');
          toggleTechniquePanelByName(EnabledCustomRuleMitreData.technique.name);

          toggleTechniquePanelByName(DisabledCustomRuleMitreData.technique.name);
          cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
            .contains('Disabled custom rule')
            .should('not.exist');
          toggleTechniquePanelByName(DisabledCustomRuleMitreData.technique.name);
        });
      });

      it('enables all disabled rules', () => {
        selectCoverageOverviewActivityFilterOption('Disabled rules'); // Activates disabled rules filter as it's off by default on page load
        toggleTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);
        enableAllDisabledRules();

        // Should now render all rules in "enabled" section
        toggleTechniquePanelByName(DisabledPrebuiltRuleMitreData.technique.name);
        cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Disabled prebuilt rule');

        // Shouldn't render the rules in "disabled" section
        cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
          .contains('Disabled prebuilt rule')
          .should('not.exist');
        cy.get(COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON).should('be.disabled');
      });
    });

    describe('with rules that have identical mitre techniques that belong to multiple tactics', () => {
      const SharedTechniqueName = DuplicateTechniqueMitreData1.technique.name;
      const TacticOfRule1 = DuplicateTechniqueMitreData1.tactic;
      const TacticOfRule2 = DuplicateTechniqueMitreData2.tactic;

      beforeEach(() => {
        login();
        deleteAlertsAndRules();
        deletePrebuiltRulesAssets();
        createRule(
          getNewRule({
            rule_id: 'duplicate_technique_rule_1',
            enabled: true,
            name: 'Rule under Persistence tactic',
            threat: [MockCustomRuleDuplicateTechniqueThreat1],
          })
        );
        createRule(
          getNewRule({
            rule_id: 'duplicate_technique_rule_2',
            name: 'Rule under Privilege Escalation tactic',
            enabled: false,
            threat: [MockCustomRuleDuplicateTechniqueThreat2],
          })
        );
        visit(RULES_COVERAGE_OVERVIEW_URL);
      });

      it('technique panels render unique rule data', () => {
        // Tests to make sure each rule only exists in the specific technique and tactic that's assigned to it

        selectCoverageOverviewActivityFilterOption('Disabled rules'); // Activates disabled rules filter as it's off by default on page load

        // Open duplicated technique panel under Persistence tactic
        toggleTechniquePanelByNameAndTacticId(SharedTechniqueName, TacticOfRule1.id);

        // Only rule 1 data is present
        cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Rule under Persistence tactic');
        cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
          .contains('Rule under Privilege Escalation tactic')
          .should('not.exist');

        toggleTechniquePanelByNameAndTacticId(SharedTechniqueName, TacticOfRule1.id); // Close opened panel so it doesn't cover other panels

        // Open duplicated technique panel under Privilege Escalation tactic
        toggleTechniquePanelByNameAndTacticId(SharedTechniqueName, TacticOfRule2.id);

        // Only rule 2 data is present
        cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
          .contains('Rule under Persistence tactic')
          .should('not.exist');
        cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains(
          'Rule under Privilege Escalation tactic'
        );

        toggleTechniquePanelByNameAndTacticId(SharedTechniqueName, TacticOfRule2.id); // Close opened panel
      });

      it('tactic panels render correct rule stats', () => {
        selectCoverageOverviewActivityFilterOption('Disabled rules'); // Activates disabled rules filter as it's off by default on page load

        // Validate rule count stats for the Persistence tactic only show stats based on its own technique
        // Enabled rule count
        cy.get(COVERAGE_OVERVIEW_TACTIC_PANEL)
          .contains(TacticOfRule1.name)
          .get(COVERAGE_OVERVIEW_TACTIC_ENABLED_STATS)
          .contains('0');
        // Disabled rule count
        cy.get(COVERAGE_OVERVIEW_TACTIC_PANEL)
          .contains(TacticOfRule1.name)
          .get(COVERAGE_OVERVIEW_TACTIC_DISABLED_STATS)
          .contains('1');

        // Validate rule count stats for the Privilege Escalation tactic only show stats based on its own technique
        // Enabled rule count
        cy.get(COVERAGE_OVERVIEW_TACTIC_PANEL)
          .contains(TacticOfRule2.name)
          .get(COVERAGE_OVERVIEW_TACTIC_ENABLED_STATS)
          .contains('1');
        // Disabled rule count
        cy.get(COVERAGE_OVERVIEW_TACTIC_PANEL)
          .contains(TacticOfRule2.name)
          .get(COVERAGE_OVERVIEW_TACTIC_DISABLED_STATS)
          .contains('0');
      });
    });

    describe('with rules that have invalid MITRE mappings', () => {
      beforeEach(() => {
        login();
        deleteAlertsAndRules();
      });

      it('does not render the invalid MITRE callout when all rules have valid mappings', () => {
        createRule(
          getCustomQueryRuleParams({
            rule_id: 'valid_mitre_rule',
            enabled: true,
            name: 'Valid MITRE rule',
            threat: [MockEnabledCustomRuleThreat],
          })
        );
        visit(RULES_COVERAGE_OVERVIEW_URL);

        cy.get(COVERAGE_OVERVIEW_TACTIC_PANEL).should('exist'); // wait for the dashboard to load
        cy.get(COVERAGE_OVERVIEW_INVALID_MITRE_CALLOUT).should('not.exist');
      });

      it('renders the invalid MITRE callout and lists offending rules in the modal', () => {
        createRule(
          getCustomQueryRuleParams({
            rule_id: 'invalid_mitre_rule',
            enabled: true,
            name: 'Invalid MITRE rule',
            threat: [MockInvalidMitreRuleThreat],
          })
        );
        visit(RULES_COVERAGE_OVERVIEW_URL);

        cy.get(COVERAGE_OVERVIEW_INVALID_MITRE_CALLOUT).should('exist');

        // Open the modal listing the offending rules
        cy.get(COVERAGE_OVERVIEW_INVALID_MITRE_VIEW_BUTTON).click();
        cy.get(COVERAGE_OVERVIEW_INVALID_MITRE_MODAL).should('exist');
        cy.get(COVERAGE_OVERVIEW_INVALID_MITRE_MODAL).contains('Invalid MITRE rule');
        cy.get(COVERAGE_OVERVIEW_INVALID_MITRE_BADGE(INVALID_MITRE_TECHNIQUE_ID)).should('exist');

        // Close the modal
        cy.get(COVERAGE_OVERVIEW_INVALID_MITRE_MODAL_CLOSE_BUTTON).click();
        cy.get(COVERAGE_OVERVIEW_INVALID_MITRE_MODAL).should('not.exist');
      });
    });
  }
);
