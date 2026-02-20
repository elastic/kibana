/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 *
 * Failing: See https://github.com/elastic/kibana/issues/237554
 * Failing: See https://github.com/elastic/kibana/issues/237553
 */

import { test, tags } from '../../../fixtures';

test.describe(
  'Privileged User Monitoring - Index onboarding',
  { tag: tags.stateful.classic },
  () => {
    test.skip('starts the engine with an index containing a valid user', async () => {
      // Migrated from Cypress - skipped due to known failures
    });

    test.skip('creates a new index and starts the engine', async () => {
      // Migrated from Cypress - skipped due to known failures
    });
  }
);
