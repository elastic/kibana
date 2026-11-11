/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../fixtures';
import { captureEndpointAction } from '../fixtures/page_objects/host_isolation_form';
import { seedEndpointHosts, type SeededEndpointHosts } from '../../common/seed_endpoint_hosts';
import {
  completeHostAction,
  deleteSubmittedHostActions,
  waitForHostIsolation,
} from '../../common/complete_host_action';
import { PARALLEL_HOST_SEED_TIMEOUT_MS, requireHost } from '../../common/get_file_spec_helpers';

// Submit, the action-details poll, the agent-status poll and the list reload do not fit in the default 60s.
const ISOLATE_FLOW_TIMEOUT_MS = 240_000;

spaceTest.describe(
  'Response console isolate from the endpoint list',
  { tag: tags.stateful.classic },
  () => {
    spaceTest.setTimeout(ISOLATE_FLOW_TIMEOUT_MS);

    let seeded: SeededEndpointHosts | undefined;
    const submittedActionIds: string[] = [];

    spaceTest.beforeAll(async ({ esClient, kbnClient, scoutSpace, config }) => {
      spaceTest.setTimeout(PARALLEL_HOST_SEED_TIMEOUT_MS);
      await scoutSpace.setSolutionView('security');
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
      await browserAuth.loginAsSecurityRole('endpoint_operations_analyst');
    });

    spaceTest.afterAll(async ({ esClient, config }) => {
      const failures: unknown[] = [];
      for (const cleanup of [
        () => deleteSubmittedHostActions({ esClient, config, actionIds: submittedActionIds }),
        () => seeded?.cleanup(),
      ]) {
        try {
          await cleanup();
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length === 1) {
        throw failures[0];
      }
      if (failures.length > 1) {
        throw new AggregateError(failures, 'Failed to clean up the isolated host and its action');
      }
    });

    spaceTest(
      'isolates the host and the endpoint list shows it as isolated',
      async ({ page, pageObjects, esClient, kbnClient, config, scoutSpace }) => {
        const host = requireHost(seeded);
        const { endpointList, responseConsole } = pageObjects;

        await spaceTest.step('the endpoint list shows the host as not isolated', async () => {
          await endpointList.goto();
          // The agent status badge proves the status cell rendered, so the absent badge is meaningful.
          await expect(endpointList.agentStatusFor(host.hostname)).toBeVisible();
          await expect(endpointList.actionStatusesFor(host.hostname)).toHaveCount(0);
        });

        await spaceTest.step('open the response console from the endpoint list', async () => {
          await endpointList.openResponder(host.hostname);
          await expect(responseConsole.overlay).toBeVisible();
        });

        const action = await spaceTest.step('submit isolate and see it pending', async () => {
          await responseConsole.enterCommand('isolate');
          const submitted = await captureEndpointAction(page, 'isolate', () =>
            responseConsole.submitCommand()
          );
          submittedActionIds.push(submitted.id);
          await expect(responseConsole.isolatePendingHostStatus).toHaveText('isolate is pending');
          return submitted;
        });

        await spaceTest.step('the agent response completes the action', async () => {
          await completeHostAction({ esClient, config, action });
          await expect(responseConsole.isolateSuccessHostStatus).toHaveText(
            'isolate completed successfully'
          );
        });

        await spaceTest.step('the endpoint list shows the host as isolated', async () => {
          // The list reads agent status once on load; reload only after it reports isolated.
          await waitForHostIsolation({
            kbnClient,
            spaceId: scoutSpace.id,
            agentId: host.agentId,
            isolated: true,
          });
          await endpointList.goto();
          await expect(endpointList.actionStatusesFor(host.hostname)).toHaveText('Isolated');
        });
      }
    );
  }
);
