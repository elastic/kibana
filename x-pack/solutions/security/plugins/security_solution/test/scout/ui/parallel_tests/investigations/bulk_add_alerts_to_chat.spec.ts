/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';
import { createToolCallMessage } from '@kbn/ftr-llm-proxy';
import { expect } from '@kbn/scout-security/ui';
import { CUSTOM_QUERY_RULE } from '@kbn/scout-security/src/playwright/constants/detection_rules';
import { spaceTest, tags } from '../../fixtures';

const ALERT_COUNT = 3;

/**
 * A role with security alert index privileges and full Kibana access,
 * which includes the agentBuilder feature needed for the "Add to chat" bulk action.
 */
const AGENT_BUILDER_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: ['manage'],
    indices: [
      {
        names: [
          '.alerts-security*',
          '.internal.alerts-security*',
          '.siem-signals-*',
          'apm-*-transaction*',
          'traces-apm*',
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'logs-*',
          'packetbeat-*',
          'winlogbeat-*',
          'logstash-*',
          '.lists*',
          '.items*',
        ],
        privileges: ['read', 'write'],
      },
    ],
  },
  kibana: [
    {
      base: ['all'],
      feature: {},
      spaces: ['*'],
    },
  ],
};

spaceTest.describe('Bulk add alerts to chat', { tag: [...tags.stateful.classic] }, () => {
  // One rule name per created rule; the first is used as the anchor to wait for page readiness.
  const ruleNames: string[] = [];

  spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
    ruleNames.length = 0;
    for (let i = 0; i < ALERT_COUNT; i++) {
      const name = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}_${i}`;
      ruleNames.push(name);
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name,
        rule_id: `scout-bulk-chat-${scoutSpace.id}-${i}`,
      });
    }
    await browserAuth.loginWithCustomRole(AGENT_BUILDER_ROLE);
  });

  spaceTest.afterEach(async ({ apiServices }) => {
    await apiServices.detectionRule.deleteAll();
    await apiServices.detectionAlerts.deleteAll();
  });

  spaceTest(
    'should disable the "Add to chat" bulk action when all alerts are selected via the query button',
    // _llmProxy is declared so the worker fixture provisions the AI connector in the test space;
    // without it the bulk action would not appear at all.
    async ({ pageObjects, llmProxy: _llmProxy }) => {
      const { alertsTablePage } = pageObjects;

      await alertsTablePage.navigate();

      const firstRuleNameCell = alertsTablePage.alertsTable
        .getByTestId('ruleName')
        .filter({ hasText: ruleNames[0] });
      await expect(firstRuleNameCell).toBeVisible({ timeout: 60_000 });

      await spaceTest.step('check one row to activate the bulk toolbar', async () => {
        const alertCheckbox = firstRuleNameCell
          .locator('xpath=ancestor::div[contains(@class,"euiDataGridRow")]')
          .locator('.euiCheckbox__input');
        await alertCheckbox.check();
      });

      await spaceTest.step('click "Select all" to switch to query-based selection', async () => {
        await alertsTablePage.selectAllAlertsButton.click();
      });

      await spaceTest.step(
        'verify "Add to chat" is present but disabled in the bulk actions menu',
        async () => {
          await alertsTablePage.selectedShowBulkActionsButton.click();
          await expect(alertsTablePage.bulkAddToChatMenuItem).toBeVisible();
          await expect(alertsTablePage.bulkAddToChatMenuItem).toBeDisabled();
        }
      );
    }
  );

  spaceTest(
    'should open agent builder conversation with attachment chip and pre-filled prompt, and send multiple alerts to the LLM',
    async ({ pageObjects, page, llmProxy }) => {
      const { alertsTablePage } = pageObjects;

      // Set up LLM mock interceptors before triggering the chat so no call goes unanswered.
      // The agent builder makes three sequential calls: title generation, handover, and final answer.
      void llmProxy
        .intercept({
          name: 'set_title',
          when: (body) => {
            const sys = body.messages.find((m) => m.role === 'system');
            return String(sys?.content ?? '').includes('You are a title-generation utility');
          },
          responseMock: createToolCallMessage('set_title', { title: 'Alert triage' }),
        })
        .completeAfterIntercept();

      void llmProxy
        .intercept({
          name: 'handover-to-answer',
          when: (body) => {
            const sys = body.messages.find((m) => m.role === 'system');
            return String(sys?.content ?? '').includes(
              'This response will serve as a handover note for the answering agent'
            );
          },
          responseMock: 'ready to answer',
        })
        .completeAfterIntercept();

      void llmProxy
        .intercept({
          name: 'final-answer',
          when: () => true,
          responseMock: 'Here is the alert triage summary.',
        })
        .completeAfterIntercept();

      await alertsTablePage.navigate();

      // Wait for the first rule's alert to appear — this proves Sourcerer has initialized
      // and the alerts table is ready. Longer timeout covers the full initialization window.
      const firstRuleNameCell = alertsTablePage.alertsTable
        .getByTestId('ruleName')
        .filter({ hasText: ruleNames[0] });
      await expect(firstRuleNameCell).toBeVisible({ timeout: 60_000 });

      await spaceTest.step('select all visible alerts via header checkbox', async () => {
        // The header checkbox uses selectCurrentPage (not selectAll/query mode), so
        // disableOnQuery actions like bulk-add-to-chat remain enabled.
        await alertsTablePage.bulkActionsHeaderCheckbox.check();
      });

      await spaceTest.step('open bulk actions and click Add to chat', async () => {
        await alertsTablePage.selectedShowBulkActionsButton.click();
        await alertsTablePage.bulkAddToChatMenuItem.click();
      });

      await spaceTest.step(
        'verify conversation opens with attachment chip and pre-filled prompt',
        async () => {
          await expect(page.testSubj.locator('agentBuilderConversation')).toBeVisible();
          await expect(page.testSubj.locator('agentBuilderAttachmentPillsRow')).toBeVisible();
          await expect(page.testSubj.locator('agentBuilderConversationInputEditor')).toContainText(
            'Triage and prioritize these security alerts'
          );
        }
      );

      await spaceTest.step('send message and verify LLM received multiple alerts', async () => {
        await page.testSubj.locator('agentBuilderConversationInputSubmitButton').click();
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const handoverRequest = llmProxy.interceptedRequests.find(
          (r) => r.matchingInterceptorName === 'handover-to-answer'
        )?.requestBody;

        expect(handoverRequest).toBeDefined();
        const messages: Array<{ content?: unknown }> = handoverRequest?.messages ?? [];
        const allContent = messages.map((m) => String(m.content ?? '')).join('\n');

        // Verify multiple alerts were delivered: each alert block contains the rule name field.
        const alertFieldOccurrences = allContent.split('kibana.alert.rule.name').length - 1;
        expect(alertFieldOccurrences).toBeGreaterThanOrEqual(ALERT_COUNT);
      });
    }
  );
});
