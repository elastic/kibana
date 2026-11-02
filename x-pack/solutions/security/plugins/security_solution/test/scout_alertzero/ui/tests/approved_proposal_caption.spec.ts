/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  cleanupProposalsOfConversation,
  createInvestigation,
  deleteInvestigation,
  enableAlertZero,
  seedApprovedNoActionProposal,
  test,
} from '../fixtures';

test.describe('AlertZero approved proposal caption', { tag: tags.stateful.classic }, () => {
  let restoreAlertZero: (() => Promise<void>) | undefined;
  let seeded: { investigationId: string; proposalId: string } | undefined;

  test.beforeAll(async ({ apiServices, kbnClient, esClient }) => {
    restoreAlertZero = await enableAlertZero({ apiServices, kbnClient });
    const investigationId = await createInvestigation(kbnClient, 'Scout approved proposal caption');
    const proposalId = await seedApprovedNoActionProposal(esClient, {
      conversationId: investigationId,
      title: 'Review detection gap',
      decidedBy: { username: 'ada', fullName: 'Ada Lovelace', email: null },
    });
    seeded = { investigationId, proposalId };
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ kbnClient, esClient }) => {
    if (seeded) {
      await cleanupProposalsOfConversation(esClient, seeded.investigationId);
      await deleteInvestigation(kbnClient, seeded.investigationId);
    }
    await restoreAlertZero?.();
  });

  test('names who approved a proposal that had no action to run, and when', async ({
    pageObjects,
  }) => {
    if (!seeded) {
      throw new Error('The investigation and its proposal were not seeded');
    }
    const { investigationId, proposalId } = seeded;
    const { alertZeroQueue } = pageObjects;

    await alertZeroQueue.gotoInvestigationFlyout(investigationId, proposalId);

    await expect(alertZeroQueue.proposedAction(proposalId)).toContainText(/Ada Lovelace • \d/);
  });
});
