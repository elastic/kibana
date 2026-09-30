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
      spaceTest.setTimeout(600_000);
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

        const { alertsTablePage, documentFlyout, hostIsolation } = pageObjects;
        const isolateComment = `Isolating ${host.hostname}`;
        const releaseComment = `Releasing ${host.hostname}`;
        const agentStatus = page.testSubj.locator(AGENT_STATUS_CELL);

        const openAlertFlyout = async () => {
          // Endpoint Security alerts land in the same table and push this row out of
          // the virtualized grid. A rule-name filter leaves a single row.
          await page.gotoApp('security/alerts', {
            params: {
              query: `(language:kuery,query:'kibana.alert.rule.name: "${host.ruleName}"')`,
            },
          });
          // The charts header mounts after navigation. Collapsing it gives the events
          // table a height; until then the rule cell is not in the DOM.
          const chartsToggle = page.testSubj
            .locator('alerts-charts-panel')
            .getByTestId('query-toggle-header')
            .and(page.locator('[aria-label="Charts"]'));
          // The alerts view can still be on its loading spinner well after navigation.
          await chartsToggle.waitFor({ state: 'visible', timeout: 60_000 });
          const expandedChartsToggle = chartsToggle.and(page.locator('[aria-expanded="true"]'));
          if (await expandedChartsToggle.isVisible()) {
            await expandedChartsToggle.click();
          }
          await chartsToggle
            .and(page.locator('[aria-expanded="false"]'))
            .waitFor({ state: 'visible', timeout: 60_000 });
          await alertsTablePage.waitForRuleAlert(host.ruleName);
          await alertsTablePage.expandAlertDetailsFlyout(host.ruleName);
          await documentFlyout.waitForAlertFlyout();
        };

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
