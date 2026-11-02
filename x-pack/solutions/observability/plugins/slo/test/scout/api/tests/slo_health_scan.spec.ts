/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Failing in FTR — see https://github.com/elastic/kibana/issues/258358
 * Ported from `apis/slo/health_scan.ts` (was describe.skip). Re-enable when fixed.
 */
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest } from '../fixtures';

// eslint-disable-next-line playwright/no-skipped-test -- parity with FTR describe.skip; tracked in #258358
apiTest.describe.skip(
  'Health Scan (FTR parity — skipped)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'placeholder — enable when https://github.com/elastic/kibana/issues/258358 is fixed',
      async ({ apiClient }) => {
        void apiClient.get;
        expect(true).toBe(true);
      }
    );
  }
);
