/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest } from '../fixtures';
import {
  seedEndpointHosts,
  type SeededEndpointHosts,
} from '../../../edr_response_actions/common/seed_endpoint_hosts';
import {
  PARALLEL_HOST_SEED_TIMEOUT_MS,
  requireHost,
} from '../../../edr_response_actions/common/get_file_spec_helpers';

// Local only: the seeder needs the file-realm system-indices user, which Cloud serverless does not have.
// Positive control: endpoint_details_insights.spec.ts shows the section on the Complete tier.
spaceTest.describe(
  'Endpoint details workflow insights on Security Essentials',
  { tag: ['@local-serverless-security_essentials'] },
  () => {
    let seeded: SeededEndpointHosts | undefined;

    spaceTest.beforeAll(async ({ esClient, kbnClient, scoutSpace, config }) => {
      spaceTest.setTimeout(PARALLEL_HOST_SEED_TIMEOUT_MS);
      seeded = await seedEndpointHosts({
        esClient,
        kbnClient,
        spaceId: scoutSpace.id,
        config,
        count: 1,
        isolation: false,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      // Asks for the workflow insights sub-feature, so only the Essentials tier can hide it.
      await browserAuth.loginAsSecurityRole('endpoint_operations_analyst');
    });

    spaceTest.afterAll(async () => {
      await seeded?.cleanup();
    });

    spaceTest(
      'hides the insights section on the endpoint details flyout',
      async ({ pageObjects }) => {
        const { agentId } = requireHost(seeded);
        const { endpointDetailsInsights } = pageObjects;

        await spaceTest.step('open the endpoint details flyout', async () => {
          await endpointDetailsInsights.goto(agentId);
          await expect(endpointDetailsInsights.detailsList).toBeVisible();
        });

        await spaceTest.step('the insights section is not rendered', async () => {
          await expect(endpointDetailsInsights.wrapper).toHaveCount(0);
        });
      }
    );
  }
);
