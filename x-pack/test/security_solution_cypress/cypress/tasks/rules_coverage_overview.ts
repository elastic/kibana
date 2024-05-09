/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COVERAGE_OVERVIEW_ACTIVITY_FILTER_BUTTON,
  COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON,
  COVERAGE_OVERVIEW_FILTER_LIST,
  COVERAGE_OVERVIEW_SEARCH_BAR,
  COVERAGE_OVERVIEW_SOURCE_FILTER_BUTTON,
  COVERAGE_OVERVIEW_TECHNIQUE_PANEL_IN_TACTIC_GROUP,
  COVERAGE_OVERVIEW_TECHNIQUE_PANEL,
} from '../screens/rules_coverage_overview';
import { LOADING_INDICATOR } from '../screens/security_header';

export const openTechniquePanelByName = (label: string) => {
  cy.get(COVERAGE_OVERVIEW_TECHNIQUE_PANEL).contains(label).click();
};

export const openTechniquePanelByNameAndTacticId = (label: string, tacticId: string) => {
  cy.get(COVERAGE_OVERVIEW_TECHNIQUE_PANEL_IN_TACTIC_GROUP(tacticId)).contains(label).click();
};

export const selectCoverageOverviewActivityFilterOption = (option: string) => {
  cy.get(COVERAGE_OVERVIEW_ACTIVITY_FILTER_BUTTON).click(); // open filter popover
  cy.get(COVERAGE_OVERVIEW_FILTER_LIST).contains(option).click();
  cy.get(LOADING_INDICATOR).should('not.exist');
  cy.get(COVERAGE_OVERVIEW_ACTIVITY_FILTER_BUTTON).click(); // close filter popover
};

export const selectCoverageOverviewSourceFilterOption = (option: string) => {
  cy.get(COVERAGE_OVERVIEW_SOURCE_FILTER_BUTTON).click(); // open filter popover
  cy.get(COVERAGE_OVERVIEW_FILTER_LIST).contains(option).click();
  cy.get(LOADING_INDICATOR).should('not.exist');
  cy.get(COVERAGE_OVERVIEW_SOURCE_FILTER_BUTTON).click(); // close filter popover
};

export const filterCoverageOverviewBySearchBar = (searchTerm: string) => {
  cy.get(COVERAGE_OVERVIEW_SEARCH_BAR).type(`${searchTerm}`);
  cy.get(COVERAGE_OVERVIEW_SEARCH_BAR).focus();
  cy.get(COVERAGE_OVERVIEW_SEARCH_BAR).realType('{enter}');
};

export const enableAllDisabledRules = () => {
  cy.get(COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON).click();
  cy.get(COVERAGE_OVERVIEW_ENABLE_ALL_DISABLED_BUTTON).should('not.exist');
  cy.get(LOADING_INDICATOR).should('not.exist');
};
