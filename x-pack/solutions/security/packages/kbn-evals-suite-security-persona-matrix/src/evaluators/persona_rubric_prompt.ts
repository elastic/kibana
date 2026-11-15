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
const MAX_SUBMISSION_CHARS = 2_000_000;

/** Facts every persona prompt is built around; the judge grades accuracy against them. */
export const PERSONA_RUBRIC_GROUND_TRUTH = [
  'Affected host: `srv-win-defend-01` (Windows).',
  'Core technique: `BluetoothService.exe` side-loads a malicious `log.dll` from a non-standard path, so a legitimate-looking binary loads an attacker DLL.',
  'MITRE ATT&CK: DLL side-loading, T1574.002 (sub-technique of Hijack Execution Flow). Naming the ID is best; describing DLL side-loading or search-order hijacking correctly is acceptable without it.',
  'Loader SHA-256: `275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f`. It is a known-malicious loader. A correct verdict is "malicious", ideally with a non-trivial detection count and a family name. Reporting it as clean, benign or not found, or asserting a verdict without ever looking the hash up, is wrong.',
  'Expected hunt artifacts: `BluetoothService.exe` execution, suspicious `log.dll` loads, and C2 network or DNS activity.',
  'Disposition: this is a true positive and a real threat. "Benign" or "safe to ignore" is incorrect for alert analysis and multi-step prompts; the correct behaviour is to escalate and continue.',
].join('\n');

const WORKFLOW_CONNECTOR_NOTE =
  'An authored workflow must contain an `http` step on the existing Slack connector with id `d7306385-cbe6-4541-9726-49afdff59ba5`, calling `POST /chat.postMessage`. Defer to the workflow validation result in the submission when present; it is objective.';

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

const GENERIC_TOOLS_ROW: ToolsRow = {
  tools:
    'Whatever capabilities the task needs: the tool should be one the prompt asks for or one that produces the evidence the answer relies on.',
  redFlags: 'Claims in prose that no tool call in the trace supports.',
};

export const resolvePersonaToolsRow = (category: string | undefined): ToolsRow =>
  (category && PERSONA_RUBRIC_TOOLS_BY_CATEGORY[category]) || GENERIC_TOOLS_ROW;

/** The category-specific block the prompt interpolates. */
export const formatPersonaToolsRow = (category: string | undefined): string => {
  const { tools, redFlags } = resolvePersonaToolsRow(category);
  return `Appropriate tools: ${tools}\nRed flags: ${redFlags}`;
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
[END task category]

[BEGIN scoring anchors]
${PERSONA_RUBRIC_ANCHORS}
[END scoring anchors]

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
      submission: z.string().max(MAX_SUBMISSION_CHARS),
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

/** Input for the rubric prompt: the answer and ordered tool calls the judge sees. */
export const buildPersonaRubricInput = ({
  category,
  answer,
  toolCalls,
}: {
  category: string | undefined;
  answer: string;
  toolCalls: Array<{ tool_id: string; params: Record<string, unknown>; results?: unknown }>;
}): { category: string; toolsRow: string; submission: string } => {
  const trace = toolCalls.length
    ? toolCalls
        .map(({ tool_id: toolId, params, results }, index) =>
          [
            `${index + 1}. ${toolId}`,
            `   params: ${JSON.stringify(params)}`,
            ...(results === undefined
              ? []
              : [`   result: ${typeof results === 'string' ? results : JSON.stringify(results)}`]),
          ].join('\n')
        )
        .join('\n')
    : '(no tool calls)';
  return {
    category: category ?? 'unspecified',
    toolsRow: formatPersonaToolsRow(category),
    submission: `Tool calls, in order:\n${trace}\n\nFinal answer:\n${answer || '(empty)'}`,
  };
};
