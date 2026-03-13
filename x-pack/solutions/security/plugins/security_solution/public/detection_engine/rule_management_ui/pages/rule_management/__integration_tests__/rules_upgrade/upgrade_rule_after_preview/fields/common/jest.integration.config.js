/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test/jest_integration',
  rootDir: '../../../../../../../../../../../../../../..',
  roots: [
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/detection_engine/rule_management_ui/pages/rule_management/__integration_tests__/rules_upgrade/upgrade_rule_after_preview/fields/common',
  ],
  // Override the preset's testMatch because the directory uses __integration_tests__
  // (double underscores) while the preset pattern matches integration_tests (no underscores).
  testMatch: ['**/__integration_tests__/**/*.test.{js,mjs,ts,tsx}'],
  openHandlesTimeout: 0,
  forceExit: true,
};
