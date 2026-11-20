/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest } from '../fixtures';
import { seedEndpointHosts, type SeededEndpointHosts } from '../../common/seed_endpoint_hosts';
import { PARALLEL_HOST_SEED_TIMEOUT_MS, requireHost } from '../../common/get_file_spec_helpers';

// Local only: the seeder needs the file-realm system-indices user, which Cloud serverless does not have.
spaceTest.describe(
  'Endpoint list row actions on Security Essentials',
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
        isolation: true,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsSecurityRole('endpoint_operations_analyst');
    });

    spaceTest.afterAll(async () => {
      await seeded?.cleanup();
    });

    spaceTest(
      'offers Release but not Respond in the row actions of an isolated host',
      async ({ pageObjects }) => {
        const host = requireHost(seeded);
        const { endpointList } = pageObjects;

        await spaceTest.step('the row action menu offers Release', async () => {
          await endpointList.goto();
          await expect(endpointList.rowFor(host.hostname)).toBeVisible();
          await endpointList.openRowActions(host.hostname);
          await expect(endpointList.rowActionsMenu).toBeVisible();
          await expect(endpointList.releaseMenuItem).toBeVisible();
        });

        await spaceTest.step('the row action menu does not offer Respond', async () => {
          await expect(endpointList.respondInRowActionsMenu).toHaveCount(0);
        });
      }
    );
  }
);
