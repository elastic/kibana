/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';
import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { CUSTOM_QUERY_RULE } from '@kbn/scout-security/src/playwright/constants/detection_rules';

/**
 * Least-privilege role for viewing detection alerts and using the "Run workflow" action
 * (workflows read + execute + execution read), without `kibana.base: ['all']`.
 */
const WORKFLOW_ENABLED_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
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

spaceTest.describe(
  'Run workflow alert action',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;
    const createdWorkflowIds: string[] = [];

    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
      await scoutSpace.savedObjects.cleanStandardList();
      // Enable the Workflows UI setting required for the "Run workflow" action to appear
      await scoutSpace.uiSettings.set({ 'workflows:ui:enabled': true });
    });

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
      });
      await browserAuth.loginWithCustomRole(WORKFLOW_ENABLED_ROLE);
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      const workflowIds = [...createdWorkflowIds];
      createdWorkflowIds.splice(0, createdWorkflowIds.length);
      await Promise.all(
        workflowIds.map((workflowId) => apiServices.workflow.deleteWorkflow(workflowId))
      );
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('workflows:ui:enabled');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'should show success toast with workflow link and open workflows app in new tab after executing',
      async ({ pageObjects, apiServices }) => {
        const { alertsTablePage } = pageObjects;

        const workflowName = `Scout E2E Test Workflow ${Date.now()}`;
        const workflowYaml = [
          "version: '1'",
          `name: '${workflowName}'`,
          'enabled: true',
          'triggers:',
          '  - type: alert',
          'steps:',
          '  - name: log',
          '    type: console',
          '    with:',
          "      message: 'Alert received'",
        ].join('\n');

        await spaceTest.step('Create workflow via API', async () => {
          const id = await apiServices.workflow.createWorkflow({ yaml: workflowYaml });
          createdWorkflowIds.push(id);
        });

        await spaceTest.step('Open run workflow from alerts', async () => {
          await alertsTablePage.navigate();
          await alertsTablePage.waitForDetectionsAlertsWrapper();
          await alertsTablePage.openRunWorkflowPanel(ruleName);

          await expect(alertsTablePage.workflowPanel).toBeVisible();
          await alertsTablePage.selectWorkflowByName(workflowName);
        });

        await spaceTest.step('Execute workflow and assert success toast', async () => {
          await expect(alertsTablePage.executeWorkflowButton).toBeEnabled();
          await alertsTablePage.executeWorkflowButton.click();

          await expect(alertsTablePage.workflowSuccessToastTitle).toHaveText(
            'Workflow successfully started'
          );
          await expect(alertsTablePage.viewWorkflowExecutionButton).toBeVisible();
        });

        await spaceTest.step('Verify workflows app opens in a new tab', async () => {
          const newTab = await alertsTablePage.clickViewWorkflowExecutionAndWaitForNewTab();
          await expect(newTab).toHaveURL(/\/app\/workflows/);
        });
      }
    );
  }
);
