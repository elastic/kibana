/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { NO_TOOL_CALL_RUBRIC_CAP } from './rubric_cap_no_tool_call_evaluator';

export const PERSONA_RUBRIC_MIN_SCORE = 1;
export const PERSONA_RUBRIC_MAX_SCORE = 10;

const MAX_CATEGORY_CHARS = 100;
const MAX_TOOLS_ROW_CHARS = 4000;
const MAX_EXPECTED_TOOLS_CHARS = 4000;
const MAX_QUESTION_CHARS = 20_000;
const MAX_ATTACHMENT_CHARS = 20_000;
const MAX_WORKFLOW_ATTACHMENTS = 5;
const MAX_WORKFLOW_YAML_CHARS = 20_000;
const TRUNCATION_MARKER = '…[truncated]';

/** The workflow YAML read back from the conversation (`chat_client`'s WorkflowAttachmentYaml). */
export interface WorkflowAttachmentInput {
  id: string;
  version: number;
  yaml: string;
}

/** Hard bound on the submission text; the shared judge payload cap normally trims well before this. */
export const PERSONA_RUBRIC_MAX_SUBMISSION_CHARS = 400_000;

const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - TRUNCATION_MARKER.length)}${TRUNCATION_MARKER}` : text;

/** Facts every persona prompt is built around; the judge grades accuracy against them. */
export const PERSONA_RUBRIC_GROUND_TRUTH = [
  'Affected host: `srv-win-defend-01` (Windows).',
  'Core technique: `BluetoothService.exe` side-loads a malicious `log.dll` from a non-standard path, so a legitimate-looking binary loads an attacker DLL.',
  'MITRE ATT&CK: DLL side-loading, T1574.002 (sub-technique of Hijack Execution Flow). Naming the ID is best; describing DLL side-loading or search-order hijacking correctly is acceptable without it.',
  'File SHA-256 named in the prompts: `275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f`. The prompts call it the Chrysalis loader, but the seeded threat intel identifies it as the EICAR anti-malware test file (`eicar.com`, VirusTotal 65/76 malicious, label `virus.eicar/test`). The best hash verdict reports that lookup result and names it as the EICAR test file. Reporting exactly what the lookup tool returned (including no match) is also acceptable. Inventing a malware family, detection count or verdict the trace does not show, or asserting a verdict without ever looking the hash up, is wrong.',
  'Expected hunt artifacts: `BluetoothService.exe` execution, suspicious `log.dll` loads, and C2 network or DNS activity.',
  'Disposition: grade the hash verdict and the side-loading scenario separately. The side-loading behaviour on the host (the alerts and hunt artifacts above) is a true positive; "benign" or "safe to ignore" for that behaviour is incorrect. Recognising that the hash itself is only the EICAR test file is correct and must not be penalised. Steps the prompt explicitly asks for (opening a case, creating a channel, notifying on-call), including steps conditional on a true positive, should still be carried out or attempted; side-effecting actions the prompt did not ask for are a flaw.',
].join('\n');

const WORKFLOW_CONNECTOR_NOTE =
  'An authored workflow must contain an `http` step on the existing Slack connector with id `d7306385-cbe6-4541-9726-49afdff59ba5`, calling `POST /chat.postMessage`.';

/**
 * The category rows below name tools by their reference ids. The suite seeds
 * differently named tools for some of them; this maps one to the other so a
 * correct call is not penalised for its name.
 */
export const PERSONA_RUBRIC_TOOL_ALIASES = [
  'Tool id aliases (reference id → tool id seeded in this suite): `vt.hash.lookup` → `virustotal_lookup`; `check.on.call.schedule` → `on_call_lookup`; `create.case` → `platform.core.cases.manage`; `platform.workflows.workflow_set_yaml` → `platform.core.generate_workflow`.',
  'There is no seeded suite tool for `create.channel`; the Slack channel step is scored through the reference, so do not penalise the absence of a channel-creation tool call.',
  'When the example lists its own expected tools, those take precedence over the category row.',
].join(' ');

interface ToolsRow {
  tools: string;
  redFlags: string;
}

/** What the right tool selection looks like per example category. */
export const PERSONA_RUBRIC_TOOLS_BY_CATEGORY: Readonly<Record<string, ToolsRow>> = {
  'alert-analysis': {
    tools:
      '`security.alerts` and `security.alert-analysis.get-related-alerts`; a threat-intel tool (`vt.hash.lookup` and/or `security.security_labs_search`); `platform.core.search` for supporting context.',
    redFlags: 'A disposition with no alert or intel tool calls; prose only with an empty trace.',
  },
  'entity-analytics': {
    tools: '`security.get_entity` and `security.search_entities` (the purpose-built entity tools).',
    redFlags:
      'Using only generic `platform.core.search` and never the entity tools; invented risk scores.',
  },
  'threat-hunting': {
    tools:
      '`platform.core.generate_esql` followed by `platform.core.execute_esql` (or `platform.core.search`) against process, file and network telemetry.',
    redFlags: 'Claiming hunt findings with no query execution in the trace.',
  },
  'detection-rule-edit': {
    tools:
      '`security.create_detection_rule`, plus `security.security_labs_search` when the prompt asks to ground the rule in Security Labs research.',
    redFlags:
      'Writing the rule in prose only and never invoking the rule-creation tool; ignoring ES|QL when it was explicitly requested.',
  },
  'workflow-authoring': {
    tools: `The \`platform.workflows.*\` authoring tools (\`workflow_set_yaml\`, \`validate_workflow\`, \`get_step_definitions\`, \`get_examples\`, \`get_trigger_definitions\`). ${WORKFLOW_CONNECTOR_NOTE}`,
    redFlags:
      'Hand-writing YAML without the workflow tools and the YAML fails validation or execution; the wrong Slack connector id or path.',
  },
  'workflow-execution': {
    tools:
      'The specific backed tool the prompt demands: `vt.hash.lookup` (hash verdict), `check.on.call.schedule` (on-call owner) or `create.case` (open a case).',
    redFlags: 'Fabricating the hash verdict, on-call owner or case instead of calling the tool.',
  },
  'multi-step': {
    tools:
      'The ordered chain the prompt dictates, for example `vt.hash.lookup`, then `check.on.call.schedule`, then `create.case` or `create.channel`, with findings carried forward between steps.',
    redFlags:
      'Skipping a required step; wrong order; never creating the requested channel or case; losing findings between steps.',
  },
};

/** The row for a known category; undefined for a missing or unknown one. */
export const resolvePersonaToolsRow = (category: string | undefined): ToolsRow | undefined =>
  category && Object.hasOwn(PERSONA_RUBRIC_TOOLS_BY_CATEGORY, category)
    ? PERSONA_RUBRIC_TOOLS_BY_CATEGORY[category]
    : undefined;

/** The category-specific block the prompt interpolates; undefined when the category has no row. */
export const formatPersonaToolsRow = (category: string | undefined): string | undefined => {
  const row = resolvePersonaToolsRow(category);
  return row ? `Appropriate tools: ${row.tools}\nRed flags: ${row.redFlags}` : undefined;
};

export const PERSONA_RUBRIC_ANCHORS = [
  '1-2 Broken or wrong: errored, refused, hallucinated the core facts, wrong disposition, or used no or entirely wrong tools.',
  '3-4 Weak: partly on track but with major correctness or tool-selection failures; misses the central technique or fabricates a key result.',
  '5-6 Adequate: gets the gist and uses at least some correct tools, but is shallow, partly inaccurate, or sloppy in tool use or order.',
  '7-8 Strong: correct disposition and findings, right tools used appropriately, accurate on the ground truth, actionable. Minor gaps only.',
  '9-10 Excellent: correct, thorough and well reasoned; exactly the right tools in a sensible order with no fabrication; precise and immediately actionable. Reserve 10 for near-flawless work.',
].join('\n');

const SYSTEM_TEMPLATE = [
  'You are a rigorous, skeptical evaluator of language models used inside a Security Operations Center agent.',
  'You have deep expertise in threat detection, incident response, threat hunting, detection engineering and workflow automation.',
  'You reward correctness, sound judgment and using the right capability for the job.',
  'You do not reward verbosity, confident wording or invented facts. Judge only what the submission shows.',
  'Respond by invoking the grade tool.',
].join(' ');

const USER_TEMPLATE = `Score the submission below on an integer scale from ${PERSONA_RUBRIC_MIN_SCORE} to ${PERSONA_RUBRIC_MAX_SCORE}.

Weigh both:
(a) Answer quality: correctness against the ground truth, soundness of the disposition, depth and actionability.
(b) Tool selection: did the agent call and use the right tools, in a reasonable order, without irrelevant calls or fabricated tool results?

A claim in the answer that the tool calls do not support is unsubstantiated; treat it as likely hallucinated and penalise it. A plausible answer produced without the supporting tool calls the task requires cannot score above ${NO_TOOL_CALL_RUBRIC_CAP}. A confident wrong answer scores lower than a hedged correct one.

[BEGIN ground truth]
${PERSONA_RUBRIC_GROUND_TRUTH}
[END ground truth]

[BEGIN task category]
{{{category}}}
{{{toolsRow}}}
${PERSONA_RUBRIC_TOOL_ALIASES}
[END task category]

[BEGIN expected tools for this prompt]
{{{expectedTools}}}
[END expected tools for this prompt]

[BEGIN scoring anchors]
${PERSONA_RUBRIC_ANCHORS}
[END scoring anchors]

[BEGIN prompt given to the agent]
{{{question}}}
{{{attachment}}}
[END prompt given to the agent]

[BEGIN submission]
{{{submission}}}
[END submission]`;

export const PersonaRubricPrompt = createPrompt({
  name: 'persona_matrix_rubric_judge',
  description: 'Judge a persona-matrix answer and its tool use on a 1-10 rubric',
  input: lazySchema(() =>
    z.object({
      category: z.string().max(MAX_CATEGORY_CHARS),
      toolsRow: z.string().max(MAX_TOOLS_ROW_CHARS),
      expectedTools: z.string().max(MAX_EXPECTED_TOOLS_CHARS),
      question: z.string().max(MAX_QUESTION_CHARS),
      attachment: z.string().max(MAX_ATTACHMENT_CHARS + 100),
      submission: z.string().max(PERSONA_RUBRIC_MAX_SUBMISSION_CHARS),
    })
  ),
})
  .version({
    system: { mustache: { template: SYSTEM_TEMPLATE } },
    template: { mustache: { template: USER_TEMPLATE } },
    toolChoice: { function: 'grade' },
    tools: {
      grade: {
        description: `Return an integer score from ${PERSONA_RUBRIC_MIN_SCORE} to ${PERSONA_RUBRIC_MAX_SCORE} and a short justification.`,
        schema: {
          type: 'object',
          properties: {
            score: {
              type: 'number',
              description: `Integer from ${PERSONA_RUBRIC_MIN_SCORE} to ${PERSONA_RUBRIC_MAX_SCORE}.`,
            },
            explanation: { type: 'string' },
          },
          required: ['score', 'explanation'],
        },
      },
    },
  } as const)
  .get();

interface PersonaRubricToolCall {
  tool_id: string;
  params: Record<string, unknown>;
  results?: unknown;
}

/** The shortest a fitted text can get: itself when shorter than the marker, else the marker. */
const floorChars = (texts: ReadonlyArray<string | undefined>): number =>
  texts.reduce((sum, text) => sum + Math.min(text?.length ?? 0, TRUNCATION_MARKER.length), 0);

/**
 * Shares the budget across texts so one huge text cannot crowd out the others:
 * short texts keep their full length and pass their unused share on. Every text
 * keeps at least its floor, so the result stays within `budget` whenever the
 * budget covers `floorChars(texts)`.
 */
const fitTexts = (
  texts: ReadonlyArray<string | undefined>,
  budget: number
): Array<string | undefined> => {
  const fitted = [...texts];
  const order = texts
    .map((text, index) => ({ index, length: text?.length ?? 0 }))
    .filter(({ index }) => texts[index] !== undefined)
    .sort((a, b) => a.length - b.length);
  let remaining = Math.max(0, budget - floorChars(texts));
  order.forEach(({ index, length }, position) => {
    const floor = Math.min(length, TRUNCATION_MARKER.length);
    const allowance = Math.floor(remaining / (order.length - position)) + floor;
    const text: string = texts[index] ?? '';
    fitted[index] =
      length <= allowance
        ? text
        : allowance > floor
        ? truncate(text, allowance)
        : TRUNCATION_MARKER;
    remaining -= (fitted[index]?.length ?? 0) - floor;
  });
  return fitted;
};

/**
 * Every call keeps its tool id. Params are paid for before results, so they stay
 * whole whenever they fit `budget`; results are shortened first.
 */
const formatTrace = (toolCalls: readonly PersonaRubricToolCall[], budget: number): string => {
  if (!toolCalls.length) return '(no tool calls)';
  const labels = toolCalls.map(
    ({ tool_id: toolId }, index) => `${index + 1}. ${toolId}\n   params: `
  );
  const params = toolCalls.map(({ params: raw }) => JSON.stringify(raw) ?? '{}');
  const results = toolCalls.map(({ results: raw }) =>
    raw === undefined ? undefined : typeof raw === 'string' ? raw : JSON.stringify(raw)
  );
  const resultPrefix = '\n   result: ';
  const fixedChars =
    labels.reduce((sum, label) => sum + label.length + 1, 0) +
    results.filter((text) => text !== undefined).length * resultPrefix.length;
  // A cut result still prints its marker, so that floor is reserved before params are paid.
  const fittedParams = fitTexts(params, budget - fixedChars - floorChars(results));
  const paramsChars = fittedParams.reduce((sum, text) => sum + (text?.length ?? 0), 0);
  const fittedResults = fitTexts(results, budget - fixedChars - paramsChars);
  return labels
    .map((label, index) => {
      const head = `${label}${fittedParams[index]}`;
      const result = fittedResults[index];
      return result === undefined ? head : `${head}${resultPrefix}${result}`;
    })
    .join('\n');
};

const formatWorkflowAttachments = (
  workflowAttachments: readonly WorkflowAttachmentInput[] | undefined
): string =>
  workflowAttachments?.length
    ? `\n\nWorkflow YAML stored on the conversation's attachments after the run:\n${workflowAttachments
        .slice(0, MAX_WORKFLOW_ATTACHMENTS)
        .map(
          ({ id, version, yaml }) =>
            `--- attachment ${id} (version ${version}) ---\n${truncate(
              yaml,
              MAX_WORKFLOW_YAML_CHARS
            )}`
        )
        .join('\n')}`
    : '';

/** Input for the rubric prompt: the answer and ordered tool calls the judge sees. */
export const buildPersonaRubricInput = ({
  category,
  expectedTools,
  question,
  attachment,
  answer,
  toolCalls,
  workflowAttachments,
}: {
  category: string;
  expectedTools?: readonly string[];
  question?: string;
  attachment?: string;
  answer: string;
  toolCalls: readonly PersonaRubricToolCall[];
  workflowAttachments?: readonly WorkflowAttachmentInput[];
}): {
  category: string;
  toolsRow: string;
  expectedTools: string;
  question: string;
  attachment: string;
  submission: string;
} => {
  // The answer is what gets graded, then the delivered workflow: the trace gets what is left.
  const answerSection = `\n\nFinal answer:\n${truncate(
    answer || '(empty)',
    PERSONA_RUBRIC_MAX_SUBMISSION_CHARS / 2
  )}`;
  const workflowSection = formatWorkflowAttachments(workflowAttachments);
  const traceHeader = 'Tool calls, in order:\n';
  const traceBudget =
    PERSONA_RUBRIC_MAX_SUBMISSION_CHARS -
    answerSection.length -
    workflowSection.length -
    traceHeader.length;
  const trace = formatTrace(toolCalls, traceBudget);
  const toolsRow = formatPersonaToolsRow(category);
  if (!toolsRow) {
    throw new Error(`No persona rubric tools row for category "${category}"`);
  }
  return {
    category,
    toolsRow,
    expectedTools: expectedTools?.length
      ? truncate(expectedTools.map((tool) => `\`${tool}\``).join(', '), MAX_EXPECTED_TOOLS_CHARS)
      : '(none listed; use the category row)',
    question: truncate(question || '(not provided)', MAX_QUESTION_CHARS),
    attachment: attachment
      ? `Attachment supplied with the prompt:\n${truncate(attachment, MAX_ATTACHMENT_CHARS)}`
      : '',
    // The outer truncate only bites when the call heads alone overrun the budget.
    submission: `${truncate(
      `${traceHeader}${trace}`,
      PERSONA_RUBRIC_MAX_SUBMISSION_CHARS - answerSection.length - workflowSection.length
    )}${workflowSection}${answerSection}`,
  };
};
