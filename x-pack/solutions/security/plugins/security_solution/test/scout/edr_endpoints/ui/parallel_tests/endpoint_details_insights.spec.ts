/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../fixtures';
import { mockIdleWorkflowInsights, mockInferenceConnectors } from '../fixtures/mocks';
import {
  seedEndpointHosts,
  type SeededEndpointHosts,
} from '../../../edr_response_actions/common/seed_endpoint_hosts';
import {
  PARALLEL_HOST_SEED_TIMEOUT_MS,
  requireHost,
} from '../../../edr_response_actions/common/get_file_spec_helpers';

const CONNECTOR = { connectorId: 'scout-insights-connector', name: 'AB-TEST-CONNECTOR' } as const;

spaceTest.describe(
  'Endpoint details workflow insights',
  { tag: [...tags.stateful.classic, '@local-serverless-security_complete'] },
  () => {
    let seeded: SeededEndpointHosts | undefined;

    spaceTest.beforeAll(async ({ esClient, kbnClient, scoutSpace, config }) => {
      spaceTest.setTimeout(PARALLEL_HOST_SEED_TIMEOUT_MS);
      // Serverless forces xpack.spaces.allowSolutionVisibility off, so the solution view
      // cannot be set there. A security project already is that view.
      if (!config.serverless) {
        await scoutSpace.setSolutionView('security');
      }
      seeded = await seedEndpointHosts({
        esClient,
        kbnClient,
        spaceId: scoutSpace.id,
        config,
        count: 1,
        isolation: false,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, page }) => {
      // Has the workflow insights read and write sub-feature. Same default role as Cypress.
      await browserAuth.loginAsSecurityRole('endpoint_operations_analyst');
      // The scan state machine is covered by the RTL integration test; here the backend only
      // has to report a connector and no running scan, so Scan can be enabled.
      await mockInferenceConnectors(page, CONNECTOR);
      await mockIdleWorkflowInsights(page);
    });

    spaceTest.afterAll(async () => {
      await seeded?.cleanup();
    });

    spaceTest(
      'shows the insights section with the connector and an enabled Scan button',
      async ({ pageObjects }) => {
        const { agentId } = requireHost(seeded);
        const { endpointDetailsInsights } = pageObjects;

        await spaceTest.step('open the endpoint details flyout', async () => {
          await endpointDetailsInsights.goto(agentId);
          await expect(endpointDetailsInsights.wrapper).toBeVisible();
        });

        await spaceTest.step('the connector is selected and Scan is enabled', async () => {
          await expect(endpointDetailsInsights.connectorSelector).toContainText(CONNECTOR.name);
          await expect(endpointDetailsInsights.scanButton).toBeEnabled();
        });
      }
    );
  }
);
