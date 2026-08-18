/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { ExecutionStatus } from '@kbn/workflows';
import { evaluate, tags } from '../src/evaluate';
import { assertWorkflowInstalled, ensureConnectorAccessible } from '../src/workflow_fixture';

const APPROVAL_INPUT = {
  technique: 'T1078.001',
  gap_description:
    'No rule covering attempts to authenticate using known default credentials on Linux hosts.',
  evidence: 'Repeated su/sudo failures with default usernames across 3 Linux endpoints.',
  confidence: 0.85,
};

const findRuleByName = async (
  fetch: HttpHandler,
  ruleName: string
): Promise<{ id: string; name: string } | undefined> => {
  const { data } = await fetch<{ data: Array<{ id: string; name: string }> }>(
    `/api/detection_engine/rules/_find`,
    {
      method: 'GET',
      query: { filter: `alert.attributes.name: "${ruleName}"`, per_page: 1 },
    }
  );
  return data?.[0];
};

evaluate.describe(
  'Rule Creation Worker — approval gate',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate.beforeAll(
      async ({
        fetch,
        connector,
        log,
      }: {
        fetch: HttpHandler;
        connector: AvailableConnectorWithId;
        log: ToolingLog;
      }) => {
        await ensureConnectorAccessible({ fetch, connector, log });
        await assertWorkflowInstalled({ fetch, log });
      }
    );

    evaluate(
      'rule is saved in the detection engine when the user approves',
      async ({ ruleCreationClient, fetch, log }) => {
        const result = await ruleCreationClient.run({ input: APPROVAL_INPUT });

        if (!result.pendingApproval) {
          throw new Error(
            `Workflow did not reach review_creation — cannot test approval gate. Status was not WAITING_FOR_INPUT.`
          );
        }

        const execution = await ruleCreationClient.respond({
          workflowExecutionId: result.workflowExecutionId,
          stepExecutions: result.stepExecutions,
          approved: true,
        });

        if (execution.status !== ExecutionStatus.COMPLETED) {
          throw new Error(`Workflow did not complete after approval — status: ${execution.status}`);
        }

        if (!result.rule?.name) {
          throw new Error('No rule name available to verify creation');
        }

        const ruleName = result.rule.name;
        log.info(`Verifying rule "${ruleName}" was created in the detection engine`);

        const rule = await findRuleByName(fetch, ruleName);
        if (!rule) {
          throw new Error(
            `Rule "${ruleName}" was not found in the detection engine after approval`
          );
        }

        // Delete immediately — a leaked rule would false-fail the rejection
        // test's name-based lookup, since both tests share APPROVAL_INPUT.
        log.info(`Rule "${ruleName}" confirmed in detection engine — cleaning up`);
        await fetch(`/api/detection_engine/rules`, {
          method: 'DELETE',
          query: { id: rule.id },
        });
      }
    );

    evaluate(
      'rule is not saved in the detection engine when the user rejects',
      async ({ ruleCreationClient, fetch, log }) => {
        const result = await ruleCreationClient.run({ input: APPROVAL_INPUT });

        if (!result.pendingApproval) {
          throw new Error(
            `Workflow did not reach review_creation — cannot test rejection gate. Status was not WAITING_FOR_INPUT.`
          );
        }

        const ruleName = result.rule?.name;

        const execution = await ruleCreationClient.respond({
          workflowExecutionId: result.workflowExecutionId,
          stepExecutions: result.stepExecutions,
          approved: false,
        });

        // create_rule is if-guarded, not a workflow failure: rejection still completes.
        if (execution.status !== ExecutionStatus.COMPLETED) {
          throw new Error(
            `Workflow did not complete after rejection — status: ${execution.status}`
          );
        }

        if (!ruleName) {
          log.info('No rule name from draft_creation — skipping detection engine check');
          return;
        }

        log.info(`Verifying rule "${ruleName}" was NOT created after rejection`);

        const rule = await findRuleByName(fetch, ruleName);
        if (rule) {
          throw new Error(
            `Rule "${ruleName}" was found in the detection engine after rejection — create_rule should not have fired`
          );
        }

        log.info(`Confirmed rule "${ruleName}" does not exist after rejection`);
      }
    );
  }
);
