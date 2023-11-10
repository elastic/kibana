/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_RULES_TABLE_REFRESH_SETTING } from '@kbn/security-solution-plugin/common/constants';
import {
  COLLAPSED_ACTION_BTN,
  CUSTOM_RULES_BTN,
  DELETE_RULE_ACTION_BTN,
  RULES_SELECTED_TAG,
  RULE_NAME,
  RULE_SWITCH,
  RULE_SWITCH_LOADER,
  RULES_MANAGEMENT_TABLE,
  EXPORT_ACTION_BTN,
  EDIT_RULE_ACTION_BTN,
  DUPLICATE_RULE_ACTION_BTN,
  DUPLICATE_RULE_MENU_PANEL_BTN,
  CONFIRM_DUPLICATE_RULE,
  RULES_ROW,
  SELECT_ALL_RULES_BTN,
  MODAL_CONFIRMATION_BTN,
  RULES_DELETE_CONFIRMATION_MODAL,
  RULE_DETAILS_DELETE_BTN,
  RULE_IMPORT_MODAL_BUTTON,
  RULE_IMPORT_MODAL,
  INPUT_FILE,
  RULE_IMPORT_OVERWRITE_CHECKBOX,
  RULE_IMPORT_OVERWRITE_EXCEPTIONS_CHECKBOX,
  RULES_TAGS_POPOVER_BTN,
  RULES_TAGS_POPOVER_WRAPPER,
  INTEGRATIONS_POPOVER,
  SELECTED_RULES_NUMBER_LABEL,
  REFRESH_SETTINGS_SWITCH,
  ELASTIC_RULES_BTN,
  TOASTER_ERROR_BTN,
  MODAL_CONFIRMATION_CANCEL_BTN,
  MODAL_CONFIRMATION_BODY,
  RULE_SEARCH_FIELD,
  RULE_IMPORT_OVERWRITE_CONNECTORS_CHECKBOX,
  RULES_TAGS_FILTER_BTN,
  RULES_TAGS_FILTER_POPOVER,
  RULES_TABLE_REFRESH_INDICATOR,
  RULES_MANAGEMENT_TAB,
  RULES_MONITORING_TAB,
  ENABLED_RULES_BTN,
  DISABLED_RULES_BTN,
  REFRESH_RULES_TABLE_BUTTON,
  RULE_LAST_RUN,
  TOASTER_CLOSE_ICON,
  ADD_ELASTIC_RULES_EMPTY_PROMPT_BTN,
  CONFIRM_DELETE_RULE_BTN,
  AUTO_REFRESH_POPOVER_TRIGGER_BUTTON,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
} from '../screens/alerts_detection_rules';
import type { RULES_MONITORING_TABLE } from '../screens/alerts_detection_rules';
import { EUI_CHECKBOX } from '../screens/common/controls';
import { POPOVER_ACTIONS_TRIGGER_BUTTON, RULE_NAME_HEADER } from '../screens/rule_details';
import { EDIT_SUBMIT_BUTTON } from '../screens/edit_rule';
import { LOADING_INDICATOR } from '../screens/security_header';
import { PAGE_CONTENT_SPINNER } from '../screens/common/page';

import { goToRuleEditSettings } from './rule_details';
import { goToActionsStepTab } from './create_new_rule';
import { setKibanaSetting } from './api_calls/kibana_advanced_settings';

export const getRulesManagementTableRows = () => cy.get(RULES_MANAGEMENT_TABLE).find(RULES_ROW);

export const enableRule = (rulePosition: number) => {
  cy.get(RULE_SWITCH).eq(rulePosition).click();
};

export const editFirstRule = () => {
  cy.get(COLLAPSED_ACTION_BTN).should('be.visible');
  cy.get(COLLAPSED_ACTION_BTN).first().click();
  cy.get(EDIT_RULE_ACTION_BTN).should('be.visible');
  cy.get(EDIT_RULE_ACTION_BTN).click();
};

export const duplicateFirstRule = () => {
  cy.get(COLLAPSED_ACTION_BTN).should('be.visible');
  cy.get(COLLAPSED_ACTION_BTN).first().click();
  cy.get(DUPLICATE_RULE_ACTION_BTN).should('be.visible');
  cy.get(DUPLICATE_RULE_ACTION_BTN).click();
  cy.get(CONFIRM_DUPLICATE_RULE).click();
};

/**
 * Duplicates the rule from the menu and does additional
 * pipes and checking that the elements are present on the
 * page as well as removed when doing the clicks to help reduce
 * flake.
 */
export const duplicateRuleFromMenu = () => {
  cy.get(LOADING_INDICATOR).should('not.exist');
  cy.get(POPOVER_ACTIONS_TRIGGER_BUTTON).click({ force: true });
  cy.get(DUPLICATE_RULE_MENU_PANEL_BTN).should('be.visible');

  // Because of a fade effect and fast clicking this can produce more than one click
  cy.get(DUPLICATE_RULE_MENU_PANEL_BTN).click({ force: true });
  cy.get(CONFIRM_DUPLICATE_RULE).click();
};

/**
 * Check that the duplicated rule is on the table
 * and it is disabled (default)
 */
export const checkDuplicatedRule = (ruleName: string): void => {
  cy.contains(RULE_NAME, ruleName)
    .parents(RULES_ROW)
    .find(RULE_SWITCH)
    .should('have.attr', 'aria-checked', 'false');
};

export const deleteFirstRule = () => {
  cy.get(COLLAPSED_ACTION_BTN).first().click();
  cy.get(DELETE_RULE_ACTION_BTN).click();
  cy.get(CONFIRM_DELETE_RULE_BTN).click();
};

export const deleteRuleFromDetailsPage = () => {
  cy.get(POPOVER_ACTIONS_TRIGGER_BUTTON).click();
  cy.get(RULE_DETAILS_DELETE_BTN).click();
  cy.get(RULE_DETAILS_DELETE_BTN).should('not.exist');
  cy.get(CONFIRM_DELETE_RULE_BTN).click();
};

export const exportRule = (name: string) => {
  cy.log(`Export rule "${name}"`);

  cy.contains(RULE_NAME, name).parents(RULES_ROW).find(COLLAPSED_ACTION_BTN).click();
  cy.get(EXPORT_ACTION_BTN).click();
  cy.get(EXPORT_ACTION_BTN).should('not.exist');
};

export const filterBySearchTerm = (term: string) => {
  cy.log(`Filter rules by search term: "${term}"`);
  cy.get(RULE_SEARCH_FIELD).type(term, { force: true });
  cy.get(RULE_SEARCH_FIELD).trigger('search', { waitForAnimations: true });
};

export const filterByTags = (tags: string[]) => {
  cy.get(RULES_TAGS_FILTER_BTN).click();

  for (const tag of tags) {
    cy.get(RULES_TAGS_FILTER_POPOVER).contains(tag).click();
  }

  // close the popover
  cy.get(RULES_TAGS_FILTER_BTN).click();
};

export const unselectTags = () => {
  cy.get(RULES_TAGS_FILTER_BTN).click();

  cy.get(RULES_TAGS_FILTER_POPOVER)
    .find('[aria-checked="true"]')
    .each((el) => cy.wrap(el).click());

  // close the popover
  cy.get(RULES_TAGS_FILTER_BTN).click();
};

export const waitForRuleExecution = (name: string) => {
  cy.log(`Wait for rule "${name}" to be executed`);
  cy.waitUntil(() => {
    cy.get(REFRESH_RULES_TABLE_BUTTON).click();

    return cy
      .contains(RULE_NAME, name)
      .parents(RULES_ROW)
      .find(RULE_LAST_RUN)
      .then(($el) => $el.text().endsWith('ago'));
  });
};

export const filterByElasticRules = () => {
  cy.get(ELASTIC_RULES_BTN).click();
  waitForRulesTableToBeRefreshed();
};

export const filterByCustomRules = () => {
  cy.get(CUSTOM_RULES_BTN).click();
};

export const filterByEnabledRules = () => {
  cy.get(ENABLED_RULES_BTN).click();
};

export const filterByDisabledRules = () => {
  cy.get(DISABLED_RULES_BTN).click();
};

export const goToRuleDetailsOf = (ruleName: string) => {
  cy.contains(RULE_NAME, ruleName).click();

  cy.get(PAGE_CONTENT_SPINNER).should('be.visible');
  cy.contains(RULE_NAME_HEADER, ruleName).should('be.visible');
  cy.get(PAGE_CONTENT_SPINNER).should('not.exist');
};

export const openIntegrationsPopover = () => {
  cy.get(INTEGRATIONS_POPOVER).click();
};

export const selectRulesByName = (ruleNames: Readonly<string[]>) => {
  for (const ruleName of ruleNames) {
    selectRuleByName(ruleName);
  }
};

export const unselectRulesByName = (ruleNames: Readonly<string[]>) => {
  for (const ruleName of ruleNames) {
    unselectRuleByName(ruleName);
  }
};

export const selectAllRules = () => {
  cy.log('Select all rules');
  cy.get(SELECT_ALL_RULES_BTN).contains('Select all').click();
  cy.get(SELECT_ALL_RULES_BTN).contains('Clear');
};

export const selectAllRulesOnPage = () => {
  cy.log('Select all rules on page');
  cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).check();
  cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).should('be.checked');
};

export const clearAllRuleSelection = () => {
  cy.log('Clear all rules selection');
  cy.get(SELECT_ALL_RULES_BTN).contains('Clear').click();
  cy.get(SELECT_ALL_RULES_BTN).contains('Select all');
};

export const confirmRulesDelete = () => {
  cy.get(RULES_DELETE_CONFIRMATION_MODAL).should('be.visible');
  cy.get(MODAL_CONFIRMATION_BTN).click();
  cy.get(RULES_DELETE_CONFIRMATION_MODAL).should('not.exist');
};

/**
 * Because the Rule Management page is relatively slow, in order to avoid timeouts and flakiness,
 * we almost always want to wait until the Rules table is "loaded" before we do anything with it.
 *
 * This task should be sufficient for the vast majority of the tests. It waits for the table
 * to show up on the page, but doesn't wait until it is fully loaded and filled with rows.
 *
 * @example
 * beforeEach(() => {
 *   visit(DETECTIONS_RULE_MANAGEMENT_URL); // returns on "load" event, still lots of work to do
 *   waitForRulesTableToShow(); // a lot has done in React and the table shows up on the page
 * });
 */
export const waitForRulesTableToShow = () => {
  // Wait up to 5 minutes for the table to show up as in CI containers this can be very slow
  cy.get(RULES_MANAGEMENT_TABLE, { timeout: 300000 }).should('exist');
};

export const waitForRulesTableToBeRefreshed = () => {
  cy.get(RULES_TABLE_REFRESH_INDICATOR).should('exist');
  cy.get(RULES_TABLE_REFRESH_INDICATOR).should('not.exist');
};

export const waitForPrebuiltDetectionRulesToBeLoaded = () => {
  cy.log('Wait for prebuilt rules to be loaded');
  cy.get(ADD_ELASTIC_RULES_EMPTY_PROMPT_BTN, { timeout: 300000 }).should('not.exist');
  cy.get(RULES_MANAGEMENT_TABLE).should('exist');
  cy.get(RULES_TABLE_REFRESH_INDICATOR).should('not.exist');
};

/**
 * Wait till the rules on the rules management page get updated, i.e., there are
 * no rules with the loading indicator on the page. Rules display a loading
 * indicator after some actions such as enable, disable, or bulk actions.
 */
export const waitForRuleToUpdate = () => {
  cy.log('Wait for rules to update');
  cy.get(RULE_SWITCH_LOADER, { timeout: 300000 }).should('exist');
  cy.get(RULE_SWITCH_LOADER, { timeout: 300000 }).should('not.exist');
};

export const importRules = (rulesFile: string) => {
  cy.get(RULE_IMPORT_MODAL).click();
  cy.get(INPUT_FILE).click();
  cy.get(INPUT_FILE).selectFile(rulesFile);
  cy.get(INPUT_FILE).trigger('change');
  cy.get(RULE_IMPORT_MODAL_BUTTON).last().click();
  cy.get(INPUT_FILE, { timeout: 300000 }).should('not.exist');
};

export const expectRulesManagementTab = () => {
  cy.log(`Expecting rules management tab to be selected`);
  cy.get(RULES_MANAGEMENT_TAB).should('have.attr', 'aria-selected');
};

export const expectRulesMonitoringTab = () => {
  cy.log(`Expecting rules monitoring tab to be selected`);
  cy.get(RULES_MONITORING_TAB).should('have.attr', 'aria-selected');
};

export const expectFilterSearchTerm = (searchTerm: string) => {
  cy.log(`Expecting rules table filtering by search term '${searchTerm}'`);
  cy.get(RULE_SEARCH_FIELD).should('have.value', searchTerm);
};

export const expectFilterByTags = (tags: string[]) => {
  cy.log(`Expecting rules table filtering by tags [${tags.join(', ')}]`);

  cy.get(RULES_TAGS_FILTER_BTN).contains(`Tags${tags.length}`).click();

  cy.get(RULES_TAGS_FILTER_POPOVER)
    .find(RULES_SELECTED_TAG)
    .should('have.length', tags.length)
    .each(($el, index) => {
      cy.wrap($el).contains(tags[index]);
    });
};

export const expectNoFilterByTags = () => {
  cy.log(`Expecting rules table has no filtering by tags`);
  cy.get(RULES_TAGS_FILTER_BTN).contains('Tags').click();
  cy.get(RULES_TAGS_FILTER_POPOVER).find(RULES_SELECTED_TAG).should('not.exist');
};

export const expectFilterByPrebuiltRules = () => {
  cy.log(`Expecting rules table filtering by prebuilt rules`);
  cy.get(`${ELASTIC_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('exist');
};

export const expectFilterByCustomRules = () => {
  cy.log(`Expecting rules table filtering by custom rules`);
  cy.get(`${CUSTOM_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('exist');
};

export const expectNoFilterByElasticOrCustomRules = () => {
  cy.log(`Expecting rules table has no filtering by either elastic nor custom rules`);
  cy.get(ELASTIC_RULES_BTN).should('exist');
  cy.get(`${ELASTIC_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('not.exist');
  cy.get(CUSTOM_RULES_BTN).should('exist');
  cy.get(`${CUSTOM_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('not.exist');
};

export const expectFilterByEnabledRules = () => {
  cy.log(`Expecting rules table filtering by enabled rules`);
  cy.get(`${ENABLED_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('exist');
};

export const expectFilterByDisabledRules = () => {
  cy.log(`Expecting rules table filtering by disabled rules`);
  cy.get(`${DISABLED_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('exist');
};

export const expectNoFilterByEnabledOrDisabledRules = () => {
  cy.log(`Expecting rules table has no filtering by either enabled nor disabled rules`);
  cy.get(ENABLED_RULES_BTN).should('exist');
  cy.get(`${ENABLED_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('not.exist');
  cy.get(DISABLED_RULES_BTN).should('exist');
  cy.get(`${DISABLED_RULES_BTN}.euiFilterButton-hasActiveFilters`).should('not.exist');
};

export const expectNumberOfRules = (
  tableSelector: typeof RULES_MANAGEMENT_TABLE | typeof RULES_MONITORING_TABLE,
  expectedNumber: number
) => {
  cy.log(`Expecting rules table to contain #${expectedNumber} rules`);
  cy.get(tableSelector).find(RULES_ROW).should('have.length', expectedNumber);
};

export const expectToContainRule = (
  tableSelector: typeof RULES_MANAGEMENT_TABLE | typeof RULES_MONITORING_TABLE,
  ruleName: string
) => {
  cy.log(`Expecting rules table to contain '${ruleName}'`);
  cy.get(tableSelector).find(RULES_ROW).should('include.text', ruleName);
};

const selectOverwriteRulesImport = () => {
  cy.get(RULE_IMPORT_OVERWRITE_CHECKBOX).check({ force: true });
  cy.get(RULE_IMPORT_OVERWRITE_CHECKBOX).should('be.checked');
};

export const expectManagementTableRules = (ruleNames: string[]): void => {
  expectNumberOfRules(RULES_MANAGEMENT_TABLE, ruleNames.length);

  for (const ruleName of ruleNames) {
    expectToContainRule(RULES_MANAGEMENT_TABLE, ruleName);
  }
};

const selectOverwriteExceptionsRulesImport = () => {
  cy.get(RULE_IMPORT_OVERWRITE_EXCEPTIONS_CHECKBOX).check({ force: true });
  cy.get(RULE_IMPORT_OVERWRITE_EXCEPTIONS_CHECKBOX).should('be.checked');
};

const selectOverwriteConnectorsRulesImport = () => {
  cy.get(RULE_IMPORT_OVERWRITE_CONNECTORS_CHECKBOX).check({ force: true });
  cy.get(RULE_IMPORT_OVERWRITE_CONNECTORS_CHECKBOX).should('be.checked');
};

export const importRulesWithOverwriteAll = (rulesFile: string) => {
  cy.get(RULE_IMPORT_MODAL).click();
  cy.get(INPUT_FILE).click({ force: true });
  cy.get(INPUT_FILE).selectFile(rulesFile);
  cy.get(INPUT_FILE).trigger('change');
  selectOverwriteRulesImport();
  selectOverwriteExceptionsRulesImport();
  selectOverwriteConnectorsRulesImport();
  cy.get(RULE_IMPORT_MODAL_BUTTON).last().click();
  cy.get(INPUT_FILE).should('not.exist');
};

export const testTagsBadge = ($el: JQuery<HTMLElement>, tags: string[]) => {
  // open tags popover
  cy.wrap($el).click();
  cy.get(RULES_TAGS_POPOVER_WRAPPER).should('have.text', tags.join(''));
  // close tags popover
  cy.wrap($el).click();
};

export const testAllTagsBadges = (tags: string[]) => {
  cy.get(RULES_TAGS_POPOVER_BTN).each(($el) => {
    testTagsBadge($el, tags);
  });
};

export const testMultipleSelectedRulesLabel = (rulesCount: number) => {
  cy.get(SELECTED_RULES_NUMBER_LABEL).should('have.text', `Selected ${rulesCount} rules`);
};

const openRefreshSettingsPopover = () => {
  cy.get(REFRESH_SETTINGS_SWITCH).should('not.exist');
  cy.get(AUTO_REFRESH_POPOVER_TRIGGER_BUTTON).click();
  cy.get(REFRESH_SETTINGS_SWITCH).should('be.visible');
};

const closeRefreshSettingsPopover = () => {
  cy.get(REFRESH_SETTINGS_SWITCH).should('be.visible');
  cy.get(AUTO_REFRESH_POPOVER_TRIGGER_BUTTON).click();
  cy.get(REFRESH_SETTINGS_SWITCH).should('not.exist');
};

export const expectAutoRefreshIsDisabled = () => {
  cy.get(AUTO_REFRESH_POPOVER_TRIGGER_BUTTON).should('be.enabled');
  cy.get(AUTO_REFRESH_POPOVER_TRIGGER_BUTTON).should('have.text', 'Off');
  openRefreshSettingsPopover();
  cy.get(REFRESH_SETTINGS_SWITCH).should('have.attr', 'aria-checked', 'false');
  closeRefreshSettingsPopover();
};

export const expectAutoRefreshIsEnabled = () => {
  cy.get(AUTO_REFRESH_POPOVER_TRIGGER_BUTTON).should('be.enabled');
  cy.get(AUTO_REFRESH_POPOVER_TRIGGER_BUTTON).should('have.text', 'On');
  openRefreshSettingsPopover();
  cy.get(REFRESH_SETTINGS_SWITCH).should('have.attr', 'aria-checked', 'true');
  closeRefreshSettingsPopover();
};

// Expects the auto refresh to be deactivated which means it's disabled without an ability to enable it
// so it's even impossible to open the popover
export const expectAutoRefreshIsDeactivated = () => {
  cy.get(AUTO_REFRESH_POPOVER_TRIGGER_BUTTON).should('be.disabled');
  cy.get(AUTO_REFRESH_POPOVER_TRIGGER_BUTTON).should('have.text', 'Off');
};

export const disableAutoRefresh = () => {
  openRefreshSettingsPopover();
  cy.get(REFRESH_SETTINGS_SWITCH).click();
  expectAutoRefreshIsDisabled();
};

export const mockGlobalClock = () => {
  /**
   * Ran into the error: timer created with setInterval() but cleared with cancelAnimationFrame()
   * There are no cancelAnimationFrames in the codebase that are used to clear a setInterval so
   * explicitly set the below overrides. see https://docs.cypress.io/api/commands/clock#Function-names
   */

  cy.clock(Date.now(), ['setInterval', 'clearInterval', 'Date']);
};

export const cancelConfirmationModal = () => {
  cy.get(MODAL_CONFIRMATION_CANCEL_BTN).click();
  cy.get(MODAL_CONFIRMATION_BODY).should('not.exist');
};

export const clickErrorToastBtn = () => {
  cy.get(TOASTER_ERROR_BTN).click();
};

export const closeErrorToast = () => {
  cy.get(TOASTER_CLOSE_ICON).click();
};

export const goToEditRuleActionsSettingsOf = (name: string) => {
  goToRuleDetailsOf(name);
  goToRuleEditSettings();
  // wait until first step loads completely. Otherwise cypress stuck at the first edit page
  cy.get(EDIT_SUBMIT_BUTTON).should('be.enabled');
  goToActionsStepTab();
};

export const getRuleRow = (ruleName: string) => cy.contains(RULE_NAME, ruleName).parents(RULES_ROW);

const selectRuleByName = (ruleName: string) => {
  cy.log(`Select rule "${ruleName}"`);
  getRuleRow(ruleName).find(EUI_CHECKBOX).check();
  cy.log(`Make sure rule "${ruleName}" has been selected`);
  getRuleRow(ruleName).find(EUI_CHECKBOX).should('be.checked');
};

const unselectRuleByName = (ruleName: string) => {
  cy.log(`Unselect rule "${ruleName}"`);
  getRuleRow(ruleName).find(EUI_CHECKBOX).uncheck();
  cy.log(`Make sure rule "${ruleName}" has been unselected`);
  getRuleRow(ruleName).find(EUI_CHECKBOX).should('not.be.checked');
};

/**
 * Set Kibana `securitySolution:rulesTableRefresh` setting looking like
 *
 * ```
 * { "on": true, "value": 60000 }
 * ```
 *
 * @param enabled whether the auto-refresh is enabled
 * @param refreshInterval refresh interval in milliseconds
 */
export const setRulesTableAutoRefreshIntervalSetting = ({
  enabled,
  refreshInterval,
}: {
  enabled: boolean;
  refreshInterval: number; // milliseconds
}) => {
  setKibanaSetting(
    DEFAULT_RULES_TABLE_REFRESH_SETTING,
    JSON.stringify({
      on: enabled,
      value: refreshInterval,
    })
  );
};
