/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
const { createNoRestrictedImportsOverride } = require('@kbn/eslint-rule-overrides');

/**
 * @typedef {Object} RestrictedImportPath
 * @property {string} name - The name of the module to restrict.
 * @property {string} [message] - Custom message appended to the lint error.
 * @property {string[]} [importNames] - Specific named imports to restrict.
 * @property {string[]} [allowImportNames] - Named imports to allow (restricts all others).
 */

/** @type {Array.<RestrictedImportPath>} */
const RESTRICTED_IMPORTS = [
  {
    name: 'enzyme',
    message: 'Please use @testing-library/react instead',
  },
];

const overrides = createNoRestrictedImportsOverride({ restrictedImports: RESTRICTED_IMPORTS });

/** @type {import('eslint').Linter.Config} */
module.exports = {
  overrides,
};
