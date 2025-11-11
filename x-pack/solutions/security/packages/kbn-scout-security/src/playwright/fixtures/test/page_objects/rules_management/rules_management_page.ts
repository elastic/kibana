/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { RulesManagementLocators } from './rules_management_locators';
import { NavigationActions } from './navigation_actions';
import { RuleSelectionActions } from './rule_selection_actions';
import { RuleActions } from './rule_actions';
import { SearchFilterActions } from './search_filter_actions';
import { TableOperations } from './table_operations';
import { RulesManagementAssertions } from './rules_management_assertions';

/**
 * Page Object for the Rules Management page in Kibana Security Solution
 *
 * This page allows users to manage detection rules, including creating, editing,
 * enabling/disabling, and organizing rules.
 *
 * This class acts as an orchestrator, delegating to specialized action classes
 * for different feature domains (navigation, selection, actions, filtering).
 *
 * @example
 * ```typescript
 * // Navigate and interact with rules
 * await rulesManagementPage.navigation.navigateAndDismissOnboarding();
 * await rulesManagementPage.selection.selectRuleByCheckbox(ruleId);
 * await rulesManagementPage.ruleActions.toggleRuleSwitch(0);
 * await rulesManagementPage.assertions.expectRuleVisible(ruleName);
 * ```
 */
export class RulesManagementPage {
  /**
   * Locators for all Rules Management elements
   *
   * Note: Prefer using the action classes (navigation, selection, etc.)
   * over accessing locators directly. Locators are exposed for flexibility in tests
   * that need direct element access.
   */
  public readonly locators: RulesManagementLocators;

  /**
   * Actions related to navigation and tab switching
   */
  public readonly navigation: NavigationActions;

  /**
   * Actions related to rule selection
   */
  public readonly selection: RuleSelectionActions;

  /**
   * Actions related to rule CRUD operations
   * (toggle, edit, duplicate, delete, manual run)
   */
  public readonly ruleActions: RuleActions;

  /**
   * Actions related to searching and filtering
   */
  public readonly filter: SearchFilterActions;

  /**
   * Operations related to the rules table
   * (wait, refresh, get count)
   */
  public readonly table: TableOperations;

  /**
   * Assertion methods for verifying Rules Management state
   * (expect* methods)
   */
  public readonly assertions: RulesManagementAssertions;

  constructor(page: ScoutPage) {
    // Initialize locators (shared by all action classes)
    this.locators = new RulesManagementLocators(page);

    // Initialize table operations first (needed by filter actions)
    this.table = new TableOperations(this.locators);

    // Initialize action classes with dependencies
    this.navigation = new NavigationActions(page, this.locators);
    this.selection = new RuleSelectionActions(this.locators);
    this.ruleActions = new RuleActions(this.locators);
    this.filter = new SearchFilterActions(page, this.locators, this.table);
    this.assertions = new RulesManagementAssertions(this.locators, this.table);
  }
}
