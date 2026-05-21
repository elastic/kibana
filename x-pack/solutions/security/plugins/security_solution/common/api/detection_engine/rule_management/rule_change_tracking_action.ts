/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Security solution domain specific rule change
 * tracking actions to cover operations like
 * prebuilt rules installation and upgrade.
 */
export enum SecurityRuleChangeTrackingAction {
  ruleInstall = 'rule_install',
  ruleUpgrade = 'rule_upgrade',
  ruleDuplicate = 'rule_duplicate',
  ruleImport = 'rule_import',
  ruleRevert = 'rule_revert',
}
