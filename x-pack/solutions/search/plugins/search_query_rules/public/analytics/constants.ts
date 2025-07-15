/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AnalyticsEvents {
  // Empty promp actions
  gettingStartedButtonClicked = 'getting_started_button_clicked',
  createInConsoleClicked = 'create_in_console_clicked',
  emptyPromptLoaded = 'empty_prompt_loaded',

  // Error prompt loaded
  genericErrorPromptLoaded = 'generic_error_prompt_loaded',
  notFoundErrorPromptLoaded = 'not_found_error_prompt_loaded',
  missingPermissionsErrorPromptLoaded = 'missing_permissions_error_prompt_loaded',

  rulesetCreateClicked = 'ruleset_create_clicked',
  rulesetUpdateClicked = 'ruleset_update_clicked',

  // ruleset detail page actions
  rulesetDetailPageLoaded = 'ruleset_details_page_loaded',
  addRuleClicked = 'add_rule_clicked',
  editRuleClicked = 'edit_rule_clicked',
  deleteRuleClicked = 'delete_rule_clicked',
  testInConsoleClicked = 'test_in_console_clicked',
  deleteRulesetFromHeaderClicked = 'delete_ruleset_from_header_clicked',
  backToRulesetListClicked = 'back_to_ruleset_list_clicked',

  rulesReordered = 'rules_reordered',
  ruleFlyoutDocumentsReordered = 'rule_flyout_documents_reordered',

  // ruleset list page actions
  editRulesetInlineNameClicked = 'edit_ruleset_inline_name_clicked',
  editRulesetInlineDropdownClicked = 'edit_ruleset_inline_dropdown_clicked',
  rulesetListPageLoaded = 'ruleset_list_page_loaded',
  deleteRulesetInlineDropdownClicked = 'delete_ruleset_inline_dropdown_clicked',
  testRulesetInlineDropdownClicked = 'test_ruleset_inline_dropdown_clicked',
  rulesetSearched = 'ruleset_searched',
  addRulesetClicked = 'add_ruleset_clicked',
}
