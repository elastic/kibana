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
} from '../../../../screens/alerts';
import { createRule } from '../../../../tasks/api_calls/rules';
import { visit } from '../../../../tasks/navigation';
import { COVERAGE_OVERVIEW_URL } from '../../../../urls/rules_management';
import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import { getMitre1, getNewRule } from '../../../../objects/rule';
import {
  createAndInstallMockedPrebuiltRules,
  preventPrebuiltRulesPackageInstallation,
} from '../../../../tasks/api_calls/prebuilt_rules';
import {
  cleanKibana,
  deleteAlertsAndRules,
  deletePrebuiltRulesAssets,
} from '../../../../tasks/common';
import { login } from '../../../../tasks/login';
import {
  openTechniquePanel,
  selectCoverageOverviewActivityFilterOption,
  selectCoverageOverviewSourceFilterOption,
} from '../../../../tasks/alerts';

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
    threat: [getMitre1()],
  }),
];

describe('Coverage overview', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    deletePrebuiltRulesAssets();
    preventPrebuiltRulesPackageInstallation();
    visit(COVERAGE_OVERVIEW_URL);
    createAndInstallMockedPrebuiltRules({ rules: prebuiltRules });
    createRule(
      getNewRule({ rule_id: 'enabled_custom_rule', enabled: true, name: 'Enabled custom rule' })
    );
    createRule(
      getNewRule({ rule_id: 'disabled_custom_rule', name: 'Disabled custom rule', enabled: false })
    );
    cy.reload();
  });

  it('technique panel renders correct data on page load', () => {
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

  it('filtering displays correct data', () => {
    // all data filtered in
    selectCoverageOverviewActivityFilterOption('Disabled rules');
    openTechniquePanel(getMockThreatData().technique.name);
    cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled prebuilt rule');
    cy.get(COVERAGE_OVERVIEW_POPOVER_ENABLED_RULES).contains('Enabled custom rule');
    cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled prebuilt rule');
    cy.get(COVERAGE_OVERVIEW_POPOVER_DISABLED_RULES).contains('Disabled custom rule');
    cy.get(COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON).should('not.be.disabled');

    // only filtering for disabled and prebuilt rules
    selectCoverageOverviewActivityFilterOption('Enabled rules');
    selectCoverageOverviewSourceFilterOption('Custom rules');
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
});
