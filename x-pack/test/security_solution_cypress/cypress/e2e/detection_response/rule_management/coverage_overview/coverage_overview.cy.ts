/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMockThreatData } from '@kbn/security-solution-plugin/public/detections/mitre/mitre_tactics_techniques';
import {
  COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON,
  COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES,
  COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES,
} from '../../../../screens/rules_coverage_overview';
import { createRule } from '../../../../tasks/api_calls/rules';
import { visit } from '../../../../tasks/navigation';
import { RULES_COVERAGE_OVERVIEW_URL } from '../../../../urls/rules_management';
import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import { getMitre1, getNewRule } from '../../../../objects/rule';
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
  openTechniquePanel,
  selectCoverageOverviewActivityFilterOption,
  selectCoverageOverviewSourceFilterOption,
} from '../../../../tasks/rules_coverage_overview';

const prebuiltRules = [
  createRuleAssetSavedObject({
    name: `Enabled prebuilt rule`,
    rule_id: `enabled_prebuilt_rule`,
    enabled: true,
    threat: [getMitre1()],
  }),
  createRuleAssetSavedObject({
    name: `Disabled prebuilt rule`,
    rule_id: `disabled_prebuilt_rule`,
    enabled: false,
    threat: [getMitre1()],
  }),
];

describe('Coverage overview', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    deletePrebuiltRulesAssets();
    preventPrebuiltRulesPackageInstallation();
    createAndInstallMockedPrebuiltRules(prebuiltRules);
    createRule(
      getNewRule({ rule_id: 'enabled_custom_rule', enabled: true, name: 'Enabled custom rule' })
    );
    createRule(
      getNewRule({ rule_id: 'disabled_custom_rule', name: 'Disabled custom rule', enabled: false })
    );
    visit(RULES_COVERAGE_OVERVIEW_URL);
  });

  it('technique panel renders custom and prebuilt rule data on page load', () => {
    openTechniquePanel(getMockThreatData().technique.name);
    cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled prebuilt rule');
    cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled custom rule');
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

      openTechniquePanel(getMockThreatData().technique.name);
      cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled prebuilt rule');
      cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled custom rule');
      cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled prebuilt rule');
      cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled custom rule');
      cy.get(COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON).should('not.be.disabled');
    });

    it('filters for disabled and prebuilt rules', () => {
      selectCoverageOverviewActivityFilterOption('Enabled rules'); // Disables default filter
      selectCoverageOverviewActivityFilterOption('Disabled rules');
      selectCoverageOverviewSourceFilterOption('Custom rules'); // Disables default filter

      openTechniquePanel(getMockThreatData().technique.name);
      cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
        .contains('Enabled prebuilt rule')
        .should('not.exist');
      cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
        .contains('Enabled custom rule')
        .should('not.exist');
      cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled prebuilt rule');
      cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
        .contains('Disabled custom rule')
        .should('not.exist');
      cy.get(COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON).should('not.be.disabled');
    });

    it('filters for only prebuilt rules', () => {
      selectCoverageOverviewActivityFilterOption('Disabled rules');
      selectCoverageOverviewSourceFilterOption('Custom rules'); // Disables default filter

      openTechniquePanel(getMockThreatData().technique.name);
      cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled prebuilt rule');
      cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
        .contains('Enabled custom rule')
        .should('not.exist');
      cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled prebuilt rule');
      cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
        .contains('Disabled custom rule')
        .should('not.exist');
      cy.get(COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON).should('not.be.disabled');
    });

    it('filters for only custom rules', () => {
      selectCoverageOverviewActivityFilterOption('Disabled rules');
      selectCoverageOverviewSourceFilterOption('Elastic rules'); // Disables default filter

      openTechniquePanel(getMockThreatData().technique.name);
      cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
        .contains('Enabled prebuilt rule')
        .should('not.exist');
      cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled custom rule');
      cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
        .contains('Disabled prebuilt rule')
        .should('not.exist');
      cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled custom rule');
      cy.get(COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON).should('not.be.disabled');
    });

    it('filters for search term', () => {
      filterCoverageOverviewBySearchBar('Enabled custom rule'); // Disables default filter

      openTechniquePanel(getMockThreatData().technique.name);
      cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES)
        .contains('Enabled prebuilt rule')
        .should('not.exist');
      cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled custom rule');
      cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
        .contains('Disabled prebuilt rule')
        .should('not.exist');
      cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
        .contains('Disabled custom rule')
        .should('not.exist');
      cy.get(COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON).should('be.disabled');
    });
  });

  it('enables all disabled rules', () => {
    selectCoverageOverviewActivityFilterOption('Disabled rules');
    openTechniquePanel(getMockThreatData().technique.name);
    enableAllDisabledRules();

    // Should now render all rules in "enabled" section
    openTechniquePanel(getMockThreatData().technique.name);
    cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled prebuilt rule');
    cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled custom rule');
    cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Disabled prebuilt rule');
    cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Disabled custom rule');

    // Shouldn't render the rules in "disabled" section
    cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
      .contains('Disabled prebuilt rule')
      .should('not.exist');
    cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES)
      .contains('Disabled custom rule')
      .should('not.exist');
    cy.get(COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON).should('be.disabled');
  });
});
