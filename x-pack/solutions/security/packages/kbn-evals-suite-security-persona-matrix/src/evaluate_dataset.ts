/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { isValidTraceId } from '@opentelemetry/api';
import {
  createQuantitativeCorrectnessEvaluators,
  createQuantitativeGroundednessEvaluator,
  createTrajectoryEvaluator,
  getToolCallSteps,
  withEvaluatorSpan,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type EvaluationDataset,
  type EvaluationResult,
  type Evaluator,
  type TaskOutput,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  PersonaMatrixExample,
  PersonaMatrixExampleInput,
} from './datasets/persona_matrix_prompts';
import { selectShard } from './datasets/select_shard';
import {
  collectDeliveredArtifact,
  createConnectorInvokedEvaluator,
} from './evaluators/connector_invoked_evaluator';
import { createEicarTrapEvaluator } from './evaluators/eicar_trap_evaluator';
import { createRubricCapNoToolCallEvaluator } from './evaluators/rubric_cap_no_tool_call_evaluator';
import { createSimulationAwarenessEvaluator } from './evaluators/simulation_awareness_evaluator';
import { createStalledAfterLoadSkillEvaluator } from './evaluators/stalled_after_load_skill_evaluator';
import { createUnrequestedSideEffectsEvaluator } from './evaluators/unrequested_side_effects_evaluator';
import { createWorkflowValidityEvaluator } from './evaluators/workflow_validity_evaluator';
import { isStubConnectorVerified } from './fixtures/persona_matrix_tools_seed';
import { TRACE_INDEX_PATTERN } from './evaluators/trace_index_pattern';
import {
  createPersonaMatrixInputTokensEvaluator,
  createPersonaMatrixLatencyEvaluator,
  createPersonaMatrixOutputTokensEvaluator,
  createPersonaMatrixToolCallsEvaluator,
} from './evaluators/trace_evaluators';
import type { PersonaMatrixChatClient } from './chat_client';
import { UNANSWERED_PROMPT_MARKER } from './chat_client';
import {
  agentProfile as envAgentProfile,
  PERSONA_MATRIX_SUITE_IDS,
  withProfileExpectedTools,
  type AgentProfile,
} from './agent_profile';
import { capJudgePayload, getJudgePayloadCapOptionsFromEnv } from './judge_payload_cap';

/**
 * Dataset-level expected output the framework evaluators read via `expected`.
 * `reference` is the ground-truth answer for qualitative scoring; `expected`
 * is the field `correctness/index.ts` reads (`expected?.expected`) — we
 * persist both so a single dataset row drives correctness/groundedness
 * scoring. `tool_sequence` is copied from `metadata.expectedTools` so the
 * trajectory evaluator's `goldenPathExtractor` — which only receives
 * `expected`, not `metadata` — can see the golden path. Mirrors
 * `AlertsRagDatasetExpected` in `kbn-evals-suite-alerts-rag/src/evaluate_dataset.ts`.
 */
export interface PersonaMatrixDatasetExpected {
  reference: string;
  expected: string;
  tool_sequence?: string[];
}

export type PersonaMatrixDatasetExample = PersonaMatrixExample & {
  output: PersonaMatrixDatasetExpected;
};

/**
 * Maps a raw persona-matrix example into the shape the framework evaluators
 * expect: mirrors `output.reference` into `output.expected`, and copies
 * `metadata.expectedTools` into `output.tool_sequence` so
 * `goldenPathExtractor` can resolve the golden path from `expected` without
 * `@kbn/evals`'s `createTrajectoryEvaluator` needing access to `metadata`.
 * One mapping function instead of per-example duplication — cannot drift.
 */
export const toDatasetExample = (ex: PersonaMatrixExample): PersonaMatrixDatasetExample => {
  const expectedTools = ex.metadata?.expectedTools;
  return {
    ...ex,
    output: {
      reference: ex.output.reference,
      expected: ex.output.reference,
      ...(expectedTools?.length ? { tool_sequence: expectedTools } : {}),
    },
  };
};

/**
 * ExpectedToolCalled — verifies every declared expected tool was invoked.
 * Reads `expectedTools` from example metadata, or `tool_sequence` from the
 * expected output.
 *
 * Scores the whole declared set, not just `expectedTools[0]`. 16 of the 21
 * examples declare more than one expected tool, so reading only the first
 * entry left the rest unenforced: an example annotated
 * `['platform.core.generate_esql', 'platform.core.execute_esql']` scored 1 for
 * a run that generated a query and never executed it.
 *
 * All-or-nothing rather than a partial ratio: `Trajectory` already reports
 * graded per-tool overlap. `missingToolIds` names what was skipped so a 0 is
 * diagnosable without re-reading the trace.
 */
export const createPersonaMatrixExpectedToolCalledEvaluator = (): Evaluator => ({
  name: 'ExpectedToolCalled',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected, metadata }) => {
    // Try tool_sequence from expected output first, then expectedTools from metadata
    const toolSequence = (expected as PersonaMatrixDatasetExpected | undefined)?.tool_sequence;
    const meta = metadata as { expectedTools?: string[] } | undefined;
    const expectedTools = meta?.expectedTools ?? toolSequence;

    if (!expectedTools?.length) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No expectedTools annotation — skipping ExpectedToolCalled.',
      };
    }

    const usedToolIds = getToolCallSteps(output as TaskOutput)
      .map((step) => step.tool_id)
      .filter((id): id is string => Boolean(id));

    const usedToolIdSet = new Set(usedToolIds);
    const missingToolIds = expectedTools.filter((toolId) => !usedToolIdSet.has(toolId));

    return {
      score: missingToolIds.length === 0 ? 1 : 0,
      explanation: missingToolIds.length
        ? `Expected tools not called: ${missingToolIds.join(', ')}.`
        : `All expected tools called: ${expectedTools.join(', ')}.`,
      metadata: { expectedToolIds: expectedTools, missingToolIds, usedToolIds },
    };
  },
});

/**
 * Tools whose successful result is itself the user-facing deliverable: they
 * render an artifact (a rule, an authored workflow) inline in the
 * conversation. A run that ends on one of these has answered the user even
 * with no closing prose. The value names the result field that proves the
 * artifact was produced, besides `success: true` and an `attachment_id`;
 * `null` when the id alone suffices (`generate_workflow` returns only ids plus
 * a prose comment, the YAML stays in the attachment).
 */
const ARTIFACT_PRODUCING_TOOLS: ReadonlyMap<string, string | null> = new Map([
  ['security.create_detection_rule', 'rule'],
  ['security.update_detection_rule', 'rule'],
  ['platform.core.generate_workflow', null],
]);

const messageTexts = (output: TaskOutput): string[] =>
  (
    ((output as { messages?: Array<{ message?: unknown }> }).messages ?? []) as Array<{
      message?: unknown;
    }>
  )
    .map((entry) => entry?.message)
    .filter((message): message is string => typeof message === 'string');

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isRenderTagFor = (text: string, attachmentId: string): boolean =>
  text.includes('<render_attachment') &&
  new RegExp(`<render_attachment[^>]*\\bid\\s*=\\s*["']?${escapeRegExp(attachmentId)}\\b`).test(
    text
  );

/**
 * True when the run rendered an artifact: an artifact-producing tool returned
 * `success: true` with its payload (see `ARTIFACT_PRODUCING_TOOLS`) AND an
 * `attachment_id`, and a message
 * emitted a `<render_attachment id="<that id>">` tag. The tool only stores the
 * attachment; the user sees it solely when the agent emits the tag, so a
 * successful tool result alone is not a rendered artifact.
 */
const hasRenderedArtifact = (output: TaskOutput): boolean => {
  const texts = messageTexts(output);
  if (texts.length === 0) {
    return false;
  }
  return getToolCallSteps(output).some((step) => {
    if (!step.tool_id || !ARTIFACT_PRODUCING_TOOLS.has(step.tool_id)) {
      return false;
    }
    const payloadKey = ARTIFACT_PRODUCING_TOOLS.get(step.tool_id);
    return (step.results ?? []).some((result) => {
      const data = (result as { data?: Record<string, unknown> } | undefined)?.data;
      const attachmentId = data?.attachment_id;
      return Boolean(
        data?.success === true &&
          (payloadKey === null || payloadKey === undefined || data?.[payloadKey]) &&
          typeof attachmentId === 'string' &&
          attachmentId.length > 0 &&
          texts.some((text) => isRenderTagFor(text, attachmentId))
      );
    });
  });
};

// The skill prose calls the tool `attachment_update`; the registered id is
// `attachments.update`.
const ATTACHMENT_UPDATE_TOOLS: ReadonlySet<string> = new Set([
  'attachments.update',
  'attachment_update',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The version the last `<render_attachment>` tag for `attachmentId` pinned, or
 * undefined when it pinned none — the UI then shows the latest version.
 */
const renderedVersionFor = (texts: string[], attachmentId: string): number | undefined => {
  let version: number | undefined;
  texts.forEach((text) => {
    Array.from(text.matchAll(/<render_attachment\b[^>]*>/g), ([tag]) => tag)
      .filter((tag) => isRenderTagFor(tag, attachmentId))
      .forEach((tag) => {
        const pinned = tag.match(/\bversion\s*=\s*["']?(\d+)/);
        version = pinned ? Number(pinned[1]) : undefined;
      });
  });
  return version;
};

const parseUpdatedPayload = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

interface RenderedResult {
  payloadKey: string | null;
  data: Record<string, unknown>;
  attachmentId: string;
  stepIndex: number;
}

/** An attachment update the tool confirmed, with the version it created. */
const confirmedUpdate = (
  step: Record<string, unknown>,
  attachmentId: string
): { version: number; payload: unknown } | undefined => {
  const params = isRecord(step.params) ? step.params : undefined;
  const data = isRecord(params?.data) ? params?.data : undefined;
  if (
    typeof step.tool_id !== 'string' ||
    !ATTACHMENT_UPDATE_TOOLS.has(step.tool_id) ||
    params?.attachment_id !== attachmentId ||
    typeof data?.text !== 'string'
  ) {
    return undefined;
  }
  const results = Array.isArray(step.results) ? step.results : [];
  const confirmed = results
    .map((result) => (isRecord(result) && result.type !== 'error' ? result.data : undefined))
    .find(
      (resultData): resultData is Record<string, unknown> =>
        isRecord(resultData) &&
        typeof resultData.version === 'number' &&
        (resultData.attachment_id === undefined || resultData.attachment_id === attachmentId)
    );
  return confirmed
    ? { version: confirmed.version as number, payload: parseUpdatedPayload(data.text) }
    : undefined;
};

/**
 * Every version of a rule attachment, in order: each successful rule tool
 * result for it (a query rewrite updates the attachment in place) and each
 * confirmed attachment update. A failed update never changed the attachment.
 */
const attachmentVersionHistory = (
  rendered: readonly RenderedResult[],
  steps: ReadonlyArray<Record<string, unknown>>,
  attachmentId: string
): Array<{ version: number; payload: unknown }> => {
  const versions: Array<{ version: number; payload: unknown }> = [];
  const nextVersion = () => (versions.length ? versions[versions.length - 1].version + 1 : 1);
  steps.forEach((step, stepIndex) => {
    rendered
      .filter((entry) => entry.stepIndex === stepIndex && entry.attachmentId === attachmentId)
      .forEach(({ payloadKey, data }) => {
        if (payloadKey !== null) {
          versions.push({
            version: typeof data.version === 'number' ? data.version : nextVersion(),
            payload: data[payloadKey],
          });
        }
      });
    const update = confirmedUpdate(step, attachmentId);
    if (update) {
      versions.push(update);
    }
  });
  return versions;
};

/**
 * The rendered artifact's own payload, when the run rendered one — the rule
 * object or the workflow YAML the user actually saw. Used as the judged answer
 * for fallback runs that end on a rendered artifact.
 *
 * A rule attachment can be changed after creation (a query rewrite, or the
 * skill raising the default severity via `attachment_update`), so the payload
 * is the version the render tag pinned, else the latest.
 */
const renderedArtifactPayload = (output: TaskOutput): unknown => {
  const texts = messageTexts(output);
  const rawSteps = (output as { steps?: unknown }).steps;
  const steps = (Array.isArray(rawSteps) ? rawSteps : []).filter(
    (step): step is Record<string, unknown> => isRecord(step) && step.type === 'tool_call'
  );
  const rendered = steps.flatMap((step, stepIndex) => {
    const payloadKey =
      typeof step.tool_id === 'string' ? ARTIFACT_PRODUCING_TOOLS.get(step.tool_id) : undefined;
    if (payloadKey === undefined) {
      return [];
    }
    const results = Array.isArray(step.results) ? step.results : [];
    return results.flatMap((result) => {
      const data = isRecord(result) && isRecord(result.data) ? result.data : undefined;
      const attachmentId = data?.attachment_id;
      if (
        !data ||
        data.success !== true ||
        typeof attachmentId !== 'string' ||
        !texts.some((text) => isRenderTagFor(text, attachmentId))
      ) {
        return [];
      }
      return [{ payloadKey, data, attachmentId, stepIndex }];
    });
  });
  const last = rendered[rendered.length - 1];
  if (!last) {
    return undefined;
  }
  if (last.payloadKey === null) {
    return collectDeliveredArtifact(output);
  }

  const versions = attachmentVersionHistory(rendered, steps, last.attachmentId);
  const pinned = renderedVersionFor(texts, last.attachmentId);
  const visible = versions.filter(({ version }) => pinned === undefined || version <= pinned);
  return (visible[visible.length - 1] ?? versions[0]).payload;
};

/**
 * Regression gate for the empty-final-message failure mode: some
 * detection-rule-edit runs ended on a tool call with no user-facing closing
 * text, leaving judges (and users) with nothing to read.
 *
 * Scores 1 when the run leaves the user something to read: either non-empty
 * closing prose, or a rendered artifact (a created/updated rule whose
 * `<render_attachment>` tag was emitted). The artifact clause exists because
 * `detection-rule-edit` references explicitly ask the agent to render the rule
 * attachment inline "rather than describing the rule in prose only". A
 * successful rule tool call alone does not count: it only stores the
 * attachment, so a run that ends silently after it is the real
 * premature-termination failure and still scores 0.
 *
 * N/A only when the task produced no output at all (harness failure — already
 * surfaced by every other evaluator).
 */
export const createPersonaMatrixFinalAnswerPresentEvaluator = (): Evaluator => ({
  name: 'FinalAnswerPresent',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const taskOutput = output as
      | { messages?: Array<{ message?: unknown }>; messageSource?: string }
      | undefined;
    if (!taskOutput) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No task output — skipping FinalAnswerPresent.',
      };
    }
    // A 'last_assistant_step' message is chat_client's fallback to interior
    // narration for runs that ended on a tool call; it is not a closing answer.
    const hasMessage =
      taskOutput.messageSource !== 'last_assistant_step' &&
      (taskOutput.messages ?? []).some(
        (msg) => typeof msg?.message === 'string' && msg.message.trim().length > 0
      );
    if (hasMessage) {
      return { score: 1, explanation: 'Final user-facing message present.' };
    }
    if (hasRenderedArtifact(output as TaskOutput)) {
      return {
        score: 1,
        explanation: 'No closing prose, but the run rendered an artifact inline.',
      };
    }
    return {
      score: 0,
      explanation: 'Run ended without a user-facing final message or rendered artifact.',
    };
  },
});

/**
 * MinExpectedSteps — flags "gave up without trying": the agent produced a
 * (possibly non-empty) answer but performed fewer tool calls than the example
 * declares in `expectedTools`. Distinct from FinalAnswerPresent (which only
 * checks that *some* text exists) — a model can write a confident answer having
 * called nothing, which is the premature-termination failure mode this
 * evaluator exists to catch.
 *
 * Scores 1 when the run made at least `expectedTools.length` tool calls,
 * otherwise 0. N/A when the example declares no expectedTools (nothing to
 * compare against) or the task produced no output.
 */
export const createPersonaMatrixMinExpectedStepsEvaluator = (): Evaluator => ({
  name: 'MinExpectedSteps',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected, metadata }) => {
    const toolSequence = (expected as PersonaMatrixDatasetExpected | undefined)?.tool_sequence;
    const meta = metadata as { expectedTools?: string[] } | undefined;
    const expectedTools = meta?.expectedTools ?? toolSequence ?? [];
    const minToolCalls = expectedTools.length;
    if (minToolCalls === 0) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No expectedTools annotation — skipping MinExpectedSteps.',
      };
    }
    const taskOutput = output as TaskOutput | undefined;
    if (!taskOutput) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No task output — skipping MinExpectedSteps.',
      };
    }
    const actualToolCalls = getToolCallSteps(taskOutput).length;
    const met = actualToolCalls >= minToolCalls;
    return {
      score: met ? 1 : 0,
      explanation: met
        ? `Made ${actualToolCalls} tool call(s), meeting the expected minimum of ${minToolCalls}.`
        : `Made ${actualToolCalls} tool call(s) but expected at least ${minToolCalls} (${expectedTools.join(
            ', '
          )}) — agent may have given up without trying.`,
    };
  },
});

/**
 * Trajectory evaluator wrapper. Returns N/A when an example has no
 * `tool_sequence` annotation so partial-coverage datasets don't get
 * penalised. Mirrors `createAlertsRagTrajectoryEvaluator` in
 * `kbn-evals-suite-alerts-rag/src/evaluate_dataset.ts`. `filestore.read`
 * (SKILL.md activation) is stripped from the actual sequence since it's
 * already covered by the SkillInvoked evaluator and would otherwise show
 * up as a noisy "extra tool".
 */
const FILESTORE_READ_TOOL_ID = 'filestore.read';

export const isRankablePathContract = (
  metadata: { pathContract?: 'rankable' | 'candidate' | 'probe' } | undefined
): boolean => metadata?.pathContract !== 'probe';

export const createPersonaMatrixTrajectoryEvaluator = (): Evaluator => {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) =>
      getToolCallSteps(output as TaskOutput)
        .map((step) => step.tool_id)
        .filter((id): id is string => Boolean(id) && id !== FILESTORE_READ_TOOL_ID),
    goldenPathExtractor: (expected) => {
      const exp = expected as PersonaMatrixDatasetExpected | undefined;
      return exp?.tool_sequence ?? [];
    },
  });

  return {
    ...inner,
    name: 'Trajectory',
    evaluate: async (args) => {
      const exp = args.expected as PersonaMatrixDatasetExpected | undefined;
      const meta = args.metadata as
        | { pathContract?: 'rankable' | 'candidate' | 'probe' }
        | undefined;
      if (!isRankablePathContract(meta)) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'Open-ended capability probe — trajectory is diagnostic, not rankable.',
          metadata: { pathContract: 'probe' },
        };
      }
      if (!exp?.tool_sequence || exp.tool_sequence.length === 0) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No tool_sequence annotation — skipping trajectory evaluation.',
        };
      }
      return inner.evaluate(args);
    },
  };
};

/**
 * SkillInvoked — verifies the agent loaded an acceptable skill for THIS example.
 *
 * Scored per-example from the example's own metadata, not fanned out across the
 * whole dataset: an `alert-analysis` prompt must not be scored against the
 * `workflow-authoring` assertion. `expectedSkill` and `allowSkills` are a union
 * — loading any one of them passes. Examples with no `expectedSkill` are N/A
 * (score `null`), which is the correct shape for prompts whose documented
 * contract is a direct tool call with no skill load.
 */
const VALID_SKILL_NAME = /^[a-zA-Z0-9_-]+$/;

export const createPersonaMatrixSkillInvokedEvaluator = ({
  traceEsClient,
  log,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
}): Evaluator => ({
  name: 'SkillInvoked',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const meta = metadata as { expectedSkill?: string; allowSkills?: string[] } | undefined;
    const acceptedSkills = [meta?.expectedSkill, ...(meta?.allowSkills ?? [])].filter(
      (s): s is string => typeof s === 'string' && s.length > 0
    );

    if (!acceptedSkills.length) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No expectedSkill/allowSkills annotation — skipping SkillInvoked.',
      };
    }

    const invalid = acceptedSkills.filter((s) => !VALID_SKILL_NAME.test(s));
    if (invalid.length) {
      return {
        score: null,
        label: 'error',
        explanation: `Invalid skill name(s): ${invalid.join(', ')}`,
      };
    }

    const traceId = (output as { traceId?: string } | undefined)?.traceId;
    if (!traceId || !isValidTraceId(traceId)) {
      return {
        score: null,
        label: 'unavailable',
        explanation: `No usable traceId for SkillInvoked (traceId: ${traceId ?? 'none'})`,
      };
    }

    const skillPredicate = acceptedSkills
      .flatMap((skillName) => [
        // Current `load_skill` args: {"skill":"<id>"} (some models pass the bare id).
        `attributes.gen_ai.tool.call.arguments LIKE "*\\"${skillName}\\"*"`,
        // Legacy / path-style args: {"skill":"/skills/<category>/<id>/SKILL.md"}.
        `attributes.gen_ai.tool.call.arguments LIKE "*/${skillName}/SKILL.md*"`,
      ])
      .join(' OR ');

    const query = `FROM ${TRACE_INDEX_PATTERN}
| WHERE trace.id == "${traceId}"
| STATS
  total_tool_spans = COUNT(
    CASE(attributes.elastic.inference.span.kind == "TOOL", 1, NULL)
  ),
  skill_invoked = COUNT(
    CASE(
      attributes.gen_ai.tool.name IN ("load_skill", "filestore.read") AND (${skillPredicate}),
      1,
      NULL
    )
  )`;

    try {
      const response = (await traceEsClient.esql.query({ query })) as unknown as {
        columns: Array<{ name: string }>;
        values: unknown[][];
      };
      const row = response.values?.[0];
      const idx = (name: string) => response.columns?.findIndex((c) => c.name === name) ?? -1;
      const toolSpansIdx = idx('total_tool_spans');
      const invokedIdx = idx('skill_invoked');

      if (!row || toolSpansIdx === -1 || invokedIdx === -1) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'Expected columns not found in trace query response',
        };
      }

      // No tool spans at all means the trace is not yet searchable, not that the
      // skill was skipped — scoring 0 here would be a false failure.
      if (!(row[toolSpansIdx] as number | undefined)) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No tool spans found for trace — trace data likely incomplete',
        };
      }

      const invoked = ((row[invokedIdx] as number | undefined) ?? 0) > 0;
      return { score: invoked ? 1 : 0, metadata: { acceptedSkills, invoked } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warning(`SkillInvoked failed for trace ${traceId}: ${message}`);
      return { score: null, label: 'error', explanation: `SkillInvoked query failed: ${message}` };
    }
  },
});

/**
 * Reporting identity for a profile. A non-default agent is a different system
 * under test, so its dataset and experiment suite name carry the profile and a
 * run cannot be mistaken for the default agent's result when archived scores are
 * grouped by dataset or experiment suite. The default profile keeps the
 * established names.
 */
export const reportingIdentity = (
  datasetName: string,
  profile: AgentProfile
): { datasetName: string; suite: string } =>
  profile === 'default'
    ? { datasetName, suite: PERSONA_MATRIX_SUITE_IDS.default }
    : { datasetName: `${datasetName} (${profile})`, suite: PERSONA_MATRIX_SUITE_IDS[profile] };

export function createEvaluatePersonaMatrixDataset({
  chatClient,
  evaluators,
  executorClient,
  traceEsClient,
  log,
  fetch,
  agentProfile = envAgentProfile,
}: {
  chatClient: PersonaMatrixChatClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  traceEsClient: EsClient;
  log: ToolingLog;
  /** Kibana HTTP handler, used by `WorkflowValidity` to create and run authored workflows. */
  fetch: HttpHandler;
  /** Agent the chat client converses with; defaults to the `AGENT_PROFILE` env. */
  agentProfile?: AgentProfile;
}) {
  const identity = (datasetName: string) => reportingIdentity(datasetName, agentProfile);
  return async function evaluateDataset({
    dataset,
  }: {
    dataset: EvaluationDataset<PersonaMatrixExample>;
  }): Promise<void> {
    // Shard before wrapping so a sharded run seeds and grades only its slice.
    // Slow models need hours for all 21 examples on one stack; shards can be
    // fanned out across separate stacks.
    const shardedExamples = withProfileExpectedTools(
      selectShard(dataset.examples, process.env.PERSONA_MATRIX_SHARD),
      agentProfile
    );
    // The ingest keeps per-example metadata and the dataset name but not the
    // experiment metadata, so a non-default profile is stamped on each example
    // too. The default profile is left untouched: example metadata is hashed into
    // the dataset example id, so stamping it would re-add every example of the
    // established dataset and split its score history.
    const wrappedExamples = shardedExamples.map((example) => {
      const wrapped = toDatasetExample(example);
      return agentProfile === 'default'
        ? wrapped
        : { ...wrapped, metadata: { ...wrapped.metadata, agentProfile } };
    });

    if (process.env.PERSONA_MATRIX_SHARD) {
      log.info(
        `[persona-matrix] shard ${process.env.PERSONA_MATRIX_SHARD}: ` +
          `${shardedExamples.length}/${dataset.examples.length} examples`
      );
    }
    const judgeCapOptions = getJudgePayloadCapOptionsFromEnv();

    const skillInvokedEvaluator = createPersonaMatrixSkillInvokedEvaluator({
      traceEsClient,
      log,
    });

    const trajectoryEvaluator = createPersonaMatrixTrajectoryEvaluator();
    const expectedToolCalledEvaluator = createPersonaMatrixExpectedToolCalledEvaluator();
    const finalAnswerPresentEvaluator = createPersonaMatrixFinalAnswerPresentEvaluator();
    const minExpectedStepsEvaluator = createPersonaMatrixMinExpectedStepsEvaluator();
    // Deterministic proof that an authored workflow targets the connector the
    // prompt demanded. ExpectedToolCalled only proves generate_workflow was
    // called, never what it produced -- see connector_invoked_evaluator.ts.
    const connectorInvokedEvaluator = createConnectorInvokedEvaluator();

    // Suite-local trace evaluators: the shared ones query `FROM traces-*`, which
    // a remote tracing cluster's eval key cannot read (see trace_evaluators.ts).
    const traceDeps = { traceEsClient, log };
    const inputTokens = createPersonaMatrixInputTokensEvaluator(traceDeps);
    const outputTokens = createPersonaMatrixOutputTokensEvaluator(traceDeps);
    const toolCalls = createPersonaMatrixToolCallsEvaluator(traceDeps);
    const latency = createPersonaMatrixLatencyEvaluator(traceDeps);

    // The criteria judge runs inside the task on the same judged submission as
    // the correctness/groundedness judges; the registered evaluator only reads
    // the precomputed result back, so it never grades fallback narration.
    const criteriaJudge = evaluators.criteria([
      'Relevance: The response directly addresses the user security question.',
      'Clarity: The response is well-structured and easy to follow.',
      'Accuracy: Security concepts and recommendations are technically correct.',
      'Completeness: The response covers the key aspects of the question.',
    ]);
    const precomputedCriteriaEvaluator: Evaluator = {
      name: criteriaJudge.name,
      kind: criteriaJudge.kind,
      direction: criteriaJudge.direction,
      getModel: criteriaJudge.getModel,
      evaluate: async ({ output }) =>
        (output as { criteriaAnalysis?: EvaluationResult } | undefined)?.criteriaAnalysis ?? {
          score: null,
          label: 'unavailable',
          explanation: 'Criteria judge did not produce a result for this example.',
        },
    };

    // Quantitative correctness/groundedness evaluators are pure functions of
    // the precomputed analyses attached to task output below — no LLM calls
    // at evaluate time. Mirrors `buildAlertsRagEvaluators`.
    const allEvaluators: Evaluator[] = [
      skillInvokedEvaluator,
      trajectoryEvaluator,
      expectedToolCalledEvaluator,
      finalAnswerPresentEvaluator,
      minExpectedStepsEvaluator,
      connectorInvokedEvaluator,
      // Deterministic behaviour checks. Recorded per cell, excluded from cell
      // means via `excludeEvaluators` in the matrix config.
      createWorkflowValidityEvaluator({ fetch, stubVerified: isStubConnectorVerified }),
      createEicarTrapEvaluator(),
      createSimulationAwarenessEvaluator(),
      createUnrequestedSideEffectsEvaluator(),
      createStalledAfterLoadSkillEvaluator(),
      createRubricCapNoToolCallEvaluator(),
      ...createQuantitativeCorrectnessEvaluators(),
      createQuantitativeGroundednessEvaluator(),
      precomputedCriteriaEvaluator,
      inputTokens,
      outputTokens,
      toolCalls,
      latency,
    ];

    await executorClient.runExperiment(
      {
        // Reasoning models (GLM, Qwen-thinking) wedge a single-node Kibana
        // event loop at the default concurrency of 5: `converse` calls time out
        // or fail outright with `fetch failed`, losing whole examples. Allow the
        // runner to dial it back per model instead of hardcoding one value that
        // is either too slow for frontier models or too aggressive for these.
        concurrency: Number(process.env.PERSONA_MATRIX_CONCURRENCY) || undefined,
        datasets: [
          {
            name: identity(dataset.name).datasetName,
            description: dataset.description,
            examples: wrappedExamples,
          },
        ],
        metadata: {
          suite: identity(dataset.name).suite,
          ...(agentProfile === 'default' ? {} : { agent_profile: agentProfile }),
          source: 'persona-matrix-eval',
        },
        task: async (example) => {
          const input = example.input as PersonaMatrixExampleInput;
          const question = input?.question;
          if (!question) throw new Error('Missing question in example input');
          let response: Awaited<ReturnType<PersonaMatrixChatClient['query']>>;
          try {
            response = await chatClient.query(question, input?.attachment);
          } catch (error) {
            // Fail soft: one unreachable agent must not abort the whole suite. The
            // executor has no per-example boundary, so a throw here discards every
            // (example, rep) pair after it. Record the failure as a scored 'error'
            // row instead.
            const message = error instanceof Error ? error.message : String(error);
            log.error(
              `[persona-matrix] converse failed for example "${example.id ?? question}": ${message}`
            );
            return {
              messages: [{ message: `${UNANSWERED_PROMPT_MARKER} converse failed: ${message}` }],
              steps: [],
              errors: [{ type: 'error' as const, error: { message } }],
              traceId: null,
              messageSource: 'response' as const,
              sampling: { connectorId: '', temperature: null, topP: null, seed: null },
              trajectoryFingerprint: '',
              workflowAttachments: [],
              rawResponse: '',
              correctnessAnalysis: undefined,
              groundednessAnalysis: undefined,
              criteriaAnalysis: undefined,
            };
          }

          const taskOutput = {
            messages: response.messages,
            // Which turn the answer came from: 'response' is the model's real
            // closing message, 'last_assistant_step' is chat_client's fallback
            // to an interior reasoning/output step (models that end on a tool
            // call return an empty response.message). Without this tag, mid-run
            // narration is indistinguishable from a final answer once stored.
            messageSource: response.messageSource,
            steps: response.steps,
            errors: response.errors,
            traceId: response.traceId ?? null,
            sampling: response.sampling,
            trajectoryFingerprint: response.trajectoryFingerprint,
            // The rendered workflow's YAML, read back from the conversation:
            // `generate_workflow` results carry only ids, so without this a
            // rendered workflow has no deliverable to judge or score.
            workflowAttachments: response.workflowAttachments,
          };

          // Precompute the qualitative analyses inside the task once, so the
          // deterministic Factuality/Relevance/Sequence Accuracy/Groundedness
          // evaluators registered above are pure functions of the precomputed
          // result and correctnessAnalysis() is invoked exactly once per
          // example (was: once here + once again as a registered evaluator).
          const expected = example.output as PersonaMatrixDatasetExpected;

          // The judges read the last message as the agent's answer. A
          // 'last_assistant_step' message is interior narration, not a closing
          // answer, so grading it would let Factuality/Relevance credit a run
          // that never answered. Judge the same submission FinalAnswerPresent
          // accepts: the delivered artifact's YAML/payload when the run ends
          // on one (hasRenderedArtifact), else an empty answer. The narration
          // stays on the stored output for the trace card. The Criteria judge
          // serializes the whole output, so the submission keeps only the
          // answer and the tool-call steps: the narration step, messageSource
          // and workflowAttachments would otherwise reach it.
          const fallbackAnswer = renderedArtifactPayload(taskOutput) ?? '';
          const judgedOutput: TaskOutput =
            taskOutput.messageSource === 'last_assistant_step'
              ? {
                  steps: (Array.isArray(taskOutput.steps) ? taskOutput.steps : []).filter(
                    (step: unknown) => isRecord(step) && step.type === 'tool_call'
                  ),
                  messages: [
                    {
                      message:
                        typeof fallbackAnswer === 'string'
                          ? fallbackAnswer
                          : JSON.stringify(fallbackAnswer),
                    },
                  ],
                }
              : taskOutput;

          // The judges read a size-capped copy; `taskOutput` itself (the golden transcript) stays
          // verbatim, and anything trimmed is reported on the returned output.
          const { output: judgeOutput, report: judgePayloadTrim } = capJudgePayload(
            judgedOutput,
            judgeCapOptions
          );
          if (judgePayloadTrim.trimmed.length || judgePayloadTrim.overBudget) {
            log.info(
              `[persona-matrix][judge-cap] ${example.id ?? question}: judge payload ${
                judgePayloadTrim.charsBefore
              } -> ${judgePayloadTrim.charsAfter} chars, trimmed ${
                judgePayloadTrim.trimmed.length
              } tool result(s)${
                judgePayloadTrim.overBudget
                  ? ' (STILL OVER BUDGET: non-result fields alone exceed it)'
                  : ''
              }`
            );
          }

          // The judges already retry internally; if they still fail, degrade this
          // example's qualitative scores to "unavailable" (the quantitative
          // evaluators handle a missing analysis) rather than discarding the
          // agent's real trajectory, which the deterministic evaluators can score.
          const [correctnessSettled, groundednessSettled, criteriaSettled] =
            await Promise.allSettled([
              withEvaluatorSpan('CorrectnessAnalysis', {}, () =>
                evaluators.correctnessAnalysis().evaluate({
                  input,
                  expected,
                  output: judgeOutput,
                  metadata: example.metadata,
                })
              ),
              withEvaluatorSpan('GroundednessAnalysis', {}, () =>
                evaluators.groundednessAnalysis().evaluate({
                  input,
                  expected,
                  output: judgeOutput,
                  metadata: example.metadata,
                })
              ),
              withEvaluatorSpan('Criteria', {}, () =>
                criteriaJudge.evaluate({
                  input,
                  expected,
                  output: judgeOutput,
                  metadata: example.metadata,
                })
              ),
            ]);

          for (const [name, settled] of [
            ['CorrectnessAnalysis', correctnessSettled],
            ['GroundednessAnalysis', groundednessSettled],
            ['Criteria', criteriaSettled],
          ] as const) {
            if (settled.status === 'rejected') {
              const reason = settled.reason;
              log.error(
                `[persona-matrix] ${name} failed for example "${example.id ?? question}": ${
                  reason instanceof Error ? reason.message : String(reason)
                }`
              );
            }
          }

          const correctnessResult =
            correctnessSettled.status === 'fulfilled' ? correctnessSettled.value : undefined;
          const groundednessResult =
            groundednessSettled.status === 'fulfilled' ? groundednessSettled.value : undefined;

          return {
            ...(taskOutput as object),
            correctnessAnalysis: correctnessResult?.metadata,
            groundednessAnalysis: groundednessResult?.metadata,
            criteriaAnalysis:
              criteriaSettled.status === 'fulfilled' ? criteriaSettled.value : undefined,
            ...(judgePayloadTrim.trimmed.length || judgePayloadTrim.overBudget
              ? { judgePayloadTrim }
              : {}),
            // Added after the judge payload is built so no judge ever reads it.
            rawResponse: response.rawResponse,
          } as TaskOutput;
        },
      },
      allEvaluators
    );

    log.info('[persona-matrix] dataset evaluation complete');
  };
}
