/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags } from '../../../fixtures';

test.describe(
  'Privileged User Monitoring - Integrations onboarding',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.skip('should install okta integration and display the dashboard when opening privileged user monitoring page', async () => {
      // Requires cleanFleet, installIntegration, waitForPackageInstalled - complex Fleet setup
    });
  }
);
