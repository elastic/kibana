/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import {
  PROPOSAL_APPROVE_URL,
  PROPOSAL_DISMISS_URL,
  PROPOSALS_API_VERSION,
  PROPOSALS_INTERNAL_URL,
  type DismissReason,
  type ProposalWithMetadata,
} from '@kbn/proposals-common';
import { getConversation, type InvestigationConversation } from './collect';
import { apiVersion, sleep, spacePath } from './kibana_api';

/**
 * Human decisions on the hunt Proposal gate. Only `evals/hunt_watch_approval.spec.ts` may import
 * this module: scored tasks never decide a Proposal, and the pre-run reset dismisses through
 * `seed_hunt_data.ts` (`hitl_contract.test.ts` pins both).
 */

const proposalUrl = (template: string, id: string) =>
  template.replace('{id}', encodeURIComponent(id));

interface ProposalsPage {
  proposals: ProposalWithMetadata[];
}

/** Every revision of every Proposal on an Investigation, any status. */
export const listConversationProposals = async ({
  fetch,
  spaceId,
  conversationId,
}: {
  fetch: HttpHandler;
  spaceId: string;
  conversationId: string;
}): Promise<ProposalWithMetadata[]> => {
  const page = await fetch<ProposalsPage>(spacePath(spaceId, PROPOSALS_INTERNAL_URL), {
    method: 'GET',
    headers: apiVersion(PROPOSALS_API_VERSION),
    query: { conversationId, size: 100 },
  });
  return page.proposals;
};

export const approveProposal = ({
  fetch,
  spaceId,
  proposalId,
  rationale,
}: {
  fetch: HttpHandler;
  spaceId: string;
  proposalId: string;
  rationale: string;
}): Promise<ProposalWithMetadata> =>
  fetch<ProposalWithMetadata>(spacePath(spaceId, proposalUrl(PROPOSAL_APPROVE_URL, proposalId)), {
    method: 'POST',
    headers: apiVersion(PROPOSALS_API_VERSION),
    body: JSON.stringify({ rationale }),
  });

export const dismissProposal = ({
  fetch,
  spaceId,
  proposalId,
  dismissReason,
  rationale,
}: {
  fetch: HttpHandler;
  spaceId: string;
  proposalId: string;
  dismissReason: DismissReason;
  rationale: string;
}): Promise<ProposalWithMetadata> =>
  fetch<ProposalWithMetadata>(spacePath(spaceId, proposalUrl(PROPOSAL_DISMISS_URL, proposalId)), {
    method: 'POST',
    headers: apiVersion(PROPOSALS_API_VERSION),
    body: JSON.stringify({ dismissReason, rationale }),
  });

/**
 * The gate closes the Investigation only after every Proposal on it has settled, which for an
 * approved action means the action workflow ran first. Polls until `metadata.status` is `closed`.
 */
export const waitForInvestigationClosed = async ({
  fetch,
  spaceId,
  conversationId,
  maxWaitMs = 180_000,
}: {
  fetch: HttpHandler;
  spaceId: string;
  conversationId: string;
  maxWaitMs?: number;
}): Promise<InvestigationConversation> => {
  const deadline = Date.now() + maxWaitMs;
  let latest: InvestigationConversation | undefined;
  while (Date.now() < deadline) {
    latest = await getConversation({ fetch, spaceId, conversationId });
    if (latest?.metadata?.status === 'closed') return latest;
    await sleep(3_000);
  }
  throw new Error(
    `Investigation ${conversationId} in space "${spaceId}" did not close within ${maxWaitMs}ms ` +
      `(status: ${latest?.metadata?.status ?? 'missing'}). The proposal gate settles only when ` +
      `no Proposal is pending or executing; check the gate executions for this conversation.`
  );
};

/** Terminal status a decided Proposal must reach: actioned approvals execute, everything else does not. */
export const expectedSettledStatus = (
  proposal: Pick<ProposalWithMetadata, 'actionWorkflowId'>,
  decision: 'approved' | 'dismissed'
): 'succeeded' | 'no_action' =>
  decision === 'approved' && proposal.actionWorkflowId ? 'succeeded' : 'no_action';

/** Names every way a decided Proposal's record disagrees with the decision that was made. */
export const describeSettlementProblems = ({
  decided,
  settled,
  decision,
  dismissReason,
}: {
  decided: ProposalWithMetadata[];
  settled: ProposalWithMetadata[];
  decision: 'approved' | 'dismissed';
  dismissReason?: DismissReason;
}): string[] =>
  decided.flatMap((before) => {
    const after = settled.find((p) => p.id === before.id);
    if (!after) return [`${before.id}: missing after decision`];
    const problems: string[] = [];
    if (after.decision !== decision) {
      problems.push(`${after.id}: decision is ${after.decision ?? 'unset'}, expected ${decision}`);
    }
    const expectedStatus = expectedSettledStatus(before, decision);
    if (after.status !== expectedStatus) {
      problems.push(`${after.id}: status is ${after.status}, expected ${expectedStatus}`);
    }
    if (dismissReason && after.dismissReason !== dismissReason) {
      problems.push(
        `${after.id}: dismissReason is ${after.dismissReason ?? 'unset'}, expected ${dismissReason}`
      );
    }
    if (after.executionError) {
      problems.push(`${after.id}: executionError "${after.executionError}"`);
    }
    return problems;
  });
