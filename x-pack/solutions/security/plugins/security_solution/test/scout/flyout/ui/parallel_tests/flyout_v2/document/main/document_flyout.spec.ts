/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  spaceTest,
  tags,
  CUSTOM_QUERY_RULE,
  CURRENT_USER_PROFILE_API_PATH,
  AlertWorkflowStatus,
  ALERT_CLOSE_MENU_ITEM_TEST_SUBJ,
  ClosingReasonOption,
  closedAlertsToastText,
  ELASTIC_INTERNAL_ORIGIN_HEADER,
} from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — alerts page entry',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
        index: ['auditbeat-*'],
      });
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
    });

    spaceTest(
      'header status badge: closing with a reason updates the badge to closed',
      async ({ pageObjects }) => {
        await pageObjects.documentFlyout.openForRule(ruleName);

        // Navigate to the closing reason sub-panel
        await pageObjects.documentFlyout.openStatusPopover();
        await pageObjects.documentFlyout.clickStatusPopoverAction(ALERT_CLOSE_MENU_ITEM_TEST_SUBJ);

        // Closing reason selectable must appear and the submit button must be disabled until a reason is chosen
        await expect(pageObjects.documentFlyout.closingReasonSelectable).toBeVisible();
        await expect(pageObjects.documentFlyout.closingReasonSubmitButton).toBeDisabled();

        // Select "False Positive" and confirm the button becomes enabled
        await pageObjects.documentFlyout.selectClosingReason(
          ClosingReasonOption.FALSE_POSITIVE.label
        );
        await expect(pageObjects.documentFlyout.closingReasonSubmitButton).toBeEnabled();

        await pageObjects.documentFlyout.submitClosingReason();

        // Assert only the user-visible reactions: a success toast and the status badge flipping to
        // CLOSED. The request payload (status/reason wire format, including the invalid-reason 400
        // case) is covered server-side in open_close_signals_route.test.ts, so we don't re-assert
        // it from the UI.
        await pageObjects.toasts.waitFor();
        expect(await pageObjects.toasts.getHeaderText()).toContain(closedAlertsToastText(1));
        await expect(pageObjects.documentFlyout.statusBadge).toContainText(
          AlertWorkflowStatus.CLOSED,
          { timeout: 15_000 }
        );
      }
    );

    spaceTest(
      'assignees: assigning the current user shows the avatar in the flyout header',
      async ({ pageObjects, page, kbnUrl }) => {
        await pageObjects.documentFlyout.openForRule(ruleName);

        // Resolve the logged-in user's username to build the right selectable option selector.
        // The 'x-elastic-internal-origin' header is required in serverless where
        // server.restrictInternalApis=true blocks internal routes without it.
        const meResponse = await page.request.get(kbnUrl.get(CURRENT_USER_PROFILE_API_PATH), {
          headers: ELASTIC_INTERNAL_ORIGIN_HEADER,
        });
        const { username } = await meResponse.json();

        await pageObjects.documentFlyout.openAssigneesPanel();

        // Select the current user — Apply must become enabled
        await pageObjects.documentFlyout.selectAssignee(username);
        await expect(pageObjects.documentFlyout.assigneesApplyButton).toBeEnabled();

        await pageObjects.documentFlyout.applyAssignees();

        // The user-visible reaction: the assigned user's avatar appears in the flyout header. The
        // assignees request payload (add/remove ids) is covered server-side in
        // set_alert_assignees_route.test.ts, so we don't re-assert it from the UI.
        await expect(pageObjects.documentFlyout.getAssigneeAvatar(username)).toBeVisible({
          timeout: 10_000,
        });
      }
    );
  }
);
