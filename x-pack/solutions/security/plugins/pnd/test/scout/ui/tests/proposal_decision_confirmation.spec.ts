/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags } from '@kbn/scout-security';
import type { ScoutPage } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

// `inv-floor-datastage-013` / `prop-floor-datastage-013` are fixed seed data from
// server/routes/investigations/real_data.ts (only-if-empty seed on a fresh cluster) — a
// pending, type: 'contain' proposal, i.e. the "isolate endpoint" case the confirmation
// modal exists to protect. Do not point this at a different fixture without also
// verifying its `type`/`status` in real_data.ts, since the assertions below are
// specific to the isolate-endpoint copy.
const INVESTIGATION_ID = 'inv-floor-datastage-013';
const PROPOSAL_ID = 'prop-floor-datastage-013';

const isAcceptRequest = (url: string, method: string) =>
  url.includes('/proposals/') && url.includes('/accept') && method === 'POST';
const isTimeoutError = (error: unknown) => error instanceof Error && error.name === 'TimeoutError';

/**
 * Fails if a proposal-accept POST fires within the timeout window. No request timing out is
 * the pass case; any other error re-throws. Mirrors the same pattern used in
 * entity_store's auto-install spec (throwOnInstallRequest) for a negative network assertion.
 */
const expectNoAcceptRequest = (page: ScoutPage, timeout: number) =>
  page
    .waitForRequest((req) => isAcceptRequest(req.url(), req.method()), { timeout })
    .then(
      () => {
        throw new Error('the accept request must not fire without the modal being confirmed');
      },
      (error) => {
        if (!isTimeoutError(error)) throw error;
      }
    );

test.describe.serial(
  'PND proposal decision confirmation',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await page.gotoApp(`pnd/investigations/${INVESTIGATION_ID}/proposals/${PROPOSAL_ID}`);
      await page.testSubj.locator('pndProposalApprove').waitFor({ state: 'visible' });
    });

    // Ordered deliberately: the fixture proposal starts 'pending' and only the last test
    // (confirm -> accept) mutates it to 'approved', which would break the pending-state
    // assumptions of the tests before it. Keep the state-changing test last.

    test('clicking Isolate & approve opens a confirmation instead of calling the API immediately', async ({
      page,
    }) => {
      // The regression this guards: before the fix, this click fired the accept/isolate
      // request directly — a single misclick on a dense button row could isolate a live
      // endpoint with no undo path.
      await page.testSubj.locator('pndProposalApprove').click();

      await expect(page.testSubj.locator('pndProposalConfirmModal-accept')).toBeVisible();
      await expect(page.getByText('Isolate endpoint and approve this proposal?')).toBeVisible();

      await expectNoAcceptRequest(page, 2_000);
    });

    test('cancelling the modal leaves the proposal pending and never calls accept', async ({
      page,
    }) => {
      await page.testSubj.locator('pndProposalApprove').click();
      await page.testSubj.locator('confirmModalCancelButton').click();

      await expect(page.testSubj.locator('pndProposalConfirmModal-accept')).toBeHidden();
      await expect(page.testSubj.locator('pndProposalApprove')).toBeVisible();

      // Re-check post-cancel: even a slow, late-arriving accept request would still show up
      // within this window, so a clean timeout here is proof the click never happened.
      await expectNoAcceptRequest(page, 3_000);
    });

    test('confirming the modal actually calls accept and updates proposal status', async ({
      page,
    }) => {
      await page.testSubj.locator('pndProposalApprove').click();
      await expect(page.testSubj.locator('pndProposalConfirmModal-accept')).toBeVisible();

      const acceptRequested = page.waitForRequest(
        (req) => isAcceptRequest(req.url(), req.method()),
        { timeout: 10_000 }
      );

      await page.testSubj.locator('confirmModalConfirmButton').click();
      await acceptRequested;

      // Assert against the specific proposal row, not a bare text match — a success toast
      // ("Proposal approved") renders the word "Approved" too and would make a loose
      // getByText('Approved') match two elements (strict-mode violation).
      await expect(
        page.testSubj.locator(`pndProposalRow-${PROPOSAL_ID}`).getByText('Approved', {
          exact: false,
        })
      ).toBeVisible({ timeout: 10_000 });
    });
  }
);
