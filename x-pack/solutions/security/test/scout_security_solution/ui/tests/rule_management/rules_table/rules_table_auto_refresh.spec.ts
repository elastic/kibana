/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags } from '../../../fixtures';

test.describe.skip(
  'Rules table: auto-refresh',
  { tag: [...tags.stateful.classic] },
  () => {
    test.skip('gets deactivated when any rule selected and activated after rules unselected', () => {
      // Requires installMockPrebuiltRulesPackage, setRulesTableAutoRefreshIntervalSetting, mockGlobalClock
    });

    test.skip('refreshes rules table at set interval', () => {});

    test.skip('can be disabled via settings', () => {});
  }
);
