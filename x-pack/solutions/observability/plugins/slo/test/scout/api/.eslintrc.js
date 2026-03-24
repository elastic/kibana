/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  rules: {
    // Many SLO tests use `apiServices.slo` from a worker fixture or `sloApi` from suite `beforeAll`; the rule only recognizes direct `apiClient` / `apiServices` use inside each test callback.
    '@kbn/eslint/scout_require_api_client_in_api_test': 'off',
  },
};
