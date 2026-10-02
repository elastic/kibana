/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as base, tags } from '@kbn/scout-security';
import {
  enrollEndpointHost,
  FLEET_AND_HOST_TIMEOUT_MS,
  type EnrolledEndpoint,
} from '../../fixtures/enroll_endpoint';

export { tags };
export type { EnrolledEndpoint };

interface EdrRealFleetApiWorkerFixtures {
  enrolledEndpoint: EnrolledEndpoint;
}

export const apiTest = base.extend<{}, EdrRealFleetApiWorkerFixtures>({
  enrolledEndpoint: [
    async ({ kbnClient, esClient, log }, use) => {
      await enrollEndpointHost(
        {
          kbnClient,
          esClient,
          log,
          policyNamePrefix: 'host-isolation',
          hostnamePrefix: 'test-host-iso',
        },
        use
      );
    },
    { scope: 'worker', timeout: FLEET_AND_HOST_TIMEOUT_MS },
  ],
});
