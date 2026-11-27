/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../fixtures';

spaceTest.describe(
  'Agent policy settings tamper protection on Security Complete',
  { tag: tags.serverless.security.complete },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsSecurityRole('endpoint_operations_analyst');
    });

    spaceTest(
      'shows the tamper protection controls without an upsell',
      async ({ pageObjects, endpointPolicy }) => {
        const { agentPolicySettings } = pageObjects;
        const [agentPolicyId] = endpointPolicy.policy_ids;

        await agentPolicySettings.goto(agentPolicyId);

        // The section loads lazily: wait for it before checking what must be absent.
        await expect(agentPolicySettings.tamperProtectionSwitch).toBeVisible();
        await expect(agentPolicySettings.tamperProtectionSwitch).toBeEnabled();
        await expect(agentPolicySettings.uninstallCommandLink).toBeVisible();
        await expect(agentPolicySettings.missingIntegrationTooltip).toBeHidden();
        await expect(agentPolicySettings.lockedCard).toBeHidden();
        await expect(agentPolicySettings.lockedCardBadge).toBeHidden();
        await expect(agentPolicySettings.lockedCardTitle).toBeHidden();
      }
    );
  }
);
