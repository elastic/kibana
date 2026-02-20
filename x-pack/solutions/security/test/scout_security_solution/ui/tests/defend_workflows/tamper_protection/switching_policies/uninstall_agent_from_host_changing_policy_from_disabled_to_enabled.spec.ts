/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'Tamper protection - uninstall agent changing policy from disabled to enabled',
  { tag: [...tags.stateful.classic] },
  () => {
    test.skip('requires real host + policy switch', async () => {});
  }
);
