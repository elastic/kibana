/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, stringify } from 'yaml';
import type { HttpHandler } from '@kbn/core/public';
import type { Evaluator } from '@kbn/evals';
import { STUB_CONNECTOR_ID } from '../fixtures/stub_connector';
import { getAnswerText, isRecord } from './task_output_helpers';

export const WORKFLOW_VALIDITY_EVALUATOR_NAME = 'WorkflowValidity';

export type WorkflowValidityOutcome =
  | 'no_yaml'
  | 'create_failed'
  | 'run_skipped_unparsed'
  | 'run_skipped_external_connector'
  | 'run_skipped_unverified_stub'
  | 'run_failed'
  | 'timed_out'
  | 'completed'
  | 'failed'
  | 'skipped';

const API_VERSION = '2023-10-31';
// `POST /api/workflows/validate` is an internal route.
const INTERNAL_API_VERSION = '1';
const API_VERSION_HEADER = 'elastic-api-version';
// The fixture `fetch` (`httpHandlerFromKbnClient`) ignores `options.version`, so
// the version is sent as an explicit header. Without it an internal route answers
// 400 under `--dev`.
const PUBLIC_HEADERS = { [API_VERSION_HEADER]: API_VERSION };
const INTERNAL_HEADERS = { [API_VERSION_HEADER]: INTERNAL_API_VERSION };
const VALIDATE_PATH = '/api/workflows/validate';
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
 * Score per outcome. WorkflowValidity is excluded from cell means; the score is
 * a per-example signal only.
 *
 * - `completed` 1: the workflow ran to a successful end.
 * - `failed` 0.5: the run ended `failed` or `cancelled` on its own; the workflow
 *   was valid enough to start.
 * - `timed_out` 0.5: our own timeout, even though we cancel the run.
 * - `skipped` 0: the engine skipped the run, so no step executed.
 * - `run_skipped_unparsed` 0: the YAML does not parse, so it is never run.
 * - `run_skipped_external_connector` 0: a step is outside the safe allowlist
 *   (could reach beyond the stack); nothing is created or run. `valid_not_run`
 *   in the metadata says whether the server accepts the YAML structurally.
 * - `run_skipped_unverified_stub` 0: the workflow is safe but the seed could not
 *   confirm the stub connector at its id, so the run is not attempted.
 * - `run_failed` 0: a request in create-enable-run-poll threw.
 * - `create_failed` 0: the server rejected the workflow.
 * - `no_yaml` 0: the answer held no workflow.
 */
const SCORE_BY_OUTCOME: Record<WorkflowValidityOutcome, number> = {
  completed: 1,
  failed: 0.5,
  timed_out: 0.5,
  skipped: 0,
  run_skipped_unparsed: 0,
  run_skipped_external_connector: 0,
  run_skipped_unverified_stub: 0,
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
// Step types that cannot reach beyond the stack. `http` is further restricted
// to the stub connector; the `data.*` entries are in-process transforms. The set
// is explicit so a new `data.*` step type is skipped until it is reviewed.
const SAFE_STEP_TYPES = new Set([
  'console',
  'wait',
  'if',
  'foreach',
  'data.set',
  'data.map',
  'data.filter',
  'data.dedupe',
]);
// Arrays under these keys hold steps (`parallel.branches[].steps` reaches
// `steps` through the branch record).
const STEP_ARRAY_KEYS = new Set(['steps', 'else', 'fallback']);
// Keys whose values are data or expressions, never steps.
const DATA_KEYS = new Set(['with', 'foreach', 'if', 'condition']);
// Root keys that hold metadata, not executable steps.
const ROOT_METADATA_KEYS = new Set([
  'version',
  'name',
  'run-name',
  'description',
  'enabled',
  'tags',
  'triggers',
  'inputs',
  'consts',
  'outputs',
]);

export interface StepAudit {
  /** Steps that must not run, as `<name>:<type>` plus the reason. */
  unsafe: string[];
  /** True when at least one step runs on the stub connector. */
  usesStubConnector: boolean;
}

/**
 * Step-type allowlist over every step, however deeply nested (`steps`, `else`,
 * `fallback`, `branches[].steps`, any other array of typed records). A workflow
 * is safe to run only when it contains nothing but: `http` steps bound to the
 * stub connector id whose `with` sets no `url`, `console`, `data.set`,
 * `data.map`, `data.filter`, `data.dedupe`, `wait`, `if` and `foreach`.
 * The `.http` params schema is strict and `url` is the only field that replaces
 * the connector's base URL: `path` is joined onto it, `headers` do not change
 * the connection target, and a `url` inside `with.body` is request payload. Every other type, including `kibana.request`,
 * `workflow.execute*`, HITL steps and connector-typed steps such as `slack`,
 * is unsafe. Anything not recognisably a step in a step position is unsafe too.
 */
export const auditSteps = (root: Record<string, unknown>): StepAudit => {
  const unsafe: string[] = [];
  let usesStubConnector = false;

  const checkStep = (step: unknown): void => {
    if (!isRecord(step)) {
      unsafe.push('<non-object step>');
      return;
    }
    const type = typeof step.type === 'string' ? step.type : undefined;
    const label = `${typeof step.name === 'string' ? step.name : '<unnamed>'}:${
      type ?? '<no type>'
    }`;
    if (type === 'http') {
      if (step[CONNECTOR_ID_KEY] !== STUB_CONNECTOR_ID) {
        unsafe.push(`${label} (connector-id is not the stub connector)`);
      } else if (step.with !== undefined && !isRecord(step.with)) {
        // A templated `with` could resolve to an object that carries `url`.
        unsafe.push(`${label} (with is not a mapping)`);
      } else if (isRecord(step.with) && 'url' in step.with) {
        unsafe.push(`${label} (sets a url)`);
      } else {
        usesStubConnector = true;
      }
    } else if (type === undefined || !SAFE_STEP_TYPES.has(type)) {
      unsafe.push(`${label} (step type is not allowed)`);
    } else if (CONNECTOR_ID_KEY in step) {
      unsafe.push(`${label} (references a connector)`);
    }
    Object.entries(step).forEach(([key, value]) => {
      if (!DATA_KEYS.has(key)) walk(value, key);
    });
  };

  const walk = (node: unknown, parentKey?: string): void => {
    if (Array.isArray(node)) {
      node.forEach((child) => {
        if (parentKey !== undefined && STEP_ARRAY_KEYS.has(parentKey)) checkStep(child);
        else walk(child, parentKey);
      });
      return;
    }
    if (!isRecord(node)) return;
    if (typeof node.type === 'string') {
      checkStep(node);
      return;
    }
    Object.entries(node).forEach(([key, value]) => {
      if (!DATA_KEYS.has(key)) walk(value, key);
    });
  };

  Object.entries(root).forEach(([key, value]) => {
    if (!ROOT_METADATA_KEYS.has(key)) walk(value, key);
  });
  return { unsafe, usesStubConnector };
};

type ParsedWorkflow = { ok: true; root: Record<string, unknown> } | { ok: false; reason: string };

const MANUAL_TRIGGERS = [{ type: 'manual' }];

const fixtureValueFor = (declaration: Record<string, unknown>): unknown => {
  const options = declaration.options ?? declaration.enum;
  if (Array.isArray(options) && options.length > 0) {
    const first: unknown = options[0];
    return isRecord(first) && 'value' in first ? first.value : first;
  }
  switch (declaration.type) {
    case 'number':
    case 'integer':
      return 1;
    case 'boolean':
      return true;
    case 'array': {
      // The engine rejects fewer than `minItems` items, so a required array
      // gets that many fixture items of its declared item type.
      const { minItems, items } = declaration;
      const count = typeof minItems === 'number' && minItems > 0 ? Math.min(minItems, 10) : 0;
      const itemDeclaration = isRecord(items) && typeof items.type === 'string' ? items : {};
      return Array.from({ length: count }, () => fixtureValueFor(itemDeclaration));
    }
    case 'object':
      return {};
    default:
      return 'persona-matrix-fixture';
  }
};

/**
 * Run inputs for a workflow the agent authored. The engine rejects a run whose
 * required inputs are missing before any step executes, which would score the
 * evaluator's own omission as an authoring failure. Only inputs that are required
 * and have no default get a fixture value of their declared type. Optional inputs
 * are omitted: supplying one can break a runnable workflow (an optional array with
 * `minItems: 1` sent as `[]` is rejected by the engine's input validator), and
 * declared defaults are left to the engine. Handles the list form
 * (`[{ name, type, required, default }]`) and the JSON-schema form
 * (`{ properties: { <name>: { type, default } }, required: [<name>] }`).
 */
export const buildRunInputs = (root: Record<string, unknown>): Record<string, unknown> => {
  const inputs: Record<string, unknown> = {};
  const declare = (name: unknown, declaration: unknown, required: boolean) => {
    if (typeof name !== 'string' || !isRecord(declaration)) return;
    if (!required || 'default' in declaration) return;
    inputs[name] = fixtureValueFor(declaration);
  };
  const declared = root.inputs;
  if (Array.isArray(declared)) {
    declared.forEach(
      (entry) => isRecord(entry) && declare(entry.name, entry, entry.required === true)
    );
  } else if (isRecord(declared) && isRecord(declared.properties)) {
    const required = new Set(Array.isArray(declared.required) ? declared.required : []);
    Object.entries(declared.properties).forEach(([name, entry]) =>
      declare(name, entry, required.has(name))
    );
  }
  return inputs;
};

const hasNonManualTrigger = (root: Record<string, unknown>): boolean =>
  Array.isArray(root.triggers) &&
  root.triggers.some((trigger) => !isRecord(trigger) || trigger.type !== 'manual');

const parseWorkflow = (yaml: string): ParsedWorkflow => {
  try {
    const root: unknown = parse(yaml);
    if (!isRecord(root) || !Array.isArray(root.steps)) {
      return { ok: false, reason: 'document has no steps list' };
    }
    return { ok: true, root };
  } catch (error) {
    return { ok: false, reason: errorMessage(error) };
  }
};

export interface WorkflowValidityDeps {
  fetch: HttpHandler;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /**
   * Whether the seed confirmed the connector at the stub id is the local `.http`
   * stub. When false, a workflow that uses the stub connector is not run, since
   * whatever sits at that id may be a real external connector.
   */
  stubVerified: () => boolean;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Proves the workflow the agent authored actually runs: creates it on the
 * stack, runs it, waits for a terminal status, then always deletes it so a
 * cell leaves nothing behind. `validate_workflow` only checks the schema.
 *
 * The safety guard runs BEFORE anything is created. YAML that does not parse is
 * `run_skipped_unparsed`; a step outside the allowlist (`auditSteps`) is
 * `run_skipped_external_connector`; a stub-bound workflow whose stub connector
 * the seed could not verify is `run_skipped_unverified_stub`. A skipped
 * workflow never hits the create route; it is only sent to the validate route
 * so the metadata can say whether it was valid YAML (`valid_not_run`).
 * A workflow with any non-`manual` trigger is created with its triggers replaced
 * by a single manual one (`triggers_rewritten`), so enabling it cannot schedule
 * or event-fire runs beyond the one this evaluator starts.
 * An execution still running at timeout is cancelled and given a moment to
 * settle before the delete, which is retried with backoff.
 */
export const createWorkflowValidityEvaluator = ({
  fetch,
  sleep = defaultSleep,
  now = Date.now,
  stubVerified,
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
      skipped_steps?: string[];
      triggers_rewritten?: boolean;
      valid_not_run?: boolean;
      validate_error?: string;
      parse_error?: string;
      error?: string;
      cancel_error?: string;
      settle_error?: string;
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
        headers: PUBLIC_HEADERS,
      });
      return typeof execution?.status === 'string' ? execution.status : undefined;
    };

    const parsed = parseWorkflow(yaml);
    if (!parsed.ok) {
      detail.outcome = 'run_skipped_unparsed';
      detail.parse_error = parsed.reason;
      return finish();
    }
    const audit = auditSteps(parsed.root);
    const skipOutcome: WorkflowValidityOutcome | undefined =
      audit.unsafe.length > 0
        ? 'run_skipped_external_connector'
        : audit.usesStubConnector && !stubVerified()
        ? 'run_skipped_unverified_stub'
        : undefined;
    if (skipOutcome) {
      detail.outcome = skipOutcome;
      if (audit.unsafe.length > 0) detail.skipped_steps = audit.unsafe;
      try {
        const validation = await fetch<{ valid?: boolean }>({
          path: VALIDATE_PATH,
          method: 'POST',
          version: INTERNAL_API_VERSION,
          headers: INTERNAL_HEADERS,
          body: JSON.stringify({ yaml }),
        });
        detail.valid_not_run = validation?.valid === true;
      } catch (error) {
        detail.validate_error = errorMessage(error);
      }
      return finish();
    }

    let workflowId: string | undefined;
    let runId: string | undefined;
    // Last status seen for the run; a run is cancelled unless it is known terminal.
    let lastStatus: string | undefined;
    try {
      // A scheduled or event trigger would fire the workflow on its own once it is
      // enabled; only the evaluator's explicit run may execute it.
      let createYaml = yaml;
      if (hasNonManualTrigger(parsed.root)) {
        createYaml = stringify({ ...parsed.root, triggers: MANUAL_TRIGGERS });
        detail.triggers_rewritten = true;
      }
      detail.stage = 'create';
      detail.outcome = 'create_failed';
      const created = await fetch<{ id?: string; enabled?: boolean }>({
        path: WORKFLOWS_PATH,
        method: 'POST',
        version: API_VERSION,
        headers: PUBLIC_HEADERS,
        body: JSON.stringify({ yaml: createYaml }),
      });
      if (typeof created?.id !== 'string') {
        throw new Error('create response carried no workflow id');
      }
      workflowId = created.id;
      detail.workflow_id = workflowId;

      detail.stage = 'enable';
      detail.outcome = 'run_failed';
      const workflowPath = `${WORKFLOWS_PATH}/${encodeURIComponent(workflowId)}`;
      if (created.enabled === false) {
        await fetch({
          path: workflowPath,
          method: 'PUT',
          version: API_VERSION,
          headers: PUBLIC_HEADERS,
          body: JSON.stringify({ enabled: true }),
        });
      }
      detail.stage = 'run';
      const started = await fetch<{ workflowExecutionId?: string }>({
        path: `${workflowPath}/run`,
        method: 'POST',
        version: API_VERSION,
        headers: PUBLIC_HEADERS,
        body: JSON.stringify({ inputs: buildRunInputs(parsed.root) }),
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
            headers: PUBLIC_HEADERS,
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
          detail.settle_error = errorMessage(error);
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
              headers: PUBLIC_HEADERS,
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
