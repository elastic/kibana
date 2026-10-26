/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import type { Page } from '@kbn/scout-security/ui';
import {
  createUiOnboardingSpace,
  createWorkerServiceAccount,
  deleteSeededProposals,
  listWorkers,
  ok,
  patchWorker,
  seedClosedProposal,
  spaceTest,
  tags,
  type OnboardingSpace,
} from '../fixtures';

/**
 * Post-enable main page & closed window (#19934).
 *
 * After enablement the app root is the queue (ConversationsPage), and the
 * closed bucket lists settled proposals from the last 72h (`CLOSED_DECIDED_WITHIN_HOURS`,
 * filtered on `decidedAt`, not `@timestamp`). The window edge is asserted with
 * both sides: a 71h-old decision must appear, a 73h-old one must not. Issue
 * #19934's text says 24h; ROUTE_MAP item 4 records the mismatch — the code's
 * 72h is the contract this spec pins.
 */
spaceTest.describe(
  'AlertZero onboarding - post-enable page and closed window',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.setTimeout(180_000);

    /**
     * Enables one worker through the same API shape the onboarding UI's save
     * uses (service account + settingsRevision), so the landing page latches
     * to the queue. Returns the service-account cleanup.
     */
    const enableFirstWorker = async (space: OnboardingSpace): Promise<() => Promise<void>> => {
      const workers = await listWorkers(space.api, space.spaceId);
      const target = workers[0];
      const account = await createWorkerServiceAccount(space.api, target.id);
      ok(
        await patchWorker(space.api, space.spaceId, target.id, {
          enabled: true,
          settingsRevision: target.settingsRevision ?? null,
          settings: { serviceAccountId: account.id },
        }),
        `enable ${target.id}`
      );
      return account.cleanup;
    };

    /**
     * Opens the app root, waits for the queue, expands the closed accordion.
     * The closed bucket starts collapsed (`useState(id !== CLOSED_GROUP_KEY)`).
     */
    const openClosedBucket = async (page: Page): Promise<void> => {
      const closedToggle = page.getByRole('button', { name: /Closed Actions/ });
      await closedToggle.click();
    };

    spaceTest(
      'post-enable app root is the queue, not onboarding',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        let cleanupAccount: (() => Promise<void>) | undefined;
        try {
          cleanupAccount = await enableFirstWorker(space);
          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));

          // The queue (not the onboarding wizard) is the post-enable landing.
          await expect(page.testSubj.locator('alertZeroProposalsTrendChartRow')).toBeVisible();
          await expect(page.testSubj.locator('alertZeroOnboardingIntroPromo')).toBeHidden();
        } finally {
          if (cleanupAccount) await cleanupAccount();
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'closed rows show the decision time',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices, esClient }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        const seeded: string[] = [];
        let cleanupAccount: (() => Promise<void>) | undefined;
        try {
          cleanupAccount = await enableFirstWorker(space);
          const proposal = await seedClosedProposal(esClient, space.spaceId, {
            title: 'Closed row shows decision time',
            decidedAtHoursAgo: 2,
          });
          seeded.push(proposal.id);

          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          await openClosedBucket(page);

          // The row is keyed by the proposal id (card `aria-label` = proposal title).
          const row = page.locator(`[aria-label="${proposal.title}"]`);
          await expect(row).toBeVisible();
          // Decision time renders as a relative age of the seeded `decidedAt` (2h ago).
          await expect(row.getByText(/2 hours ago|an hour ago/i)).toBeVisible();
        } finally {
          if (cleanupAccount) await cleanupAccount();
          await deleteSeededProposals(esClient, seeded);
          await space.cleanup();
        }
      }
    );

    spaceTest(
      '72h window: 71h-old decision listed, 73h-old excluded',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices, esClient }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        const seeded: string[] = [];
        let cleanupAccount: (() => Promise<void>) | undefined;
        try {
          cleanupAccount = await enableFirstWorker(space);
          const inWindow = await seedClosedProposal(esClient, space.spaceId, {
            title: 'Recently decided appears in closed queue',
            decidedAtHoursAgo: 71,
          });
          const outOfWindow = await seedClosedProposal(esClient, space.spaceId, {
            title: 'Older than the closed window drops out',
            decidedAtHoursAgo: 73,
          });
          seeded.push(inWindow.id, outOfWindow.id);

          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          await openClosedBucket(page);

          // Positive control first: the 71h row must be there, or the negative
          // below could pass for an unrelated reason (wrong space, fetch failed).
          await expect(page.locator(`[aria-label="${inWindow.title}"]`)).toBeVisible();
          // NEGATIVE CONTROL: positive assertion on the must-not-render surface —
          // `toBeHidden` would pass vacuously during load.
          await expect(page.locator(`[aria-label="${outOfWindow.title}"]`)).toHaveCount(0);
        } finally {
          if (cleanupAccount) await cleanupAccount();
          await deleteSeededProposals(esClient, seeded);
          await space.cleanup();
        }
      }
    );
  }
);
