/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import type { Client } from '@elastic/elasticsearch';
import { evaluate, tags } from '../src/evaluate';
import { collectHuntArtifacts } from '../src/collect';
import { DEFAULT_EVAL_SPACE_ID, HUNT_REPORT_IDS } from '../src/constants';
import { buildHuntInvestigationConversationId, resetHuntReport } from '../src/seed_hunt_data';
import {
  approveProposal,
  describeSettlementProblems,
  dismissProposal,
  listConversationProposals,
  waitForInvestigationClosed,
} from '../src/proposal_gate';
import type { HuntWatchClient } from '../src/hunt_watch_client';

/**
 * Unscored e2e for the hunt Proposal gate: a hit run mints pending Proposals, a human decides
 * them, the gate settles and closes the Investigation. Approve runs the action behind an
 * actioned Proposal (`succeeded`) and records an actionless one as `no_action`; dismiss records
 * every Proposal as `no_action` with the reason, so an action that ran would show up as the wrong
 * status. Both paths end `closed` / `resolved`: the gate closes once nothing is pending or
 * executing, whatever the decision was.
 *
 * Setup requires at least one pending Proposal that carries an action. Without it both tests
 * settle entirely through `no_action` and never show an approved action running or a dismissed
 * one staying unrun, which is the boundary this spec exists to exercise.
 */

const spaceId = DEFAULT_EVAL_SPACE_ID;
const reportId = HUNT_REPORT_IDS.hit;
const conversationId = buildHuntInvestigationConversationId({ spaceId, reportId });

const isPending = (p: ProposalWithMetadata) => p.status === 'pending';

const mintPendingProposals = async ({
  huntWatchClient,
  esClient,
  fetch,
  log,
}: {
  huntWatchClient: HuntWatchClient;
  esClient: Client;
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<ProposalWithMetadata[]> => {
  const run = await huntWatchClient.run({ spaceId, reportIds: [reportId] });
  const artifacts = await collectHuntArtifacts({
    run,
    reportIds: [reportId],
    fetch,
    esClient,
    log,
  });
  const report = artifacts.reports[reportId];
  const pending = report?.proposals.filter(isPending) ?? [];
  if (pending.length === 0) {
    throw new Error(
      `${reportId} raised no pending Proposal (outcome: ${report?.outcome ?? 'none'}, ` +
        `Proposals: ${report?.proposals.map((p) => `${p.id}:${p.status}`).join(', ') || 'none'})`
    );
  }
  if (!pending.some((p) => p.actionWorkflowId)) {
    throw new Error(
      `${reportId} raised no pending Proposal with an action, so approve and dismiss would both ` +
        `settle through no_action only (pending: ${pending
          .map((p) => `${p.id}:${p.actionWorkflowId ?? 'no action'}`)
          .join(', ')})`
    );
  }
  if (report?.conversation?.metadata?.status === 'closed') {
    throw new Error(`Investigation ${conversationId} closed before any Proposal was decided`);
  }
  return pending;
};

const dismissLeftovers = async ({ fetch, log }: { fetch: HttpHandler; log: ToolingLog }) => {
  const leftovers = (await listConversationProposals({ fetch, spaceId, conversationId })).filter(
    isPending
  );
  for (const { id } of leftovers) {
    await dismissProposal({
      fetch,
      spaceId,
      proposalId: id,
      dismissReason: 'no_reason',
      rationale: 'eval teardown',
    });
  }
  if (leftovers.length > 0) log.info(`Dismissed ${leftovers.length} leftover Proposal(s)`);
};

evaluate.describe('Hunt Watch proposal gate', { tag: tags.serverless.security.complete }, () => {
  evaluate.beforeEach(async ({ esClient, fetch, log }) => {
    await resetHuntReport({ esClient, fetch, log, reportId, spaceId });
  });

  evaluate.afterEach(async ({ huntWatchClient, fetch, log }) => {
    await huntWatchClient.cancelPending();
    await dismissLeftovers({ fetch, log });
  });

  evaluate(
    'approve settles the gate and closes the Investigation as resolved',
    async ({ huntWatchClient, esClient, fetch, log }) => {
      const pending = await mintPendingProposals({ huntWatchClient, esClient, fetch, log });
      for (const { id } of pending) {
        await approveProposal({ fetch, spaceId, proposalId: id, rationale: 'eval approve path' });
      }

      const conversation = await waitForInvestigationClosed({ fetch, spaceId, conversationId });
      const settled = await listConversationProposals({ fetch, spaceId, conversationId });
      const problems = [
        ...describeSettlementProblems({ decided: pending, settled, decision: 'approved' }),
        ...(conversation.metadata?.close_reason === 'resolved'
          ? []
          : [
              `close_reason is ${
                conversation.metadata?.close_reason ?? 'unset'
              }, expected resolved`,
            ]),
      ];
      if (problems.length > 0) throw new Error(problems.join('; '));
    }
  );

  evaluate(
    'dismiss settles the gate with no action executed and closes the Investigation as resolved',
    async ({ huntWatchClient, esClient, fetch, log }) => {
      const pending = await mintPendingProposals({ huntWatchClient, esClient, fetch, log });
      for (const { id } of pending) {
        await dismissProposal({
          fetch,
          spaceId,
          proposalId: id,
          dismissReason: 'risk_accepted',
          rationale: 'eval dismiss path',
        });
      }

      const conversation = await waitForInvestigationClosed({ fetch, spaceId, conversationId });
      const settled = await listConversationProposals({ fetch, spaceId, conversationId });
      const problems = [
        ...describeSettlementProblems({
          decided: pending,
          settled,
          decision: 'dismissed',
          dismissReason: 'risk_accepted',
        }),
        ...(conversation.metadata?.close_reason === 'resolved'
          ? []
          : [
              `close_reason is ${
                conversation.metadata?.close_reason ?? 'unset'
              }, expected resolved`,
            ]),
      ];
      if (problems.length > 0) throw new Error(problems.join('; '));
    }
  );
});
