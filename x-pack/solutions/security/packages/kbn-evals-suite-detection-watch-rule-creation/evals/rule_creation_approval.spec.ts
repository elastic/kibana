/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalConnector } from '@kbn/evals';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { ExecutionStatus } from '@kbn/workflows';
import { evaluate, tags } from '../src/evaluate';
import type { RuleCreationClient, RuleCreationResult } from '../src/rule_creation_client';
import {
  assertDraftRanOnModel,
  assertWorkflowInstalled,
  bindModelUnderTest,
  ensureJudgeConnectorAccessible,
} from '../src/workflow_fixture';

const WORKFLOW_INPUT = {
  technique: 'T1078.001',
  gap_description:
    'No rule covering attempts to authenticate using known default credentials on Linux hosts.',
  evidence: 'Repeated su/sudo failures with default usernames across 3 Linux endpoints.',
  confidence: 0.85,
};

/**
 * KQL phrase escaping for agent-generated rule names. The draft step derives the
 * name from the gap description, so it can contain quotes or backslashes that
 * would otherwise 400 the `_find` filter and surface as an opaque poll timeout.
 */
const escapeKqlPhrase = (value: string): string => value.replace(/([\\"])/g, '\\$1');

const findRuleByName = async (
  fetch: HttpHandler,
  ruleName: string
): Promise<{ id: string; name: string; enabled: boolean } | undefined> => {
  const { data } = await fetch<{ data: Array<{ id: string; name: string; enabled: boolean }> }>(
    `/api/detection_engine/rules/_find`,
    {
      method: 'GET',
      query: { filter: `alert.attributes.name: "${escapeKqlPhrase(ruleName)}"`, per_page: 1 },
    }
  );
  return data?.[0];
};

const deleteRule = async (fetch: HttpHandler, id: string): Promise<void> => {
  await fetch(`/api/detection_engine/rules`, {
    method: 'DELETE',
    query: { id },
  });
};

/**
 * Runs the workflow up to the proposal gate and fails with the reason it did not get there.
 * WORKFLOW_INPUT is a winnable gap, so a run that never proposes is a real failure: either the
 * agent declined it (over-refusal), or a step between the draft and the gate broke.
 */
const runToProposal = async ({
  ruleCreationClient,
  connector,
  onRuleName,
}: {
  ruleCreationClient: RuleCreationClient;
  connector: EvalConnector;
  onRuleName: (name: string | undefined) => void;
}): Promise<RuleCreationResult & { proposalId: string }> => {
  const result = await ruleCreationClient.run({ input: WORKFLOW_INPUT });
  // Capture the name before deciding: if the decision throws or the test fails
  // mid-flight, afterEach still knows what to sweep by name.
  onRuleName(result.rule?.name);
  assertDraftRanOnModel({ connectorId: result.connectorId, expected: connector.id });

  if (!result.pendingApproval || !result.proposalId) {
    if (result.skipped) {
      throw new Error(
        `The agent declined a winnable gap (${result.skipReason}) so the workflow never ` +
          `proposed a rule — the draft step is over-refusing.`
      );
    }
    throw new Error(
      `Execution ${result.workflowExecutionId} did not reach the proposal gate ` +
        `(status: ${result.status}, rule drafted: ${Boolean(result.rule)})`
    );
  }
  return { ...result, proposalId: result.proposalId };
};

evaluate.describe(
  'Rule Creation Worker — approval gate',
  { tag: tags.serverless.security.complete },
  () => {
    // Rules created by an approved run outlive the test that created them. Inline
    // cleanup only runs on success — a leaked rule from a failed approve test
    // false-fails the reject test's non-existence assertion. afterEach cancels
    // any still-running execution first (a parked run that resumes after the test
    // body threw can still create a rule mid-sweep), then sweeps on every path,
    // including assertion failure and timeout.
    const createdRuleIds = new Set<string>();
    let createdRuleName: string | undefined;
    let restoreModelBinding: (() => Promise<void>) | undefined;

    evaluate.afterEach(async ({ ruleCreationClient, fetch, log }) => {
      await ruleCreationClient.cancelPending();
      for (const id of createdRuleIds) {
        await deleteRule(fetch, id).catch((err: Error) =>
          log.error(`Failed to sweep rule ${id}: ${err.message}`)
        );
      }
      createdRuleIds.clear();
      if (createdRuleName) {
        const name = createdRuleName;
        createdRuleName = undefined;
        try {
          const rule = await findRuleByName(fetch, name);
          if (rule) {
            await deleteRule(fetch, rule.id);
            log.info(`Swept leaked rule "${name}" (${rule.id}) by name`);
          }
        } catch (err) {
          log.error(
            `Failed to sweep rule "${name}" by name: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }
    });

    evaluate.afterAll(async ({ log }: { log: ToolingLog }) => {
      await restoreModelBinding?.().catch((error: Error) =>
        log.warning(`Could not restore inference feature settings: ${error.message}`)
      );
    });

    evaluate.beforeAll(
      async ({
        fetch,
        connector,
        log,
      }: {
        fetch: HttpHandler;
        connector: EvalConnector;
        log: ToolingLog;
      }) => {
        await ensureJudgeConnectorAccessible({ fetch, connector, log });
        await assertWorkflowInstalled({ fetch, log });
        restoreModelBinding = await bindModelUnderTest({ fetch, connector, log });
      }
    );

    evaluate(
      'rule is saved in the detection engine when the user approves',
      async ({ ruleCreationClient, fetch, log, connector }) => {
        const result = await runToProposal({
          ruleCreationClient,
          connector,
          onRuleName: (name) => (createdRuleName = name),
        });

        // Nothing may exist before the analyst decides: the gate, not the draft, creates.
        const ruleName = result.rule?.name;
        if (!ruleName) {
          throw new Error('draft_creation produced no rule name — cannot verify the approve path');
        }
        if (await findRuleByName(fetch, ruleName)) {
          throw new Error(`Rule "${ruleName}" exists before approval — the gate was bypassed`);
        }

        const execution = await ruleCreationClient.respond({
          workflowExecutionId: result.workflowExecutionId,
          proposalId: result.proposalId,
          approved: true,
        });
        if (execution.status !== ExecutionStatus.COMPLETED) {
          throw new Error(`Workflow did not complete after approval — status: ${execution.status}`);
        }

        const proposal = await ruleCreationClient.getProposal(result.proposalId);
        if (proposal.decision !== 'approved' || proposal.status !== 'succeeded') {
          throw new Error(
            `Proposal ${result.proposalId} settled as decision=${proposal.decision}, ` +
              `status=${proposal.status} — expected approved/succeeded`
          );
        }

        log.info(`Verifying rule "${ruleName}" was created after approval`);
        const rule = await findRuleByName(fetch, ruleName);
        if (!rule) {
          throw new Error(
            `Rule "${ruleName}" was not found in the detection engine after approval`
          );
        }
        createdRuleIds.add(rule.id);
        // The create action always creates the rule disabled; enabling is the analyst's call.
        if (rule.enabled) {
          throw new Error(`Rule "${ruleName}" was created enabled — the create action must not`);
        }
        log.info(`Confirmed rule "${ruleName}" exists, disabled — registered for afterEach sweep`);
      }
    );

    evaluate(
      'rule is not created when the user rejects',
      async ({ ruleCreationClient, fetch, log, connector }) => {
        const result = await runToProposal({
          ruleCreationClient,
          connector,
          onRuleName: (name) => (createdRuleName = name),
        });

        const execution = await ruleCreationClient.respond({
          workflowExecutionId: result.workflowExecutionId,
          proposalId: result.proposalId,
          approved: false,
        });
        // A dismissal settles the gate without running the action; the run still completes.
        if (execution.status !== ExecutionStatus.COMPLETED) {
          throw new Error(
            `Workflow did not complete after rejection — status: ${execution.status}`
          );
        }

        const proposal = await ruleCreationClient.getProposal(result.proposalId);
        if (proposal.decision !== 'dismissed') {
          throw new Error(
            `Proposal ${result.proposalId} settled as decision=${proposal.decision} — expected dismissed`
          );
        }

        const ruleName = result.rule?.name;
        if (!ruleName) {
          throw new Error('draft_creation produced no rule name — cannot verify the reject path');
        }
        log.info(`Verifying rule "${ruleName}" was NOT created after rejection`);
        if (await findRuleByName(fetch, ruleName)) {
          throw new Error(
            `Rule "${ruleName}" was found in the detection engine after rejection — the create action should not have run`
          );
        }
        log.info(`Confirmed rule "${ruleName}" does not exist after rejection`);
      }
    );
  }
);
