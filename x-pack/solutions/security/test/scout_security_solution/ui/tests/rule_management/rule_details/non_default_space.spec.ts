/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags } from '../../../fixtures';

test.describe.skip(
  'Rule details - non default space',
  { tag: [...tags.stateful.classic] },
  () => {
    test.skip('rule details in custom space', () => {
      // Requires space creation and rule in that space
    });
  }
);
