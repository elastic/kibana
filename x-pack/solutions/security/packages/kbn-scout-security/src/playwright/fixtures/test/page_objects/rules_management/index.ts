/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Rules Management Page Object Module
 *
 * This module exports the refactored Rules Management page object and its components.
 * The page object follows a composition pattern with specialized action classes
 * for different feature domains.
 *
 * @example
 * ```typescript
 * import { RulesManagementPage } from './page_objects/rules_management';
 *
 * // Use the page object
 * const rulesPage = new RulesManagementPage(page);
 * await rulesPage.navigation.navigateAndDismissOnboarding();
 * await rulesPage.selection.selectRuleByCheckbox(ruleId);
 * await rulesPage.assertions.expectRuleVisible(ruleName);
 * ```
 */

export { RulesManagementPage } from './rules_management_page';
export { RulesManagementLocators } from './rules_management_locators';
export { RulesManagementAssertions } from './rules_management_assertions';
export { NavigationActions } from './navigation_actions';
export { RuleSelectionActions } from './rule_selection_actions';
export { RuleActions } from './rule_actions';
export { SearchFilterActions } from './search_filter_actions';
export { TableOperations } from './table_operations';
