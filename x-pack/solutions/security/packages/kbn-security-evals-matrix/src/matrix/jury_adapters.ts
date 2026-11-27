/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per-suite jury adapters for judge replay.
 *
 * Replaying a suite with another suite's jury exits 0 but measures the wrong
 * thing: a prose-comparison judge grading structured Attack Discovery output
 * looks like model quality and is really an instrument mismatch.
 *
 * A jury adapter answers two questions per suite:
 *   1. which evaluator names the suite's judged column consists of, and
 *   2. how a stored golden cell is reshaped into the args those evaluators read.
 *
 * The second half matters as much as the first. Golden records a cell as
 * `task.output`, but each suite's evaluators read a different slice of it:
 * persona-matrix wants the message transcript, Attack Discovery wants
 * `insights`. Passing the persona shape to an AD evaluator yields a null score,
 * which aggregates into a silently empty column rather than a loud failure.
 */

import type { ReplayCell } from './replay_plan';
import type { RejudgeScore } from './run_rejudge';

/** A judged cell reshaped into the argument object a suite's evaluators expect. */
export interface JuryArgs {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  expected: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface JuryAdapter {
  /** Adapter id, reported in logs so a replay names the jury it used. */
  name: string;
  /**
   * Golden `metadata.suite_id` values this jury serves. Matching on the suite
   * id recorded in the score document -- rather than on the dataset path -- is
   * deliberate: the dataset file is a CLI argument that can point anywhere,
   * while the suite id is what the published matrix column is keyed by.
   */
  suiteIds: string[];
  /**
   * Evaluator names this jury recomputes, i.e. the judged evaluators of the
   * suite's column. Used to verify a replay refreshed the column it claims to.
   */
  evaluatorNames: string[];
  /** Reshape a stored cell into evaluator args, or null when unreplayable. */
  toArgs: (cell: ReplayCell) => JuryArgs | null;
  /**
   * Criteria-judge invocations this jury needs, when its evaluators are all
   * built on the shared criteria judge.
   *
   * Suites whose evaluators live in a private, solutions-side package cannot be
   * imported by this platform package. Where those evaluators are thin wrappers
   * over `createCriteriaEvaluator`, the jury restates the same criteria and args
   * so the replay runs the identical judge rather than importing across the
   * boundary or, worse, substituting a different rubric.
   */
  criteriaFor?: (args: JuryArgs) => Array<{
    name: string;
    criteria: string[];
    args: JuryArgs;
  }>;
}

/**
 * Artifact-producing tools and the key under which each result carries the
 * artifact payload. Mirrors `ARTIFACT_PRODUCING_TOOLS` in the persona-matrix
 * suite; `null` means the payload is the delivered workflow YAML (recovered
 * from workflow attachments / generate results), not a result field.
 */
const ARTIFACT_PRODUCING_TOOLS: ReadonlyMap<string, string | null> = new Map([
  ['security.create_detection_rule', 'rule'],
  ['security.update_detection_rule', 'rule'],
  ['platform.core.generate_workflow', null],
]);

// The skill prose calls the tool `attachment_update`; the registered id is
// `attachments.update`.
const ATTACHMENT_UPDATE_TOOLS: ReadonlySet<string> = new Set([
  'attachments.update',
  'attachment_update',
]);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isRenderTagFor = (text: string, attachmentId: string): boolean =>
  text.includes('<render_attachment') &&
  new RegExp(`<render_attachment[^>]*\\bid\\s*=\\s*["']?${escapeRegExp(attachmentId)}\\b`).test(
    text
  );

const messageTextsOf = (output: Record<string, unknown>): string[] =>
  (Array.isArray(output.messages) ? (output.messages as unknown[]) : [])
    .map((entry) => (isRecord(entry) ? entry.message : undefined))
    .filter((message): message is string => typeof message === 'string');

const toolCallStepsOf = (output: Record<string, unknown>): Array<Record<string, unknown>> =>
  (Array.isArray(output.steps) ? (output.steps as unknown[]) : []).filter(
    (step): step is Record<string, unknown> => isRecord(step) && step.type === 'tool_call'
  );

/**
 * The workflow YAML the run actually delivered, for generate_workflow runs.
 * Mirrors `collectDeliveredArtifact` in the persona-matrix suite: exactly one
 * artifact, the first of the rendered attachment, the last attachment, the
 * last generated `data.yaml`, the last `validate_workflow` `params.yaml`.
 */
const deliveredWorkflowYaml = (output: Record<string, unknown>): string | undefined => {
  const texts = messageTextsOf(output);
  const attachments = (
    Array.isArray(output.workflowAttachments) ? (output.workflowAttachments as unknown[]) : []
  ).filter((a): a is { id?: unknown; yaml: string } => isRecord(a) && typeof a.yaml === 'string');
  const rendered = attachments.filter(
    ({ id }) => typeof id === 'string' && texts.some((text) => isRenderTagFor(text, id))
  );
  const candidates = rendered.length > 0 ? rendered : attachments;
  if (candidates.length > 0) {
    return candidates[candidates.length - 1].yaml;
  }

  let generated: string | undefined;
  let validated: string | undefined;
  toolCallStepsOf(output).forEach((step) => {
    if (step.tool_id === 'platform.core.generate_workflow' && Array.isArray(step.results)) {
      step.results.forEach((result) => {
        const data = isRecord(result) ? result.data : undefined;
        if (isRecord(data) && typeof data.yaml === 'string') {
          generated = data.yaml;
        }
      });
    }
    if (
      step.tool_id === 'platform.workflows.validate_workflow' &&
      isRecord(step.params) &&
      typeof step.params.yaml === 'string'
    ) {
      validated = step.params.yaml;
    }
  });
  return generated ?? validated;
};

/** The version the last render tag for `attachmentId` pinned; undefined = latest. */
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
 * Mirrors `renderedArtifactPayload` from the persona-matrix suite
 * (evaluate_dataset.ts), which cannot be imported from this platform package.
 *
 * A fallback run the live suite judges on its rendered artifact -- an
 * artifact-producing tool result with `success: true`, an `attachment_id`, and
 * a matching `<render_attachment>` tag in a message -- must be replayed with
 * that same payload (the rule object at the rendered version, or the workflow
 * YAML) instead of an empty answer, or the rejudge grades a different
 * submission than the live run did.
 */
const renderedArtifactPayload = (output: Record<string, unknown>): unknown => {
  const texts = messageTextsOf(output);
  const steps = toolCallStepsOf(output);
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
    return deliveredWorkflowYaml(output);
  }

  const versions = attachmentVersionHistory(rendered, steps, last.attachmentId);
  const pinned = renderedVersionFor(texts, last.attachmentId);
  const visible = versions.filter(({ version }) => pinned === undefined || version <= pinned);
  return (visible[visible.length - 1] ?? versions[0]).payload;
};

/**
 * persona-matrix: prose answers graded by the correctness/groundedness pair.
 *
 * `steps` are forwarded because the groundedness judge checks each claim
 * against the tool-call history; replaying with only the final message makes
 * every specific claim unverifiable.
 */
export const personaMatrixJury: JuryAdapter = {
  name: 'persona-matrix',
  suiteIds: ['security-persona-matrix'],
  evaluatorNames: ['Factuality', 'Relevance', 'Groundedness', 'Sequence Accuracy'],
  toArgs: (cell) => {
    // Both a final message and a prose reference are required: the correctness
    // judge grades one against the other, and replaying with either missing
    // manufactures a MAJOR_INACCURACIES verdict from absent data rather than
    // from a weak answer.
    //
    // A `last_assistant_step` cell is interior narration, not a closing
    // answer; the live run judges the rendered artifact's payload when the
    // run ends on one and an empty answer otherwise (evaluate_dataset.ts), so
    // the replay must grade the same submission rather than restore credit
    // for the narration.
    const taskOutput = isRecord(cell.taskOutput) ? cell.taskOutput : undefined;
    const isFallback = taskOutput?.messageSource === 'last_assistant_step';
    let agentResponse = cell.agentResponse;
    if (isFallback) {
      const payload = taskOutput ? renderedArtifactPayload(taskOutput) : undefined;
      agentResponse =
        payload === undefined
          ? ''
          : typeof payload === 'string'
          ? payload
          : JSON.stringify(payload);
    }
    if (!cell.expected || (!agentResponse && !isFallback)) {
      return null;
    }
    return {
      input: { question: cell.question },
      output: {
        messages: [{ message: agentResponse }],
        // The live run hands its judges only the tool-call steps of a fallback
        // run, so the narration step is not part of the submission.
        steps: isFallback ? toolCallStepsOf({ steps: cell.steps }) : cell.steps,
      },
      expected: { expected: cell.expected },
      metadata: {},
    };
  },
};

/**
 * Attack Discovery: `Criteria` and `Rubric` are the LLM-judged evaluators, and
 * both read the structured discoveries under `output.insights`, not the message
 * transcript.
 *
 * A cell whose insights are absent or empty is NOT replayable. Both evaluators
 * short-circuit to a null score when their reference or submission is empty, so
 * replaying such a cell would overwrite a real score with N/A -- the emptiness
 * would then read as a model that discovered nothing, when in fact the
 * trajectory was never captured.
 */
export const attackDiscoveryJury: JuryAdapter = {
  name: 'attack-discovery',
  suiteIds: ['attack-discovery-agent-builder', 'attack-discovery'],
  evaluatorNames: ['Criteria', 'Rubric'],
  toArgs: (cell) => {
    const output = isRecord(cell.taskOutput) ? cell.taskOutput : undefined;
    const insights = output?.insights;
    if (!Array.isArray(insights) || insights.length === 0) {
      return null;
    }
    // Ground truth drives both evaluators: Criteria needs `criteria[]` and
    // Rubric needs `attackDiscoveries`. With neither, both short-circuit to a
    // null score, and replaying would overwrite a real verdict with N/A.
    const expected = isRecord(cell.expectedStructured) ? cell.expectedStructured : undefined;
    const criteria = expected?.criteria;
    const discoveries = expected?.attackDiscoveries;
    const hasCriteria = Array.isArray(criteria) && criteria.length > 0;
    const hasDiscoveries = Array.isArray(discoveries) && discoveries.length > 0;
    if (!expected || (!hasCriteria && !hasDiscoveries)) {
      return null;
    }
    return {
      input: { question: cell.question },
      output: { insights, errors: Array.isArray(output?.errors) ? output.errors : [] },
      // AD ground truth is structured (criteria[] + attackDiscoveries); the
      // reference adapter renders a prose form for the correctness judge, but
      // these evaluators need the original objects.
      expected,
      metadata: {},
    };
  },
  /**
   * Mirrors the suite's Criteria and Rubric evaluators.
   *
   * Both serialise the graded artefact to JSON and hand it to the shared
   * criteria judge -- Criteria against the annotated `criteria[]`, Rubric
   * against the 7 requirements compared with the reference discoveries.
   *
   * The fallback Rubric reproduces the suite's evaluator
   * (`attack_discovery_rubric_evaluator.ts`) exactly: ONE criterion listing the
   * 7 items and ending "pass if at least 5 of the 7 ... Y or N". A rejudge must
   * measure the same thing as the published column it refreshes; per-item
   * partial credit would make the rejudged Rubric column incomparable with the
   * original. The collapsed form saturates (95.6% of cells at 1.0), but fixing
   * that is a suite change, after which the suite should export
   * `ATTACK_DISCOVERY_RUBRIC_ITEMS` and `metadata.rubricCriteria` carries it.
   */
  criteriaFor: (args) => {
    const specs: Array<{ name: string; criteria: string[]; args: JuryArgs }> = [];
    const expected = args.expected as {
      criteria?: unknown;
      attackDiscoveries?: unknown;
    };
    const insights = (args.output.insights as unknown[]) ?? [];
    const errors = (args.output.errors as unknown[]) ?? [];

    const serializedOutput = JSON.stringify({ insights, errors }, null, 2);

    const criteria = Array.isArray(expected?.criteria) ? (expected.criteria as string[]) : [];
    if (criteria.length > 0) {
      specs.push({
        name: 'Criteria',
        criteria,
        args: {
          input: args.input,
          expected: { expected: serializedOutput },
          output: { messages: [{ message: serializedOutput }], steps: [], errors },
          metadata: args.metadata,
        },
      });
    }

    const referenceInsights = Array.isArray(expected?.attackDiscoveries)
      ? (expected.attackDiscoveries as Array<Record<string, unknown>>)
      : [];
    if (referenceInsights.length > 0) {
      const toRubricShape = (list: Array<Record<string, unknown>>) =>
        list.map((insight) => ({
          title: insight.title ?? '',
          summaryMarkdown: insight.summaryMarkdown ?? '',
          detailsMarkdown: insight.detailsMarkdown ?? '',
          entitySummaryMarkdown: insight.entitySummaryMarkdown ?? '',
          mitreAttackTactics: insight.mitreAttackTactics ?? [],
          alertIds: insight.alertIds ?? [],
        }));

      const reference = JSON.stringify(
        { attackDiscoveries: toRubricShape(referenceInsights) },
        null,
        2
      );
      const submission = JSON.stringify(
        { attackDiscoveries: toRubricShape(insights as Array<Record<string, unknown>>) },
        null,
        2
      );

      // `metadata.rubricCriteria` is supplied when the CLI can load an
      // `ATTACK_DISCOVERY_RUBRIC_ITEMS` export from the suite, in which case the
      // suite owns the criterion shape. The suite does not export it today, so
      // the fallback below -- a copy of the suite's collapsed criterion -- is
      // what runs.
      const injected = (args.metadata as { rubricCriteria?: unknown } | undefined)?.rubricCriteria;
      if (Array.isArray(injected) && injected.length > 0) {
        specs.push({
          name: 'Rubric',
          criteria: (injected as string[]).map((item) => `${item} Reference: ${reference}`),
          args: {
            input: args.input,
            expected: { expected: reference },
            output: { messages: [{ message: submission }], steps: [], errors },
            metadata: args.metadata,
          },
        });
        return specs;
      }

      const rubric = [
        'Evaluate the submission against the reference using these 7 rubric items:',
        '1. Is the submission non-empty and well-formed JSON with an array of attackDiscoveries?',
        '2. Do the detailsMarkdown values capture the overall essence of the reference, allowing slight differences in wording but not omitting or misrepresenting key incidents?',
        '3. Does the submission mention at least half of the same entities (host or user) as the reference?',
        '4. Are the summaryMarkdown values at least partially similar and summarizing the same incidents?',
        '5. Are the title values at least partially similar and mentioning the same incidents?',
        '6. Do more than half of the alertIds in the submission overlap with the alertIds in the reference?',
        '7. Are the MITRE tactics consistent with the reference?',
        `Reference: ${reference}`,
        'Score the submission as passing if at least 5 of the 7 rubric items are correct. Explain your reasoning briefly and end with a single character: Y or N.',
      ].join('\n');

      specs.push({
        name: 'Rubric',
        criteria: [rubric],
        args: {
          input: args.input,
          expected: { expected: reference },
          output: { messages: [{ message: submission }], steps: [], errors },
          metadata: args.metadata,
        },
      });
    }

    return specs;
  },
};

export const JURY_ADAPTERS: JuryAdapter[] = [personaMatrixJury, attackDiscoveryJury];

/**
 * Resolve the jury for a suite.
 *
 * Returns undefined for an unregistered suite rather than falling back to the
 * persona jury. That fallback is exactly what produced a plausible-looking but
 * meaningless Attack Discovery replay, so an unknown suite must fail loudly at
 * the CLI boundary instead of being silently mis-scored.
 */
export function selectJury(suiteId: string | undefined): JuryAdapter | undefined {
  if (!suiteId) {
    return undefined;
  }
  // The dataset-derived adapter name ('persona-matrix') is accepted too, so a
  // rejudge without --suite resolves the same jury as the explicit suite id.
  return JURY_ADAPTERS.find((jury) => jury.suiteIds.includes(suiteId) || jury.name === suiteId);
}

/**
 * Check that a replay refreshed the evaluators the suite's column is built from.
 *
 * A replay whose verdicts all fall outside the jury's evaluator set has
 * measured something other than the column it claims to update -- the exact
 * failure that made an exit-0 Attack Discovery rejudge unusable.
 */
export function checkJuryCoverage(
  jury: JuryAdapter,
  scores: RejudgeScore[]
): { ok: boolean; unexpected: string[]; missing: string[] } {
  // A named evaluator carrying no score has not graded anything: the judge
  // answered but its verdict could not be parsed into a number. Counting the
  // name alone as coverage would let an ungraded column read as refreshed.
  const produced = new Set(scores.filter((s) => s.score !== null).map((s) => s.name));
  const expected = new Set(jury.evaluatorNames);
  return {
    ok: [...produced].some((name) => expected.has(name)),
    unexpected: [...produced].filter((name) => !expected.has(name)),
    missing: [...expected].filter((name) => !produced.has(name)),
  };
}
