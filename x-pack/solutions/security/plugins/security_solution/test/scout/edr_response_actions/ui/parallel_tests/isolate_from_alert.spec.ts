/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { getResponseActionsAccessRole } from '../fixtures/response_actions_access_role';
import { spaceTest, tags } from '../fixtures';
import { seedHostWithAlert, type SeededHostAlert } from '../../common/seed_endpoint_hosts';
import { completeHostAction, waitForHostIsolation } from '../../common/complete_host_action';
import { captureEndpointAction } from '../fixtures/page_objects/host_isolation_form';
import { openAlertFlyoutForRule } from '../fixtures/open_alert_flyout';

const AGENT_STATUS_CELL = 'securitySolutionFlyoutHighlightedFieldsAgentStatusCell';

spaceTest.describe(
  'Isolate a host from an alert',
  {
    tag: tags.stateful.classic,
  },
  () => {
    // Isolate, release, and the agent-status polls do not fit in the default 60s.
    spaceTest.setTimeout(240_000);

    let seededHost: (SeededHostAlert & { cleanup: () => Promise<void> }) | undefined;

    spaceTest.beforeAll(async ({ esClient, kbnClient, scoutSpace, config }) => {
      // One host seed waits up to 4 minutes for the current index and 4 for the united index.
      spaceTest.setTimeout(720_000);
      await scoutSpace.setSolutionView('security');
      seededHost = await seedHostWithAlert({
        esClient,
        kbnClient,
        spaceId: scoutSpace.id,
        config,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(getResponseActionsAccessRole());
    });

    spaceTest.afterAll(async () => {
      await seededHost?.cleanup();
    });

    spaceTest(
      'shows the host as isolated and clears that status after release',
      async ({ page, pageObjects, esClient, kbnClient, config, scoutSpace }) => {
        if (!seededHost) {
          throw new Error('Host alert was not seeded');
        }
        const host = seededHost;

        const { documentFlyout, hostIsolation } = pageObjects;
        const isolateComment = `Isolating ${host.hostname}`;
        const releaseComment = `Releasing ${host.hostname}`;
        const agentStatus = page.testSubj.locator(AGENT_STATUS_CELL);

        const openAlertFlyout = () => openAlertFlyoutForRule(page, pageObjects, host.ruleName);

        await spaceTest.step('isolate the host from the alert flyout', async () => {
          await openAlertFlyout();
          await documentFlyout.openTakeActionMenu();
          await documentFlyout.clickTakeActionItem('isolate-host-action-item');
          await hostIsolation.fillComment(isolateComment);
          const action = await captureEndpointAction(page, 'isolate', () =>
            hostIsolation.confirm()
          );
          await expect(
            page.getByText(`Isolation on host ${host.hostname} successfully submitted`)
          ).toBeVisible();
          await hostIsolation.waitUntilClosed();
          await completeHostAction({ esClient, config, action });
          await waitForHostIsolation({
            kbnClient,
            spaceId: scoutSpace.id,
            agentId: host.agentId,
            isolated: true,
          });
        });

        await spaceTest.step('the reopened flyout shows the host as isolated', async () => {
          await openAlertFlyout();
          await expect(agentStatus).toContainText('Isolated');
        });

        await spaceTest.step('release the host', async () => {
          await documentFlyout.openTakeActionMenu();
          await documentFlyout.clickTakeActionItem('isolate-host-action-item');
          await hostIsolation.fillComment(releaseComment);
          const action = await captureEndpointAction(page, 'unisolate', () =>
            hostIsolation.confirm()
          );
          await expect(
            page.getByText(`Release on host ${host.hostname} successfully submitted`)
          ).toBeVisible();
          await hostIsolation.waitUntilClosed();
          await completeHostAction({ esClient, config, action });
          await waitForHostIsolation({
            kbnClient,
            spaceId: scoutSpace.id,
            agentId: host.agentId,
            isolated: false,
          });
        });

        await spaceTest.step(
          'the reopened flyout no longer shows the host as isolated',
          async () => {
            await openAlertFlyout();
            await expect(agentStatus).toBeVisible();
            await expect(agentStatus).not.toContainText('Isolated');
          }
        );
      }
    );
  }
);
