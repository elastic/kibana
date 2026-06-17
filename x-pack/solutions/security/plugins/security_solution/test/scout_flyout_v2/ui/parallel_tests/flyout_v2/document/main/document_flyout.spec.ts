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
  SIGNALS_STATUS_API_PATH,
  ALERT_ASSIGNEES_API_PATH,
  CURRENT_USER_PROFILE_API_PATH,
  AlertWorkflowStatus,
  ALERT_CLOSE_MENU_ITEM_TEST_SUBJ,
  ClosingReasonOption,
  closedAlertsToastText,
  addedToTimelineToastText,
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
      'smoke — flyout opens with header, all body sections, and footer',
      async ({ pageObjects }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);

        await pageObjects.documentFlyout.waitForAlertFlyout();

        // Header
        await expect.soft(pageObjects.documentFlyout.severity).toBeVisible();
        await expect.soft(pageObjects.documentFlyout.statusBadge).toBeVisible();
        await expect.soft(pageObjects.documentFlyout.riskScore).toBeVisible();
        await expect.soft(pageObjects.documentFlyout.assigneesTitle).toBeVisible();
        await expect.soft(pageObjects.documentFlyout.notesAddButton).toBeVisible();

        // Body sections
        await expect.soft(pageObjects.documentFlyout.aboutSection).toBeVisible();
        await expect.soft(pageObjects.documentFlyout.investigationSection).toBeVisible();
        await expect.soft(pageObjects.documentFlyout.visualizationsSection).toBeVisible();
        await expect.soft(pageObjects.documentFlyout.insightsSection).toBeVisible();
        await expect.soft(pageObjects.documentFlyout.responseSection).toBeVisible();

        // Footer
        await expect.soft(pageObjects.documentFlyout.takeActionButton).toBeVisible();
      }
    );

    spaceTest(
      'header status badge: closing with reason updates badge and sends reason in API request',
      async ({ pageObjects, page }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyout.waitForAlertFlyout();

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

        // Wire up response listener before submit
        const statusApiCall = page.waitForResponse(
          (resp) =>
            resp.url().includes(SIGNALS_STATUS_API_PATH) && resp.request().method() === 'POST'
        );
        await pageObjects.documentFlyout.submitClosingReason();

        // API must return 200 and the request body must carry the chosen reason
        const apiResponse = await statusApiCall;
        expect(apiResponse.status()).toBe(200);
        const requestBody = JSON.parse(apiResponse.request().postData() ?? '{}');
        expect(requestBody.status).toBe(AlertWorkflowStatus.CLOSED);
        expect(requestBody.reason).toBe(ClosingReasonOption.FALSE_POSITIVE.key);

        await pageObjects.toasts.waitFor();
        expect(await pageObjects.toasts.getHeaderText()).toContain(closedAlertsToastText(1));
        await expect(pageObjects.documentFlyout.statusBadge).toContainText(
          AlertWorkflowStatus.CLOSED,
          { timeout: 15_000 }
        );
      }
    );

    spaceTest(
      'status badge cell actions: filter-in and add-to-timeline buttons both work',
      async ({ pageObjects }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyout.waitForAlertFlyout();

        // Hover the status badge — both cell-action buttons must be visible
        await pageObjects.documentFlyout.hoverStatusBadge();
        await expect(pageObjects.documentFlyout.cellActionsFilterInButton).toBeVisible();
        await expect(pageObjects.documentFlyout.cellActionsAddToTimelineButton).toBeVisible();

        // Click "Add to Timeline" — a success toast must confirm the value was added
        await pageObjects.documentFlyout.cellActionsAddToTimelineButton.click();
        await pageObjects.toasts.waitFor();
        expect(await pageObjects.toasts.getHeaderText()).toContain(
          addedToTimelineToastText(AlertWorkflowStatus.OPEN)
        );

        // Re-hover to reopen the popover (it closed after the click above)
        await pageObjects.documentFlyout.hoverStatusBadge();

        // Click "Filter for" — the flyout closes and a workflow-status filter chip appears
        await pageObjects.documentFlyout.cellActionsFilterInButton.click();
        await expect(pageObjects.documentFlyout.workflowStatusFilterBadge).toBeVisible({
          timeout: 10_000,
        });
      }
    );

    spaceTest(
      'assignees: assigning the current user shows avatar and sends user id in API request',
      async ({ pageObjects, page, kbnUrl }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyout.waitForAlertFlyout();

        // Resolve the logged-in user's username to build the right selectable option selector
        const meResponse = await page.request.get(kbnUrl.get(CURRENT_USER_PROFILE_API_PATH));
        const { username } = await meResponse.json();

        await pageObjects.documentFlyout.openAssigneesPanel();

        // Select the current user — Apply must become enabled
        await pageObjects.documentFlyout.selectAssignee(username);
        await expect(pageObjects.documentFlyout.assigneesApplyButton).toBeEnabled();

        // Wire up listener before applying
        const assigneesApiCall = page.waitForResponse(
          (resp) =>
            resp.url().includes(ALERT_ASSIGNEES_API_PATH) && resp.request().method() === 'POST'
        );
        await pageObjects.documentFlyout.applyAssignees();

        // API must succeed and the request must add exactly one user
        const apiResponse = await assigneesApiCall;
        expect(apiResponse.status()).toBe(200);
        const requestBody = JSON.parse(apiResponse.request().postData() ?? '{}');
        expect(requestBody.assignees.add).toHaveLength(1);
        expect(requestBody.assignees.remove).toHaveLength(0);

        // Avatar for the assigned user must appear in the flyout header
        await expect(pageObjects.documentFlyout.getAssigneeAvatar(username)).toBeVisible({
          timeout: 10_000,
        });
      }
    );
  }
);
