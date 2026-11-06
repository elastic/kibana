/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import type { HttpHandler } from '@kbn/core/public';
import type { Evaluator } from '@kbn/evals';
import { STUB_CONNECTOR_ID } from '../fixtures/stub_connector';
import { getAnswerText, isRecord } from './task_output_helpers';

export const WORKFLOW_VALIDITY_EVALUATOR_NAME = 'WorkflowValidity';

export type WorkflowValidityOutcome =
  | 'no_yaml'
  | 'create_failed'
  | 'run_skipped_external_connector'
  | 'run_failed'
  | 'timed_out'
  | 'completed'
  | 'failed'
  | 'skipped';

const API_VERSION = '2023-10-31';
const WORKFLOWS_PATH = '/api/workflows/workflow';
const EXECUTIONS_PATH = '/api/workflows/executions';
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;
// After our own cancel: how long to wait for a terminal status before deleting.
const CANCEL_SETTLE_TIMEOUT_MS = 10_000;
const CANCEL_SETTLE_INTERVAL_MS = 1_000;
// A force delete is rejected with a conflict while an execution is still
// non-terminal, so it is retried with a doubling backoff.
const DELETE_MAX_ATTEMPTS = 4;
const DELETE_BACKOFF_MS = 1_000;

// Mirrors `TerminalExecutionStatuses` in @kbn/workflows; inlined because this
// package does not depend on it.
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'timed_out', 'skipped']);

/**
 * `failed` (0.5) covers a run that ended `failed` or `cancelled` on its own: the
 * workflow was valid enough to start. Our own timeout stays `timed_out` (0.5)
 * even though we cancel it. A `skipped` run never executed a step, so it proves
 * nothing and scores 0, like `run_skipped_external_connector`, which is a run
 * we refused to start. WorkflowValidity is excluded from cell means.
 */
const SCORE_BY_OUTCOME: Record<WorkflowValidityOutcome, number> = {
  completed: 1,
  failed: 0.5,
  timed_out: 0.5,
  skipped: 0,
  run_skipped_external_connector: 0,
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

const CONNECTOR_ID_KEY = 'connector-id';
const HTTP_STEP_TYPE = /^http(?:\.|$)/;
const CONNECTOR_ID_FALLBACK_PATTERN = /connector-id\s*:\s*["']?([^\s"'#]+)/g;

/**
 * Everything in the workflow that could reach beyond the stack: the id of every
 * connector a step references, plus any `http` step that sets its own `url`
 * (`params.url` overrides the connector's configured URL, so even an allowlisted
 * connector would be redirected to that host).
 */
export const collectExternalReferences = (yaml: string): string[] => {
  const references = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!isRecord(node)) return;
    const connectorId = node[CONNECTOR_ID_KEY];
    if (connectorId !== undefined && connectorId !== null) {
      references.add(String(connectorId));
    }
    const params = node.with;
    if (
      typeof node.type === 'string' &&
      HTTP_STEP_TYPE.test(node.type) &&
      isRecord(params) &&
      typeof params.url === 'string'
    ) {
      references.add(`url:${params.url}`);
    }
    Object.values(node).forEach(walk);
  };

  try {
    walk(parse(yaml));
  } catch {
    // Unparseable here but accepted by the server would bypass the guard, so
    // fall back to scanning for connector ids as plain text.
    for (const [, id] of yaml.matchAll(CONNECTOR_ID_FALLBACK_PATTERN)) {
      references.add(id);
    }
  }
  return [...references];
};

export interface WorkflowValidityDeps {
  fetch: HttpHandler;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /**
   * Connector ids a workflow may reference and still be run. Defaults to the
   * local stub the seed creates; any other id may point at an external service.
   */
  allowedConnectorIds?: readonly string[];
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Proves the workflow the agent authored actually runs: creates it on the
 * stack, runs it, waits for a terminal status, then always deletes it so a
 * cell leaves nothing behind. `validate_workflow` only checks the schema.
 *
 * The run is skipped (`run_skipped_external_connector`) unless every connector
 * the workflow references is in `allowedConnectorIds`. An execution that is
 * still running at timeout is cancelled and given a moment to settle before the
 * delete, which is retried with backoff.
 */
export const createWorkflowValidityEvaluator = ({
  fetch,
  sleep = defaultSleep,
  now = Date.now,
  allowedConnectorIds = [STUB_CONNECTOR_ID],
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
      stage?: 'create' | 'enable' | 'run' | 'poll';
      workflow_id?: string;
      run_id?: string;
      execution_status?: string;
      final_execution_status?: string;
      external_references?: string[];
      error?: string;
      cancel_error?: string;
      delete_error?: string;
      delete_attempts?: number;
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

    const executionPath = (runId: string) => `${EXECUTIONS_PATH}/${encodeURIComponent(runId)}`;
    const readStatus = async (runId: string): Promise<string | undefined> => {
      const execution = await fetch<{ status?: string }>({
        path: executionPath(runId),
        method: 'GET',
        version: API_VERSION,
      });
      return typeof execution?.status === 'string' ? execution.status : undefined;
    };

    let workflowId: string | undefined;
    let runId: string | undefined;
    // Last status seen for the run; a run is cancelled unless it is known terminal.
    let lastStatus: string | undefined;
    try {
      detail.stage = 'create';
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

      const disallowed = collectExternalReferences(yaml).filter(
        (reference) => !allowedConnectorIds.includes(reference)
      );
      if (disallowed.length > 0) {
        detail.outcome = 'run_skipped_external_connector';
        detail.external_references = disallowed;
      } else {
        detail.stage = 'enable';
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
        detail.stage = 'run';
        const started = await fetch<{ workflowExecutionId?: string }>({
          path: `${workflowPath}/run`,
          method: 'POST',
          version: API_VERSION,
          body: JSON.stringify({ inputs: {} }),
        });
        if (typeof started?.workflowExecutionId !== 'string') {
          throw new Error('run response carried no execution id');
        }
        runId = started.workflowExecutionId;
        detail.run_id = runId;

        // A throw while polling is a failed run, not a timeout: the outcome stays
        // `run_failed` until the loop ends without a terminal status.
        detail.stage = 'poll';
        const pollStart = now();
        let terminal = false;
        while (now() - pollStart < POLL_TIMEOUT_MS) {
          const status = await readStatus(runId);
          lastStatus = status;
          if (status !== undefined && TERMINAL_STATUSES.has(status)) {
            detail.execution_status = status;
            detail.outcome =
              status === 'completed'
                ? 'completed'
                : status === 'timed_out'
                ? 'timed_out'
                : status === 'skipped'
                ? 'skipped'
                : 'failed';
            terminal = true;
            break;
          }
          await sleep(POLL_INTERVAL_MS);
        }
        if (!terminal) {
          detail.outcome = 'timed_out';
        }
      }
    } catch (error) {
      // The stage and outcome already name where it threw.
      detail.error = errorMessage(error);
    } finally {
      if (runId && !(lastStatus !== undefined && TERMINAL_STATUSES.has(lastStatus))) {
        try {
          await fetch({
            path: `${executionPath(runId)}/cancel`,
            method: 'POST',
            version: API_VERSION,
          });
        } catch (error) {
          detail.cancel_error = errorMessage(error);
        }
        // The delete is rejected while the execution is non-terminal, so give
        // the cancel a bounded moment to land.
        const settleStart = now();
        try {
          while (now() - settleStart < CANCEL_SETTLE_TIMEOUT_MS) {
            const status = await readStatus(runId);
            if (status !== undefined && TERMINAL_STATUSES.has(status)) {
              detail.final_execution_status = status;
              break;
            }
            await sleep(CANCEL_SETTLE_INTERVAL_MS);
          }
        } catch (error) {
          detail.cancel_error ??= errorMessage(error);
        }
      }
      if (workflowId) {
        for (let attempt = 1; attempt <= DELETE_MAX_ATTEMPTS; attempt++) {
          detail.delete_attempts = attempt;
          try {
            await fetch({
              path: `${WORKFLOWS_PATH}/${encodeURIComponent(workflowId)}`,
              method: 'DELETE',
              version: API_VERSION,
              query: { force: true, acknowledgeAclLoss: true },
            });
            delete detail.delete_error;
            break;
          } catch (error) {
            detail.delete_error = errorMessage(error);
            if (attempt < DELETE_MAX_ATTEMPTS) {
              await sleep(DELETE_BACKOFF_MS * 2 ** (attempt - 1));
            }
          }
        }
      }
    }
    return finish();
  },
});
