/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import {
  NIGHTSHIFT_READ_ONLY_ROLE,
  NO_NIGHTSHIFT_ROLE,
  apiTest,
  listRecommendedSources,
} from '../fixtures';

apiTest.describe(
  'Nightshift recommended sources authorization',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'allows readers and denies users without Nightshift privileges',
      async ({ apiClient, samlAuth }) => {
        const reader = await samlAuth.asInteractiveUser(NIGHTSHIFT_READ_ONLY_ROLE);
        expect(await listRecommendedSources(apiClient, reader.cookieHeader)).toHaveStatusCode(200);

        const unprivileged = await samlAuth.asInteractiveUser(NO_NIGHTSHIFT_ROLE);
        expect(await listRecommendedSources(apiClient, unprivileged.cookieHeader)).toHaveStatusCode(
          403
        );
      }
    );
  }
);
