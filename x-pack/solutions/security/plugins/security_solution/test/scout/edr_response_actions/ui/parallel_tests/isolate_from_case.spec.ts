/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { getResponseActionsAccessRole } from '../fixtures/response_actions_access_role';
import { attachAlertToCase } from '../fixtures/attach_alert_to_case';
import { spaceTest, tags } from '../fixtures';
import { seedHostWithAlert, type SeededHostAlert } from '../../common/seed_endpoint_hosts';
import {
  completeHostAction,
  deleteSubmittedHostActions,
  waitForHostIsolation,
} from '../../common/complete_host_action';
import { captureEndpointAction } from '../fixtures/page_objects/host_isolation_form';

spaceTest.describe(
  'Isolate a host from a case',
  {
    tag: tags.stateful.classic,
  },
  () => {
    // Isolate, release, and the agent-status poll do not fit in the default 60s.
    spaceTest.setTimeout(240_000);

    let seeded: (SeededHostAlert & { cleanup: () => Promise<void> }) | undefined;
    let caseId: string | undefined;
    let cleanupCase: (() => Promise<void>) | undefined;
    const submittedActionIds: string[] = [];

    spaceTest.beforeAll(async ({ esClient, kbnClient, scoutSpace, config }) => {
      // One host seed waits up to 8 minutes, after the other worker's metadata-transform lock.
      spaceTest.setTimeout(1_200_000);
      await scoutSpace.setSolutionView('security');
      const hostAlert = await seedHostWithAlert({
        esClient,
        kbnClient,
        spaceId: scoutSpace.id,
        config,
      });
      seeded = hostAlert;
      const attached = await attachAlertToCase({
        kbnClient,
        spaceId: scoutSpace.id,
        alertId: hostAlert.alertId,
        ruleId: hostAlert.ruleId,
        ruleName: hostAlert.ruleName,
        hostname: hostAlert.hostname,
      });
      caseId = attached.caseId;
      cleanupCase = attached.cleanup;
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(getResponseActionsAccessRole());
    });

    spaceTest.afterAll(async ({ esClient, config }) => {
      const failures: unknown[] = [];
      for (const cleanup of [
        () => deleteSubmittedHostActions({ esClient, config, actionIds: submittedActionIds }),
        cleanupCase,
        () => seeded?.cleanup(),
      ]) {
        try {
          await cleanup?.();
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length === 1) {
        throw failures[0];
      }
      if (failures.length > 1) {
        throw new AggregateError(failures, 'Failed to clean up the seeded case and host');
      }
    });

    spaceTest(
      'adds the isolate and release comments to the case activity',
      async ({ page, pageObjects, esClient, kbnClient, config, scoutSpace }) => {
        if (!seeded || !caseId) {
          throw new Error('Case alert was not seeded');
        }
        const host = seeded;
        const attachedCaseId = caseId;

        const { documentFlyout, hostIsolation } = pageObjects;
        const isolateComment = `Isolating ${host.hostname}`;
        const releaseComment = `Releasing ${host.hostname}`;
        const showAlert = page.locator('[data-test-subj^="comment-action-show-alert-"]');
        const activity = page.testSubj.locator('user-actions-list');

        const openCaseAlert = async () => {
          await page.gotoApp(`security/cases/${attachedCaseId}`);
          await expect(showAlert).toHaveCount(1);
          await showAlert.click();
          await documentFlyout.waitForAlertFlyout();
        };

        await spaceTest.step('isolate the host from the case alert', async () => {
          await openCaseAlert();
          await documentFlyout.openTakeActionMenu();
          await documentFlyout.clickTakeActionItem('isolate-host-action-item');
          await hostIsolation.fillComment(isolateComment);
          // caseIds is empty until this lookup returns. Confirming earlier submits
          // the action without adding the comment to the case.
          await expect(
            hostIsolation.form.getByText('1 case associated with this host')
          ).toBeVisible();
          const action = await captureEndpointAction(page, 'isolate', () =>
            hostIsolation.confirm()
          );
          submittedActionIds.push(action.id);
          await expect(
            page.getByText(`Isolation on host ${host.hostname} successfully submitted`)
          ).toBeVisible();
          await hostIsolation.waitUntilClosed();
          await page.gotoApp(`security/cases/${attachedCaseId}`);
          await expect(activity).toContainText(isolateComment);
          await completeHostAction({ esClient, config, action });
          await waitForHostIsolation({
            kbnClient,
            spaceId: scoutSpace.id,
            agentId: host.agentId,
            isolated: true,
          });
        });

        await spaceTest.step('release the host and record both comments', async () => {
          await openCaseAlert();
          await documentFlyout.openTakeActionMenu();
          await documentFlyout.clickTakeActionItem('isolate-host-action-item');
          await hostIsolation.fillComment(releaseComment);
          await expect(
            hostIsolation.form.getByText('1 case associated with this host')
          ).toBeVisible();
          const action = await captureEndpointAction(page, 'unisolate', () =>
            hostIsolation.confirm()
          );
          submittedActionIds.push(action.id);
          await expect(
            page.getByText(`Release on host ${host.hostname} successfully submitted`)
          ).toBeVisible();
          await hostIsolation.waitUntilClosed();
          await page.gotoApp(`security/cases/${attachedCaseId}`);
          await completeHostAction({ esClient, config, action });
          await expect(activity).toContainText(isolateComment);
          await expect(activity).toContainText(releaseComment);
        });
      }
    );
  }
);
