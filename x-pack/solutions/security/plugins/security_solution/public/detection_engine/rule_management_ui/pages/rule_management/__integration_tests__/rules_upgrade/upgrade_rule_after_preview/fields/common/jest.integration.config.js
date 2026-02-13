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
  openHandlesTimeout: 0,
  forceExit: true,
};
