/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
const { createNoRestrictedImportsOverride } = require('@kbn/eslint-rule-overrides');

const RESTRICTED_IMPORTS = [
  {
    name: 'enzyme',
    message: 'Please use @testing-library/react instead',
  },
];

const overrides = createNoRestrictedImportsOverride({
  childConfigDir: __dirname,
  restrictedImports: RESTRICTED_IMPORTS,
});

/** @type {import('eslint').Linter.Config} */
module.exports = {
  overrides,
};
