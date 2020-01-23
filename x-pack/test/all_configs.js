/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const alwaysImportedTests = [require.resolve('./functional/config.js')];
const onlyNotInCoverageTests = [
  require.resolve('./reporting/configs/chromium_api.js'),
  require.resolve('./reporting/configs/chromium_functional.js'),
  require.resolve('./reporting/configs/generate_api.js'),
  require.resolve('./functional_with_es_ssl/config.ts'),
  require.resolve('./functional/config_security_basic.js'),
  require.resolve('./api_integration/config_security_basic.js'),
  require.resolve('./api_integration/config.js'),
  require.resolve('./alerting_api_integration/spaces_only/config.ts'),
  require.resolve('./alerting_api_integration/security_and_spaces/config.ts'),
  require.resolve('./plugin_api_integration/config.js'),
  require.resolve('./plugin_functional/config.ts'),
  require.resolve('./kerberos_api_integration/config.ts'),
  require.resolve('./kerberos_api_integration/anonymous_access.config.ts'),
  require.resolve('./saml_api_integration/config.ts'),
  require.resolve('./token_api_integration/config.js'),
  require.resolve('./oidc_api_integration/config.ts'),
  require.resolve('./oidc_api_integration/implicit_flow.config.ts'),
  require.resolve('./pki_api_integration/config.ts'),
  require.resolve('./spaces_api_integration/spaces_only/config.ts'),
  require.resolve('./spaces_api_integration/security_and_spaces/config_trial.ts'),
  require.resolve('./spaces_api_integration/security_and_spaces/config_basic.ts'),
  require.resolve('./saved_object_api_integration/security_and_spaces/config_trial.ts'),
  require.resolve('./saved_object_api_integration/security_and_spaces/config_basic.ts'),
  require.resolve('./saved_object_api_integration/security_only/config_trial.ts'),
  require.resolve('./saved_object_api_integration/security_only/config_basic.ts'),
  require.resolve('./saved_object_api_integration/spaces_only/config.ts'),
  require.resolve('./ui_capabilities/security_and_spaces/config.ts'),
  require.resolve('./ui_capabilities/security_only/config.ts'),
  require.resolve('./ui_capabilities/spaces_only/config.ts'),
  require.resolve('./upgrade_assistant_integration/config.js'),
  require.resolve('./licensing_plugin/config.ts'),
  require.resolve('./licensing_plugin/config.public.ts'),
  require.resolve('./licensing_plugin/config.legacy.ts'),
];

module.exports = {
  ALL: [...alwaysImportedTests, ...onlyNotInCoverageTests],
  FOR_COVERAGE: alwaysImportedTests,
};
