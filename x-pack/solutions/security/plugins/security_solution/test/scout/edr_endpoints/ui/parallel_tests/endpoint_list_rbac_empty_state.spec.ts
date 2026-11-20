/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { FEATURE_PRIVILEGES, getEndpointListRole, spaceTest, tags } from '../fixtures';

/**
 * Current feature version only. A deprecated version's privileges are mapped onto the current
 * version's `ui:` actions before anything renders, and Fleet reads only the current version's
 * capabilities, so the rendering step cannot vary by version. The mapping itself is asserted in
 * `edr_rbac/api/tests/siem_deprecated_ui_actions.spec.ts`.
 *
 * The worker space holds no Defend policy and no host, so the endpoint list shows the policy
 * onboarding empty state; Fleet scopes policies by space, so other workers' data stays out of it.
 */
spaceTest.describe(
  'Endpoint list RBAC with neither a Defend policy nor hosts',
  { tag: tags.stateful.classic },
  () => {
    for (const policyManagement of FEATURE_PRIVILEGES) {
      for (const fleet of FEATURE_PRIVILEGES) {
        for (const integrations of FEATURE_PRIVILEGES) {
          const canOnboard = fleet === 'all' && integrations === 'all';
          // `noFleetAccess` renders under the same loaded-privileges condition as the button, so
          // each case waits for a visible outcome before asserting the other one is absent.
          const [shown, absent] = canOnboard
            ? (['onboardingStartButton', 'noFleetAccess'] as const)
            : (['noFleetAccess', 'onboardingStartButton'] as const);

          spaceTest(
            `${
              canOnboard ? 'shows' : 'hides'
            } Add Elastic Defend with policy management ${policyManagement}, fleet ${fleet} and integrations ${integrations}`,
            async ({ browserAuth, pageObjects }) => {
              const { endpointListEmptyState } = pageObjects;

              await browserAuth.loginWithCustomRole(
                getEndpointListRole({ policyManagement, fleet, integrations })
              );
              await endpointListEmptyState.goto();

              await expect(endpointListEmptyState.policyOnboardingInstructions).toBeVisible();
              await expect(endpointListEmptyState[shown]).toBeVisible();
              await expect(endpointListEmptyState[absent]).toBeHidden();
            }
          );
        }
      }
    }
  }
);
