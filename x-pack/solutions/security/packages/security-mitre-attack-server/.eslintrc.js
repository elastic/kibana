/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  overrides: [
    // This package is Node.js-only (shared-server). Allow Node.js built-in imports
    // (fs, path, etc.) throughout; used by load_artifact.ts and build scripts.
    {
      files: ['**/*.{js,mjs,ts,tsx}'],
      rules: {
        'import/no-nodejs-modules': 'off',
      },
    },
  ],
};
