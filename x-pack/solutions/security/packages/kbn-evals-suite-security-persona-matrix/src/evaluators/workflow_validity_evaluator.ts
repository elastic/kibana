/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { Evaluator } from '@kbn/evals';
import { getAnswerText, isRecord } from './task_output_helpers';

export const WORKFLOW_VALIDITY_EVALUATOR_NAME = 'WorkflowValidity';

export type WorkflowValidityOutcome =
  | 'no_yaml'
  | 'create_failed'
  | 'run_failed'
  | 'timed_out'
  | 'completed'
  | 'failed';

const API_VERSION = '2023-10-31';
const WORKFLOWS_PATH = '/api/workflows/workflow';
const EXECUTIONS_PATH = '/api/workflows/executions';
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;

// Mirrors `TerminalExecutionStatuses` in @kbn/workflows; inlined because this
// package does not depend on it.
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'timed_out', 'skipped']);

const SCORE_BY_OUTCOME: Record<WorkflowValidityOutcome, number> = {
  completed: 1,
  failed: 0.5,
  timed_out: 0.5,
  run_failed: 0,
  create_failed: 0,
  no_yaml: 0,
};

const FENCE_PATTERN = /```([a-z]*)[^\S\n]*\n([\s\S]*?)```/gi;
const STEPS_KEY_PATTERN = /^steps\s*:/m;
const TOP_LEVEL_LINE_PATTERN = /^(?:\s|#|-\s|[A-Za-z_][\w-]*\s*:)/;

const fencedBlocks = (text: string): Array<{ lang: string; body: string }> =>
  Array.from(text.matchAll(FENCE_PATTERN), ([, lang, body]) => ({
    lang: lang.toLowerCase(),
    body: body.trim(),
  }));

/** Unfenced YAML: from the first `name:` line, as long as `steps:` follows. */
const extractUnfenced = (text: string): string | undefined => {
  const lines = text.split('\n');
  const start = lines.findIndex((line, index) => {
    return /^name\s*:/.test(line) && STEPS_KEY_PATTERN.test(lines.slice(index).join('\n'));
  });
  if (start === -1) return undefined;
  const end = lines.findIndex(
    (line, index) => index > start && line.trim() !== '' && !TOP_LEVEL_LINE_PATTERN.test(line)
  );
  return lines
    .slice(start, end === -1 ? undefined : end)
    .join('\n')
    .trim();
};

/**
 * Order: a fenced block holding `steps:`, else the first yaml-labelled fence,
 * else unfenced text from a `name:` line that has `steps:`, else the YAML of
 * the conversation's workflow attachment (what a rendered workflow leaves
 * behind when the answer is prose only).
 */
export const extractWorkflowYaml = (
  answer: string,
  attachments: Array<{ yaml: string }>
): string | undefined => {
  const blocks = fencedBlocks(answer);
  const fenced =
    blocks.find(({ body }) => STEPS_KEY_PATTERN.test(body)) ??
    blocks.find(({ lang }) => lang === 'yaml' || lang === 'yml');
  return fenced?.body ?? extractUnfenced(answer) ?? attachments[attachments.length - 1]?.yaml;
};

const attachmentsOf = (output: unknown): Array<{ yaml: string }> => {
  const raw = isRecord(output) ? output.workflowAttachments : undefined;
  return Array.isArray(raw)
    ? raw.flatMap((entry) =>
        isRecord(entry) && typeof entry.yaml === 'string' ? [{ yaml: entry.yaml }] : []
      )
    : [];
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export interface WorkflowValidityDeps {
  fetch: HttpHandler;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Proves the workflow the agent authored actually runs: creates it on the
 * stack, runs it, waits for a terminal status, then always deletes it so a
 * cell leaves nothing behind. `validate_workflow` only checks the schema.
 */
export const createWorkflowValidityEvaluator = ({
  fetch,
  sleep = defaultSleep,
  now = Date.now,
}: WorkflowValidityDeps): Evaluator => ({
  name: WORKFLOW_VALIDITY_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    if (!isRecord(metadata) || metadata.validateWorkflow !== true) {
      return {
        score: null,
        label: 'N/A',
        explanation:
          'Prompt does not validate an authored workflow — WorkflowValidity does not apply.',
        metadata: {},
      };
    }

    const startedAt = now();
    const detail: {
      outcome: WorkflowValidityOutcome;
      workflow_id?: string;
      run_id?: string;
      execution_status?: string;
      error?: string;
      delete_error?: string;
    } = { outcome: 'no_yaml' };
    const finish = () => {
      const { outcome } = detail;
      return {
        score: SCORE_BY_OUTCOME[outcome],
        label: outcome,
        explanation: detail.error
          ? `Workflow validation outcome: ${outcome} (${detail.error}).`
          : `Workflow validation outcome: ${outcome}.`,
        metadata: { ...detail, duration_ms: now() - startedAt },
      };
    };

    const yaml = extractWorkflowYaml(getAnswerText(output), attachmentsOf(output));
    if (!yaml) {
      return finish();
    }

    let workflowId: string | undefined;
    try {
      detail.outcome = 'create_failed';
      const created = await fetch<{ id?: string; enabled?: boolean }>({
        path: WORKFLOWS_PATH,
        method: 'POST',
        version: API_VERSION,
        body: JSON.stringify({ yaml }),
      });
      if (typeof created?.id !== 'string') {
        throw new Error('create response carried no workflow id');
      }
      workflowId = created.id;
      detail.workflow_id = workflowId;

      detail.outcome = 'run_failed';
      const workflowPath = `${WORKFLOWS_PATH}/${encodeURIComponent(workflowId)}`;
      if (created.enabled === false) {
        await fetch({
          path: workflowPath,
          method: 'PUT',
          version: API_VERSION,
          body: JSON.stringify({ enabled: true }),
        });
      }
      const started = await fetch<{ workflowExecutionId?: string }>({
        path: `${workflowPath}/run`,
        method: 'POST',
        version: API_VERSION,
        body: JSON.stringify({ inputs: {} }),
      });
      if (typeof started?.workflowExecutionId !== 'string') {
        throw new Error('run response carried no execution id');
      }
      const runId = started.workflowExecutionId;
      detail.run_id = runId;

      detail.outcome = 'timed_out';
      const pollStart = now();
      while (now() - pollStart < POLL_TIMEOUT_MS) {
        const execution = await fetch<{ status?: string }>({
          path: `${EXECUTIONS_PATH}/${encodeURIComponent(runId)}`,
          method: 'GET',
          version: API_VERSION,
        });
        const status = execution?.status;
        if (typeof status === 'string' && TERMINAL_STATUSES.has(status)) {
          detail.execution_status = status;
          detail.outcome =
            status === 'completed' ? 'completed' : status === 'timed_out' ? 'timed_out' : 'failed';
          break;
        }
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (error) {
      // The outcome already names the stage that threw.
      detail.error = errorMessage(error);
    } finally {
      if (workflowId) {
        try {
          await fetch({
            path: `${WORKFLOWS_PATH}/${encodeURIComponent(workflowId)}`,
            method: 'DELETE',
            version: API_VERSION,
            query: { force: true, acknowledgeAclLoss: true },
          });
        } catch (error) {
          detail.delete_error = errorMessage(error);
        }
      }
    }
    return finish();
  },
});
