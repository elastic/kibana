/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import {
  PROPOSALS_ALL_ROLE,
  PROPOSALS_READ_ROLE,
  createUiOnboardingSpace,
  seedInvestigation,
  spaceTest,
  spaceUrl,
  tags,
  withSecuritySolution,
} from '../fixtures';

const TEST_TIMEOUT_MS = 240_000;
const UI_TIMEOUT_MS = 90_000;
const SPACE_NAMESPACE = 'scout-perm';

/**
 * The chat card's Approve and Decline follow the Proposed Actions `decide` privilege. They are
 * never clicked, so the seeded proposal stays pending.
 */
spaceTest.describe(
  'AlertZero permissions - proposal card decide',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.setTimeout(TEST_TIMEOUT_MS);

    const cases = [
      { label: 'Proposed Actions Read', role: PROPOSALS_READ_ROLE, canDecide: false },
      { label: 'Proposed Actions All (control)', role: PROPOSALS_ALL_ROLE, canDecide: true },
    ] as const;

    for (const { label, role, canDecide } of cases) {
      spaceTest(
        `${label}: Approve and Decline are ${canDecide ? 'enabled' : 'disabled'} on the chat card`,
        async ({ page, pageObjects, browserAuth, kbnUrl, kbnClient, apiServices, esClient }) => {
          const space = await createUiOnboardingSpace(
            kbnClient,
            withSecuritySolution(kbnClient, apiServices.spaces),
            // The chat page renders a "No Large Language Model detected" empty state without a connector.
            { withStubModel: true, namespace: SPACE_NAMESPACE }
          );
          let seeded: Awaited<ReturnType<typeof seedInvestigation>> | undefined;
          try {
            seeded = await seedInvestigation(space.api, space.spaceId, {
              esClient,
              title: `Permission spec proposal decide ${canDecide ? 'all' : 'read'}`,
            });

            await browserAuth.loginWithCustomRole(role);
            await page.goto(
              kbnUrl.get(
                spaceUrl(`/app/agent_builder/conversations/${seeded.conversationId}`, space.spaceId)
              )
            );

            const alertZero = pageObjects.alertZeroApp;
            const approve = alertZero.proposalApproveButton(seeded.proposalId);
            const decline = alertZero.proposalDeclineButton(seeded.proposalId);
            // Wait for the card itself so an unrendered card cannot satisfy `toBeDisabled`.
            await expect(alertZero.proposalCard(seeded.proposalId)).toBeVisible({
              timeout: UI_TIMEOUT_MS,
            });
            await expect(approve).toBeVisible();
            await expect(decline).toBeVisible();

            await expect(approve).toBeEnabled({ enabled: canDecide });
            await expect(decline).toBeEnabled({ enabled: canDecide });
          } finally {
            try {
              if (seeded) await seeded.cleanup();
            } finally {
              await space.cleanup();
            }
          }
        }
      );
    }
  }
);
