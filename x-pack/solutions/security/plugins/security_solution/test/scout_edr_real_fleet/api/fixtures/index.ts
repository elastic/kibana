/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as baseApiTest, tags } from '@kbn/scout-security';
import {
  FLEET_AND_HOST_TIMEOUT_MS,
  withEnrolledEndpoint,
  type EnrolledEndpoint,
} from '../../fixtures/enrolled_endpoint';

export { tags };
export type { EnrolledEndpoint };

export const apiTest = baseApiTest.extend<{}, { enrolledEndpoint: EnrolledEndpoint }>({
  enrolledEndpoint: [
    async ({ kbnClient, esClient, log }, use) => {
      await withEnrolledEndpoint({ kbnClient, esClient, log }, use);
    },
    { scope: 'worker', timeout: FLEET_AND_HOST_TIMEOUT_MS },
  ],
});
