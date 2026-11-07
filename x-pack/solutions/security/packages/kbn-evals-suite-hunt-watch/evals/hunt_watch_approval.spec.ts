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
import {
  deleteIndexedFleetEndpointPolicies,
  indexFleetEndpointPolicy,
} from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_fleet_endpoint_policy';
import type { IndexedFleetEndpointPolicyResponse } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_fleet_endpoint_policy';
import type { KbnClient } from '@kbn/test';
import { evaluate, tags } from '../src/evaluate';
import { collectHuntArtifacts } from '../src/collect';
import { DEFAULT_EVAL_SPACE_ID, HOLDOUT_REPORT_IDS, HUNT_REPORT_IDS } from '../src/constants';
import { buildHuntInvestigationConversationId, resetHuntReport } from '../src/seed_hunt_data';
import {
  ensureHuntEndpointMetadata,
  respondToOutstandingActions,
  retargetFleetAgentPolicyId,
} from '../src/endpoint_action_responder';
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
 * one staying unrun, which is the boundary this spec exists to exercise. The report is the
 * assume-role one: the only seeded report whose packaging mints an actioned Proposal. Its host
 * is seeded without a Fleet agent policy carrying an endpoint package policy, so the approve
 * test pairs with `src/endpoint_action_responder.ts` to enroll the host and answer the action
 * (see that module) — without it the Defend client rejects the action request with a data
 * inconsistency before anything executes.
 */

const spaceId = DEFAULT_EVAL_SPACE_ID;
// The assume-role report, not the golden `hit`: its Investigation is the one that mints a
// pending suspend-process Proposal (aws.exe on WIN-ANALYST01), which is what the approve path
// needs. The behavior-only hit's Proposal is recommendation-only, so approving it settles
// through `no_action` and never runs an action.
const reportId = HUNT_REPORT_IDS.actioned;
const conversationId = buildHuntInvestigationConversationId({ spaceId, reportId });
// The multi-candidate hard row shares this report's actioned subject across reports in the same
// space. A Proposal one of them left pending makes packaging converge onto it instead of minting
// one here, so they are settled before this report is.
const convergingReportIds = HUNT_REPORT_IDS.multiCandidate.filter((id) => id !== reportId);
// The holdout assume-role row hunts the same WIN-ANALYST01/aws.exe subject in this same default
// space and is expected to leave its Proposal pending. Under HUNT_WATCH_HOLDOUT=1 the holdout
// spec sorts before this one, so that pending Proposal converges packaging the same way; a
// reused stack can hold one from an earlier holdout run too.
const holdoutConvergingReportIds = [HOLDOUT_REPORT_IDS[0]];

const resetApprovalReports = async ({
  esClient,
  fetch,
  log,
}: {
  esClient: Client;
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<void> => {
  for (const id of [...convergingReportIds, ...holdoutConvergingReportIds, reportId]) {
    await resetHuntReport({ esClient, fetch, log, reportId: id, spaceId });
  }
};

const isPending = (p: ProposalWithMetadata) => p.status === 'pending';

// The hunt step generates its behavior queries per run, so the same report does not always
// ground on the seeded Defend process events: a run whose query lands only on CloudTrail has
// no process to act on and mints the recommendation alone (and Tier 2 on this scenario can
// stop `incomplete_retryable` with no Proposal at all, see README). Neither is what this spec
// tests, so setup reruns the report until it has an actioned pending Proposal to decide.
const MINT_ATTEMPTS = 3;

class MissingActionedProposalError extends Error {}

const mintOnce = async ({
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
    throw new MissingActionedProposalError(
      `${reportId} raised no pending Proposal (outcome: ${report?.outcome ?? 'none'}, ` +
        `Proposals: ${report?.proposals.map((p) => `${p.id}:${p.status}`).join(', ') || 'none'})`
    );
  }
  if (!pending.some((p) => p.actionWorkflowId)) {
    throw new MissingActionedProposalError(
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

const mintPendingProposals = async (deps: {
  huntWatchClient: HuntWatchClient;
  esClient: Client;
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<ProposalWithMetadata[]> => {
  const { huntWatchClient, esClient, fetch, log } = deps;
  const misses: string[] = [];
  for (let attempt = 1; attempt <= MINT_ATTEMPTS; attempt++) {
    try {
      return await mintOnce(deps);
    } catch (error) {
      if (!(error instanceof MissingActionedProposalError)) throw error;
      misses.push(`attempt ${attempt}: ${error.message}`);
      log.warning(`mint ${attempt}/${MINT_ATTEMPTS} missed: ${error.message}`);
      if (attempt < MINT_ATTEMPTS) {
        await huntWatchClient.cancelPending();
        await resetApprovalReports({ esClient, fetch, log });
      }
    }
  }
  throw new Error(misses.join('; '));
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

/**
 * Approve-path prerequisites, staged once per worker before the tests: the hunt host's endpoint
 * metadata (so endpoint-id validation resolves the seeded agent) and a real Fleet agent policy
 * carrying an endpoint package policy that the seeded `.fleet-agents` doc is pointed at (so the
 * Defend client's policy lookup passes). Returns teardown that restores the agent's original
 * policy_id and deletes the created policies.
 */
const stageApprovePath = async ({
  esClient,
  kbnClient,
  log,
}: {
  esClient: Client;
  kbnClient: KbnClient;
  log: ToolingLog;
}): Promise<() => Promise<void>> => {
  await ensureHuntEndpointMetadata({ esClient, log });

  const runId = String(Date.now());
  let indexed: IndexedFleetEndpointPolicyResponse | undefined;
  try {
    indexed = await indexFleetEndpointPolicy(
      kbnClient,
      `hunt-eval-endpoint-package-policy-${runId}`,
      undefined,
      `hunt-eval-endpoint-agent-policy-${runId}`,
      log
    );
  } catch (error) {
    throw new Error(`approve path: creating the Fleet endpoint policy failed: ${String(error)}`);
  }
  const agentPolicyId = indexed.agentPolicies[0]?.id;
  if (!agentPolicyId || indexed.integrationPolicies.length === 0) {
    await deleteIndexedFleetEndpointPolicies(kbnClient, indexed);
    throw new Error(
      'approve path: indexFleetEndpointPolicy returned no agent policy or endpoint package policy'
    );
  }

  let previousPolicyId: string | undefined;
  try {
    previousPolicyId = await retargetFleetAgentPolicyId({ esClient, policyId: agentPolicyId, log });
  } catch (error) {
    // No teardown is returned on this path, so the policies created above are deleted here.
    await deleteIndexedFleetEndpointPolicies(kbnClient, indexed).catch((cleanupError) => {
      log.warning(`approve path: deleting the Fleet policies failed: ${String(cleanupError)}`);
    });
    throw error;
  }
  log.info(
    `approve path: hunt agent enrolled on endpoint agent policy ${agentPolicyId}${
      previousPolicyId ? ` (was ${previousPolicyId})` : ' (no previous policy_id)'
    }`
  );

  return async () => {
    if (previousPolicyId) {
      await retargetFleetAgentPolicyId({
        esClient,
        policyId: previousPolicyId,
        log,
      }).catch((error) => {
        log.warning(`approve path: restoring the agent's policy_id failed: ${String(error)}`);
      });
    }
    await deleteIndexedFleetEndpointPolicies(kbnClient, indexed);
  };
};

evaluate.describe('Hunt Watch proposal gate', { tag: tags.serverless.security.complete }, () => {
  let approvePathTeardown: (() => Promise<void>) | undefined;

  evaluate.beforeAll(async ({ esClient, kbnClient, log }) => {
    approvePathTeardown = await stageApprovePath({ esClient, kbnClient, log });
  });

  evaluate.afterAll(async () => {
    await approvePathTeardown?.();
  });

  evaluate.beforeEach(async ({ esClient, fetch, log }) => {
    await resetApprovalReports({ esClient, fetch, log });
  });

  evaluate.afterEach(async ({ huntWatchClient, fetch, log }) => {
    await huntWatchClient.cancelPending();
    await dismissLeftovers({ fetch, log });
  });

  evaluate(
    'approve settles the gate and closes the Investigation as resolved',
    async ({ huntWatchClient, esClient, fetch, log }) => {
      const pending = await mintPendingProposals({ huntWatchClient, esClient, fetch, log });
      // A minute of slack covers clock skew between this runner and Kibana.
      const approvedSince = new Date(Date.now() - 60_000).toISOString();
      for (const { id } of pending) {
        await approveProposal({ fetch, spaceId, proposalId: id, rationale: 'eval approve path' });
      }
      // The seeded host cannot answer the dispatched suspend-process itself; respond for it so
      // the action's completion poll resolves and the Proposal settles as `succeeded`.
      const answered = await respondToOutstandingActions({
        esClient,
        log,
        since: approvedSince,
      });
      if (answered === 0) {
        log.warning('approve path: no outstanding endpoint action was found to respond to');
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
