/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '../fixtures';
import { installSentinelOneIsolationMock } from '../fixtures/mocks/sentinelone_isolation_mock';

/**
 * Migrated from `public/management/cypress/e2e/sentinelone/isolate.cy.ts` (Cypress). The Cypress
 * spec was skipped in CI because it provisioned a real SentinelOne agent via Multipass and polled
 * the vendor for up to 10 minutes; here the take-action flow is exercised end to end against a
 * mocked HTTP surface so it can run deterministically on every commit.
 *
 * Coverage: alert flyout → Take action → Isolate host → confirm → success; reopen → Take action →
 * Release host → confirm → success. All other SentinelOne behaviour is already covered at the unit
 * and API layer (`sentinel_one_actions_client.test.ts`, `sentinel_one_agent_status_client.test.ts`).
 */

const SOURCE_INDEX_PREFIX = 'scout-sentinelone-isolate';
const HOST_NAME = 'scout-sentinelone-host';
const AGENT_ID = 'scout-sentinelone-agent-id';

spaceTest.describe(
  'SentinelOne isolate/release from alert flyout',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let sourceIndex: string;
    let ruleName: string;

    // The detection engine runs on a schedule; give the alert time to fire before we assert on it.
    spaceTest.setTimeout(5 * 60_000);

    spaceTest.beforeEach(async ({ apiServices, esClient, scoutSpace }) => {
      // The alert flyout + take-action menu are Security-solution surfaces; a freshly-provisioned
      // space defaults to the "classic" view. Deployment tags do not configure the solution view,
      // so we set it explicitly here (per the security-scout-best-practices skill).
      await scoutSpace.setSolutionView('security');

      const idSegment = scoutSpace.id.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      sourceIndex = `${SOURCE_INDEX_PREFIX}-${idSegment}`;
      ruleName = `SentinelOne isolate ${scoutSpace.id}`;

      // Fresh source index with the fields the alert flyout reads to drive the SentinelOne
      // take-action code path:
      //   - `event.module: 'sentinel_one'`             → `useAlertResponseActionsSupport` sets
      //     `agentType = 'sentinel_one'`.
      //   - `sentinel_one.alert.agent.id: <AGENT_ID>` → first entry in
      //     `RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS.sentinel_one`, which the same hook uses to
      //     derive `agentId`.
      //   - `host.name`                                → shown in the confirm dialog copy.
      await esClient.indices.delete({ index: sourceIndex, ignore_unavailable: true });
      await esClient.indices.create({
        index: sourceIndex,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'event.module': { type: 'keyword' },
            'event.dataset': { type: 'keyword' },
            'event.kind': { type: 'keyword' },
            'host.name': { type: 'keyword' },
            'sentinel_one.alert.agent.id': { type: 'keyword' },
          },
        },
      });

      await esClient.index({
        index: sourceIndex,
        document: {
          '@timestamp': new Date().toISOString(),
          'event.module': 'sentinel_one',
          'event.dataset': 'sentinel_one.alert',
          'event.kind': 'signal',
          'host.name': HOST_NAME,
          'sentinel_one.alert.agent.id': AGENT_ID,
        },
        refresh: 'wait_for',
      });

      await apiServices.detectionRule.createCustomQueryRule({
        index: [sourceIndex],
        enabled: true,
        name: ruleName,
        description:
          'Migrated from cypress/e2e/sentinelone/isolate.cy.ts — drives a SentinelOne alert without a real agent',
        risk_score: 1,
        rule_id: `sentinelone-isolate-${idSegment}`,
        severity: 'high',
        type: 'query',
        query: 'sentinel_one.alert.agent.id:*',
        from: '2019-01-01T00:00:00.000Z',
      });
    });

    spaceTest.afterEach(async ({ apiServices, esClient }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
      await esClient.indices.delete({ index: sourceIndex, ignore_unavailable: true });
    });

    spaceTest(
      'isolates and releases a SentinelOne host from the alert flyout',
      async ({ apiServices, browserAuth, page, pageObjects }) => {
        // `soc_manager` grants `canIsolateHost`; using an admin role would mask a permissions
        // regression per the security-cypress-to-scout-migration skill's "Roles" section.
        await browserAuth.loginAsSecurityRole('soc_manager');

        const isolationMock = await installSentinelOneIsolationMock(page, { agentId: AGENT_ID });

        // The Cypress spec toggled the rule off/on to force execution; here we poll the alerts
        // index instead. The rule is scheduled and fires on its own.
        await apiServices.detectionAlerts.waitForAlerts(ruleName, 1, 120_000);

        await spaceTest.step('open the alert flyout for the SentinelOne rule', async () => {
          await pageObjects.documentFlyout.openForRule(ruleName);
        });

        await spaceTest.step('isolate the host from the take-action menu', async () => {
          await pageObjects.documentFlyout.openTakeActionMenu();

          const isolatePost = isolationMock.waitForIsolateCall();
          // The menu entry testSubj is always `isolate-host-action-item`; only the visible label
          // flips between "Isolate host" and "Release host" depending on
          // `useGetAgentStatus().isolated`.
          await pageObjects.documentFlyout.clickTakeActionItem('isolate-host-action-item');

          await pageObjects.hostIsolationConfirmDialog.waitForForm();
          await pageObjects.hostIsolationConfirmDialog.fillComment(`Isolating ${HOST_NAME}`);
          await pageObjects.hostIsolationConfirmDialog.submitConfirm();

          // The isolate POST fired — this is the strong assertion that we exercised the
          // SentinelOne alert-flyout branch; a broken mock or missing agent-id derivation would
          // surface as a `waitForRequest` timeout.
          await isolatePost;

          // `HostIsolationFlyout.handleSuccess` fires the success toast and immediately calls
          // `onClose()` to unmount the nested flyout; assert both surfaces.
          await pageObjects.hostIsolationConfirmDialog.expectIsolationSuccess(HOST_NAME);

          // Flip the mocked agent status so the second open shows the "Release host" label.
          isolationMock.markIsolated();
          // React Query polls `useGetAgentStatus` every 10s (`DEFAULT_POLL_INTERVAL`); wait for
          // the next poll to reflect the new state before reopening the menu, otherwise the item
          // is still labelled "Isolate host" and points at the isolate endpoint.
          await isolationMock.waitForAgentStatusPollReflecting(true);
        });

        await spaceTest.step('release the host from the take-action menu', async () => {
          // The alert flyout stays open through the isolate success — only the nested isolation
          // flyout closed. Reopening the take-action menu is enough.
          await pageObjects.documentFlyout.openTakeActionMenu();

          const releasePost = isolationMock.waitForReleaseCall();
          await pageObjects.documentFlyout.clickTakeActionItem('isolate-host-action-item');

          await pageObjects.hostIsolationConfirmDialog.waitForForm();
          await pageObjects.hostIsolationConfirmDialog.fillComment(`Releasing ${HOST_NAME}`);
          await pageObjects.hostIsolationConfirmDialog.submitConfirm();

          await releasePost;
          await pageObjects.hostIsolationConfirmDialog.expectReleaseSuccess(HOST_NAME);
        });
      }
    );
  }
);
