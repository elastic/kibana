/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  overrides: [
    {
      // Playwright eval spec files are test code excluded from the plugin's main
      // tsconfig. They legitimately import devOnly packages (@kbn/evals, @kbn/scout).
      files: ['*.spec.ts'],
      rules: {
        '@kbn/imports/no_boundary_crossing': 'off',
      },
    },
  ],
};
