/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/jest/jest_integration',
  rootDir: '../../../../../..',
  roots: ['<rootDir>/x-pack/solutions/security/plugins/security_solution/public'],
  testPathIgnorePatterns: [
    '/detection_engine/rule_creation_ui/components/step_define_rule/integration_tests/',
    '/detection_engine/rule_management_ui/pages/rule_management/integration_tests/',
  ],
};
