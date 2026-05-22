/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING =
  'securitySolution:enableAlertsAndAttacksAlignment';

spaceTest.describe(
  'Attacks UI manual execution smoke',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      // Seed data so the Run button is available in the header
      await apiServices.attackDiscovery.seedAttackData();
    });

    spaceTest.beforeEach(async ({ browserAuth, scoutSpace }) => {
      await scoutSpace.uiSettings.set({
        [ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING]: true,
      });
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'successfully triggers generation via UI without error',
      async ({ pageObjects, page }) => {
        const { detectionsAttackDiscoveryPage } = pageObjects;

        // Mock the inference connectors API so the Run button gets enabled
        await page.route('**/internal/search_inference_endpoints/connectors*', async (route) => {
          await route.fulfill({
            status: 200,
            json: {
              connectors: [
                {
                  connectorId: '.eis-claude-3.7-sonnet',
                  type: '.inference',
                  name: 'Scout seeded inference connector',
                  isPreconfigured: false,
                  isInferenceEndpoint: true,
                  capabilities: {},
                  config: {},
                },
              ],
              soEntryFound: true,
            },
          });
        });

        // Add an init script to set local storage before any page code runs
        await page.addInitScript(() => {
          window.localStorage.setItem(
            'elasticAssistantDefault.attackDiscovery.connectorId',
            '".eis-claude-3.7-sonnet"'
          );
        });

        // Mock the generate API so it returns a 200 success with execution_uuid
        await page.route('**/api/attack_discovery/_generate', async (route) => {
          await route.fulfill({
            status: 200,
            json: {
              execution_uuid: '12345678-1234-1234-1234-123456789012',
            },
          });
        });

        await detectionsAttackDiscoveryPage.navigateToAttackDiscoveryPage();

        // Ensure the run button is enabled
        await expect(detectionsAttackDiscoveryPage.runButton).toBeEnabled({ timeout: 15000 });

        // Listen for the _generate API call that should occur when clicking "Run"
        const generateRequestPromise = page.waitForRequest(
          (req) => req.url().includes('/api/attack_discovery/_generate') && req.method() === 'POST'
        );

        // Click the run button
        await detectionsAttackDiscoveryPage.runButton.click();

        // Await the generation request to be made
        const request = await generateRequestPromise;

        // Verify the UI sent the correct payload to the backend
        const postData = request.postDataJSON();
        expect(postData?.apiConfig?.connectorId).toBe('.eis-claude-3.7-sonnet');
        expect(postData?.subAction).toBe('invokeAI');

        // Verify a toast appears indicating generation started
        await expect(detectionsAttackDiscoveryPage.globalToastList).toBeVisible();
        await expect(detectionsAttackDiscoveryPage.globalToastList).toContainText('started');
      }
    );
  }
);
