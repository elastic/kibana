/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/jest',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/solutions/observability/plugins/nightshift'],
  moduleNameMapper: {
    // Icon SVGs are static ESM assets. Jest does not transform them, and the
    // menus import them so the glyphs paint with the menu instead of after it.
    '^@elastic/eui/es/components/icon/assets/(.*)$':
      '<rootDir>/x-pack/solutions/observability/plugins/nightshift/public/pages/automations/__mocks__/eui_icon_assets.js',
  },
};
