/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { getPlaywrightTagsFor, spaceTest, tags } from '../fixtures';
import {
  seedAlertFlyoutResponseAction,
  type SeededAlertFlyoutResponseAction,
} from '../fixtures/seed_response_actions_history';

const requireSeededAlert = (
  seeded: SeededAlertFlyoutResponseAction | undefined
): SeededAlertFlyoutResponseAction => {
  if (!seeded) {
    throw new Error('Alert flyout response action data was not seeded');
  }
  return seeded;
};

spaceTest.describe(
  'Alert flyout automated response results',
  {
    // Cypress was `@ess`, `@serverless`, and `@skipInServerlessMKI`.
    // Local serverless only: Cloud serverless (MKI) cannot provision the
    // system-indices user this seed uses.
    tag: [
      ...tags.stateful.classic,
      ...getPlaywrightTagsFor('serverless', 'security_complete', 'local'),
    ],
  },
  () => {
    let seeded: SeededAlertFlyoutResponseAction | undefined;

    spaceTest.beforeAll(async ({ apiServices, esClient, kbnClient, scoutSpace, config }) => {
      // Endpoint host indexing installs Fleet and waits on metadata transforms.
      spaceTest.setTimeout(600_000);
      // Serverless forces xpack.spaces.allowSolutionVisibility off, so the
      // solution property cannot be set. A security project is already that view.
      if (!config.serverless) {
        await scoutSpace.setSolutionView('security');
      }
      seeded = await seedAlertFlyoutResponseAction({
        esClient,
        kbnClient,
        spaceId: scoutSpace.id,
        config,
        detectionRule: apiServices.detectionRule,
        detectionAlerts: apiServices.detectionAlerts,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      // soc_manager can read alerts and the response-actions log, but the
      // stateful role descriptor has no `manage` on `.lists-*` or `.items-*`.
      // A flaky run then showed the insufficient-privileges callout and the
      // rule name never appeared in the alerts grid. platform_engineer has
      // `all` on those indices and actions-log read.
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterAll(async () => {
      await seeded?.cleanup();
    });

    spaceTest('shows the isolate action on the alert response details', async ({ pageObjects }) => {
      // openForRule waits up to 60s for the alerts grid, and the suite timeout is also 60s.
      spaceTest.setTimeout(180_000);
      const { ruleName } = requireSeededAlert(seeded);
      const { documentFlyout, responseTool } = pageObjects;

      await spaceTest.step('open the seeded alert', async () => {
        await documentFlyout.openForRule(ruleName);
      });

      await spaceTest.step('open the response details', async () => {
        await responseTool.openResponseDetails();
      });

      await expect(responseTool.responseDetails).toContainText('executed isolate command');
    });
  }
);
